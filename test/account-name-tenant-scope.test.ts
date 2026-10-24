// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { applySystemFields } from '@objectstack/objectql';
import { expectedIndexes } from '@objectstack/driver-sql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import stack from './helpers/composed-stack';

/**
 * Account-name uniqueness is PER ORGANIZATION, not platform-wide (#625).
 *
 * `crm_account` used to spell the constraint as a table-level declared index,
 * `indexes: [{ fields: ['name'], unique: true }]`. `driver-sql` keeps a
 * declared index's columns verbatim — only FIELD-level `unique: true` gets the
 * tenant composite `(organization_id, ...)` (framework#3696). So the physical
 * index was `UNIQUE (name)` and the SECOND organization to create an account
 * called "Acme Corp" was rejected by the database. Account name is also the
 * seed data's external-id key, so it bit the first multi-tenant
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

  it('expects two unique indexes — (organization_id, account_number) and (organization_id, name)', () => {
    // Matched exactly, not loosened with `objectContaining`. From platform
    // 17.0.0-rc.4 (ADR-0120 D3) through 18.0.0 each entry also carried
    // `nullSafeColumns: ['organization_id']`, the COALESCE key part that made
    // the index bite on an untenanted install. 18.1.0 keys the plain column
    // (objectstack#24893), because the tenant column is `NOT NULL` now
    // (objectstack#24940) and no untenanted row exists to bucket — see the
    // untenanted case in the SQLite block below.
    //
    // `account_number` joined the set on the 17.2.0 -> 17.3.0 upgrade and is NOT
    // an authoring change here: platform 17.3.0 makes an `autonumber` field
    // parse to `unique: 'organization'` when it omits `unique` (spec #13894),
    // materialized by the drivers exactly as a hand-written declaration is. The
    // ruling that flipped the default is hotcrm#1301, and the defect behind it
    // was measured on THIS object — objectstack#12394 re-issued `ACC-000009`.
    // Nine of this app's ten autonumber identifiers gain the index; only
    // `crm_case.case_number` already carried it, hand-written.
    const unique = indexes.filter((i) => i.unique);
    expect(unique).toEqual([
      {
        name: 'uniq_crm_account_organization_id_account_number',
        columns: ['organization_id', 'account_number'],
        unique: true,
      },
      {
        name: 'uniq_crm_account_organization_id_name',
        columns: ['organization_id', 'name'],
        unique: true,
      },
    ]);
  });

  it('expects no platform-wide uniq_crm_account_name', () => {
    expect(indexes.map((i) => i.name)).not.toContain('uniq_crm_account_name');
  });

  it('still indexes name — the seed\'s natural key and $search read it', () => {
    // `searchableFields: ['name', ...]` promises a real indexed column, and
    // `src/sales/data/sales.seed.ts` keys accounts on `externalId: 'name'` (a
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
    // From platform 17.0.0-rc.4 through 18.0.0 the index was an expression index,
    // `UNIQUE (COALESCE(organization_id, '__global__'), name)`, and SQLite named
    // the INDEX in the message. 18.1.0 keys the plain column again, so the
    // message names the columns, as it did through rc.3. The constraint is
    // unchanged for a tenanted row — only its wording is.
    await expect(
      driver.create('crm_account', { name: 'Globex' }, { tenantId: 'org_a' }),
    ).rejects.toThrow(/UNIQUE constraint failed: crm_account\.organization_id, crm_account\.name/);
  });

  it('stores no UNTENANTED account at all, so no duplicate name can escape (18.1.0)', async () => {
    // A row written with no tenant used to leave `organization_id` NULL, and
    // SQL UNIQUE treats NULLs as distinct — so through platform 17.0.0-rc.3 the
    // composite index enforced NOTHING on a single-tenant or untenanted install
    // and the duplicate name #625 set out to prevent went straight in (measured:
    // rc.3 accepted the second insert, rc.4's COALESCE key part refused it).
    // Since 18.1.0 the tenant column is `NOT NULL` (objectstack#24940), so the
    // database refuses the untenanted row itself, the first one already.
    await expect(
      driver.create('crm_account', { name: 'Untenanted Inc' }, {} as never),
    ).rejects.toThrow(/NOT NULL constraint failed: crm_account\.organization_id/);
  });
});
