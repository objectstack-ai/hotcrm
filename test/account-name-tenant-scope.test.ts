// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { applySystemFields } from '@objectstack/objectql';
import { expectedIndexes } from '@objectstack/driver-sql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import stack from '../objectstack.config';

/**
 * Account-name uniqueness is PER ORGANIZATION, not platform-wide (#625).
 *
 * `crm_account` used to spell the constraint as a table-level declared index,
 * `indexes: [{ fields: ['name'], unique: true }]`. `driver-sql` keeps a
 * declared index's columns verbatim — only FIELD-level `unique: true` gets the
 * tenant composite `(organization_id, ...)` (framework#3696). So the physical
 * index was `UNIQUE (name)` and the SECOND organization to create an account
 * called "Acme Corp" was rejected by the database. Account name is also the
 * seed data's external-id / upsert key, so it bit the first multi-tenant
 * install. `crm_contact.email`, `crm_lead.email` and `crm_product.sku` already
 * carry the field-level spelling and document the trap; `crm_account` did not.
 *
 * The two acceptance criteria are exercised against a REAL SQLite database
 * driven by the REAL `crm_account` metadata, not against the metadata alone: a
 * declaration is not a constraint until the driver turns it into DDL, and the
 * whole defect was a mismatch between the two. The metadata assertions below
 * exist to name WHICH spelling is required, so a future edit that reverts to
 * the table form fails with the reason rather than a bare SQL error.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const account = objects.find((o) => o.name === 'crm_account') as AnyRec;

/** What the runtime actually hands the driver on a multi-org stack. */
const orgScoped = applySystemFields(account as any, { multiTenant: true }) as AnyRec;

/** Columns that get materialized — formula fields never do (`fieldHasColumn`). */
const physicalColumns = new Set<string>([
  'id',
  ...Object.entries(orgScoped.fields as Record<string, AnyRec>)
    .filter(([, f]) => (f?.type ?? 'string') !== 'formula')
    .map(([name]) => name),
]);

// ───────────────────────────────────── the shape the rule is declared in ──

describe('crm_account declares name uniqueness on the FIELD', () => {
  it('carries field-level `unique: true` on name', () => {
    expect(account.fields.name.unique).toBe(true);
  });

  it('declares NO single-column unique index on name', () => {
    // framework#3991 `unique/double-declaration`: declaring both makes the
    // platform-wide index win and leaves the per-tenant composite unreachable,
    // so the field-level declaration above would silently do nothing.
    const uniqueIndexes = ((account.indexes ?? []) as AnyRec[]).filter((i) => i.unique === true);
    expect(
      uniqueIndexes,
      'a declared unique index on crm_account re-imposes the platform-wide constraint #625 removed',
    ).toEqual([]);
  });

  it('matches how crm_contact / crm_product spell the same intent', () => {
    const contact = objects.find((o) => o.name === 'crm_contact') as AnyRec;
    const product = objects.find((o) => o.name === 'crm_product') as AnyRec;
    expect(contact.fields.email.unique).toBe(true);
    expect(product.fields.sku.unique).toBe(true);
  });
});

// ─────────────────────────────── the index the driver derives from it ──

describe('the physical index set is tenant-scoped', () => {
  const indexes = expectedIndexes({
    table: 'crm_account',
    fields: orgScoped.fields as Record<string, unknown>,
    tenantField: 'organization_id',
    declaredIndexes: (orgScoped.indexes ?? []) as AnyRec[],
    physicalColumns,
  });

  it('expects exactly one unique index, on (organization_id, name)', () => {
    // `nullSafeColumns` arrived with platform 17.0.0-rc.4 (ADR-0120 D3): the
    // tenant column's key part is the NULL-safe COALESCE form rather than the
    // bare column. It is named here, not loosened away with `objectContaining`,
    // because it is the difference between an index that enforces this
    // constraint on an untenanted install and one that does not — see the
    // null-safe case in the SQLite block below.
    const unique = indexes.filter((i) => i.unique);
    expect(unique).toEqual([
      {
        name: 'uniq_crm_account_organization_id_name',
        columns: ['organization_id', 'name'],
        nullSafeColumns: ['organization_id'],
        unique: true,
      },
    ]);
  });

  it('expects no platform-wide uniq_crm_account_name', () => {
    expect(indexes.map((i) => i.name)).not.toContain('uniq_crm_account_name');
  });

  it('still indexes name — the seed upsert key and $search read it', () => {
    // `searchableFields: ['name', ...]` promises a real indexed column, and
    // `src/data/sales.seed.ts` upserts accounts on `externalId: 'name'` (a
    // per-organization lookup). The tenant composite leads with
    // organization_id, so `WHERE organization_id = ? AND name = ?` is a prefix
    // match and no separate `{ fields: ['name'] }` entry is needed.
    const covering = indexes.filter((i) => i.columns.includes('name'));
    expect(covering.length).toBeGreaterThan(0);
  });
});

// ───────────────────────────────── the constraint a real database enforces ──

describe('two organizations can each have an "Acme Corp" (real SQLite)', () => {
  let driver: SqliteWasmDriver;

  beforeAll(async () => {
    driver = new SqliteWasmDriver({ filename: ':memory:' });
    await driver.connect();
    // The exact call the runtime makes at boot: name + fields + declared
    // indexes. This is what turns the metadata above into DDL.
    await driver.initObjects([
      {
        name: 'crm_account',
        fields: orgScoped.fields as Record<string, unknown>,
        indexes: orgScoped.indexes,
      } as never,
    ]);
  }, 60_000);

  afterAll(async () => {
    await driver?.disconnect();
  });

  it('materialized the per-tenant unique index and nothing platform-wide', async () => {
    const rows = (await driver
      .getKnex()
      .raw("select name from sqlite_master where type = 'index' and tbl_name = 'crm_account'")) as Array<{
      name: string;
    }>;
    const names = rows.map((r) => r.name);
    expect(names).toContain('uniq_crm_account_organization_id_name');
    expect(names).not.toContain('uniq_crm_account_name');
  });

  it('accepts the same account name in two different organizations', async () => {
    const first = await driver.create('crm_account', { name: 'Acme Corp' }, { tenantId: 'org_a' });
    const second = await driver.create('crm_account', { name: 'Acme Corp' }, { tenantId: 'org_b' });
    expect(first?.id).toBeTruthy();
    expect(second?.id).toBeTruthy();
    expect(second.id).not.toBe(first.id);
    expect(second.organization_id).toBe('org_b');
  });

  it('still rejects a duplicate account name WITHIN one organization', async () => {
    await driver.create('crm_account', { name: 'Globex' }, { tenantId: 'org_a' });
    // SQLite names the INDEX rather than the columns when the violated index is
    // an expression index, and from platform 17.0.0-rc.4 this one is:
    // `UNIQUE (COALESCE(organization_id, '__global__'), name)` (ADR-0120 D3).
    // Through rc.3 the same index was `UNIQUE (organization_id, name)` over bare
    // columns and the message read
    // `UNIQUE constraint failed: crm_account.organization_id, crm_account.name`.
    // The constraint is unchanged for a tenanted row — only its wording is.
    await expect(
      driver.create('crm_account', { name: 'Globex' }, { tenantId: 'org_a' }),
    ).rejects.toThrow(/UNIQUE constraint failed: index 'uniq_crm_account_organization_id_name'/);
  });

  it('rejects a duplicate account name on an UNTENANTED install too (rc.4)', async () => {
    // What the COALESCE key part above actually buys, and the reason the two
    // assertions in this block were re-taken rather than re-spelled. A row
    // written with no tenant leaves `organization_id` NULL, and SQL UNIQUE
    // treats NULLs as distinct — so through platform 17.0.0-rc.3 the composite
    // index enforced NOTHING on a single-tenant or untenanted install and the
    // duplicate name #625 set out to prevent went straight in. MEASURED on both
    // releases against this same metadata: rc.3 ACCEPTED the second insert,
    // rc.4 rejects it, because both rows now key on '__global__'.
    await driver.create('crm_account', { name: 'Untenanted Inc' }, {} as never);
    await expect(
      driver.create('crm_account', { name: 'Untenanted Inc' }, {} as never),
    ).rejects.toThrow(/UNIQUE constraint failed: index 'uniq_crm_account_organization_id_name'/);
  });
});
