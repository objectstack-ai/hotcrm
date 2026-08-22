// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { applySystemFields } from '@objectstack/objectql';
import { expectedIndexes } from '@objectstack/driver-sql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import stack from '../objectstack.config';

/**
 * Case-number uniqueness is PER ORGANIZATION *and* holds on an install that has
 * no organization at all (#1023). Sibling of `account-name-tenant-scope.test.ts`
 * (#625) — same trap, caught one release later and from the other direction.
 *
 * `crm_case` used to spell the constraint as a hand-written table composite,
 * `indexes: [{ fields: ['organization_id', 'case_number'], unique: true }]`.
 * That spelling has TWO defects, and the second is the one that bites:
 *
 *   1. Its scope is unstated. A declared index is materialized VERBATIM over
 *      exactly its `fields`, so bare `unique: true` means installation-wide
 *      (ADR-0120). Listing `organization_id` yourself READS as "unique per
 *      organization" while materializing as a plain unscoped composite —
 *      the spelling 17.x warns on and protocol 18 rejects (#5082).
 *   2. SQL UNIQUE is NULL-distinct. `organization_id` is kernel-injected and is
 *      NULL on every row of a single-organization or untenanted install, and
 *      NULLs never collide — so the index enforced NOTHING there (#5030).
 *
 * Field-level `unique: true` gets both right: since framework #3696 it is
 * per-organization, and since platform 17.0.0-rc.4 (ADR-0120 D3) its
 * organization key part is NULL-safe — `COALESCE(organization_id, '__global__')`
 * — so NULL-organization rows form one bucket instead of each escaping.
 *
 * Why this matters more here than on any other object: `case_number` is an
 * autonumber (`CASE-{00000}`) and the platform's autonumber sequence is keyed
 * PER TENANT, so every organization counts from 1. The sequence was already
 * scoped per organization while the constraint was not enforced at all on the
 * untenanted rows — duplicate case numbers were prevented only by the accident
 * that a single-organization install runs a single sequence, never by the
 * database.
 *
 * As in the `crm_account` sibling, the acceptance criteria are exercised against
 * a REAL SQLite database driven by the REAL `crm_case` metadata: a declaration
 * is not a constraint until the driver turns it into DDL, and this whole defect
 * lived in the gap between the two. The metadata assertions name WHICH spelling
 * is required so a future edit that reverts to the table form fails with the
 * reason rather than a bare SQL error, and the last block re-measures the OLD
 * spelling so the claim "the old one enforced nothing" stays a measurement
 * rather than a story in a comment.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const kase = objects.find((o) => o.name === 'crm_case') as AnyRec;

/** What the runtime actually hands the driver on a multi-org stack. */
const orgScoped = applySystemFields(kase as any, { multiTenant: true }) as AnyRec;

/** Columns that get materialized — formula fields never do (`fieldHasColumn`). */
const physicalColumns = new Set<string>([
  'id',
  ...Object.entries(orgScoped.fields as Record<string, AnyRec>)
    .filter(([, f]) => (f?.type ?? 'string') !== 'formula')
    .map(([name]) => name),
]);

/**
 * `crm_case` declares four notNull columns; a row that omits any of them is
 * rejected before it ever reaches the unique index. Writing them explicitly
 * keeps every rejection below attributable to the constraint under test.
 */
const row = (caseNumber: string) => ({
  subject: `Case ${caseNumber}`,
  description: 'Raised by the tenant-scope test.',
  status: 'new',
  priority: 'medium',
  case_number: caseNumber,
});

// ───────────────────────────────────── the shape the rule is declared in ──

describe('crm_case declares case-number uniqueness on the FIELD', () => {
  it('carries field-level `unique: true` on case_number', () => {
    expect(kase.fields.case_number.unique).toBe(true);
  });

  it('declares NO unique index in indexes[]', () => {
    // framework#3991 `unique/double-declaration`: declaring both makes the
    // verbatim index win and leaves the per-organization one unreachable, so
    // the field-level declaration above would silently do nothing — and the
    // NULL-safe key part this whole file exists for would be gone with it.
    const uniqueIndexes = ((kase.indexes ?? []) as AnyRec[]).filter((i) => i.unique);
    expect(
      uniqueIndexes,
      'a declared unique index on crm_case re-imposes the un-scoped, NULL-distinct composite #1023 removed',
    ).toEqual([]);
  });

  it('matches how crm_account / crm_contact / crm_product spell the same intent', () => {
    const account = objects.find((o) => o.name === 'crm_account') as AnyRec;
    const contact = objects.find((o) => o.name === 'crm_contact') as AnyRec;
    const product = objects.find((o) => o.name === 'crm_product') as AnyRec;
    expect(account.fields.name.unique).toBe(true);
    expect(contact.fields.email.unique).toBe(true);
    expect(product.fields.sku.unique).toBe(true);
  });
});

// ─────────────────────────────── the index the driver derives from it ──

describe('the physical index set is tenant-scoped and NULL-safe', () => {
  const indexes = expectedIndexes({
    table: 'crm_case',
    fields: orgScoped.fields as Record<string, unknown>,
    tenantField: 'organization_id',
    declaredIndexes: (orgScoped.indexes ?? []) as AnyRec[],
    physicalColumns,
  });

  it('expects exactly one unique index, NULL-safe on (organization_id, case_number)', () => {
    // `nullSafeColumns` is named here rather than loosened away with
    // `objectContaining` because it is the entire difference between an index
    // that constrains an untenanted install and one that does not — see the
    // untenanted case in the SQLite block below.
    const unique = indexes.filter((i) => i.unique);
    expect(unique).toEqual([
      {
        name: 'uniq_crm_case_organization_id_case_number',
        columns: ['organization_id', 'case_number'],
        nullSafeColumns: ['organization_id'],
        unique: true,
      },
    ]);
  });

  it('expects no platform-wide uniq_crm_case_case_number', () => {
    // The collision framework #3696 exists to prevent: the autonumber sequence
    // is per tenant, so a single-column global unique would reject the SECOND
    // organization's CASE-00001 the moment it was issued.
    expect(indexes.map((i) => i.name)).not.toContain('uniq_crm_case_case_number');
  });
});

// ───────────────────────────────── the constraint a real database enforces ──

describe('case numbers collide per organization, never across (real SQLite)', () => {
  let driver: SqliteWasmDriver;

  beforeAll(async () => {
    driver = new SqliteWasmDriver({ filename: ':memory:' });
    await driver.connect();
    // The exact call the runtime makes at boot: name + fields + declared
    // indexes. This is what turns the metadata above into DDL.
    await driver.initObjects([
      {
        name: 'crm_case',
        fields: orgScoped.fields as Record<string, unknown>,
        indexes: orgScoped.indexes,
      } as never,
    ]);
  }, 60_000);

  afterAll(async () => {
    await driver?.disconnect();
  });

  it('materialized the NULL-safe per-organization unique index', async () => {
    const rows = (await driver
      .getKnex()
      .raw("select name, sql from sqlite_master where type = 'index' and tbl_name = 'crm_case'")) as Array<{
      name: string;
      sql: string | null;
    }>;
    const uniq = rows.find((r) => r.name === 'uniq_crm_case_organization_id_case_number');
    expect(uniq, 'the per-organization unique index is missing entirely').toBeTruthy();
    // The COALESCE key part IS the fix — asserting only the index name would
    // pass just as well against the un-scoped composite this replaced.
    expect(uniq!.sql).toMatch(/COALESCE\(`organization_id`, '__global__'\)/);
    expect(rows.map((r) => r.name)).not.toContain('uniq_crm_case_case_number');
  });

  it('accepts the same case number in two different organizations', async () => {
    // Each organization's autonumber sequence counts from 1, so this is the
    // ordinary case, not an edge case: both orgs issue CASE-00001 on day one.
    const first = await driver.create('crm_case', row('CASE-00001'), { tenantId: 'org_a' } as never);
    const second = await driver.create('crm_case', row('CASE-00001'), { tenantId: 'org_b' } as never);
    expect(first?.id).toBeTruthy();
    expect(second?.id).toBeTruthy();
    expect(second.id).not.toBe(first.id);
    expect(second.organization_id).toBe('org_b');
  });

  it('rejects a duplicate case number WITHIN one organization', async () => {
    await driver.create('crm_case', row('CASE-00002'), { tenantId: 'org_a' } as never);
    // SQLite names the INDEX rather than the columns when the violated index is
    // an expression index, which from platform 17.0.0-rc.4 this one is.
    await expect(
      driver.create('crm_case', row('CASE-00002'), { tenantId: 'org_a' } as never),
    ).rejects.toThrow(/UNIQUE constraint failed: index 'uniq_crm_case_organization_id_case_number'/);
  });

  it('rejects a duplicate case number on an UNTENANTED install too', async () => {
    // The acceptance criterion of #1023, and the one the old table composite
    // failed — see the reverse-verification block below, which re-measures it.
    // A single-organization deployment leaves `organization_id` NULL on every
    // row, so this is not an exotic configuration: it is the default one.
    await driver.create('crm_case', row('CASE-00003'), {} as never);
    await expect(driver.create('crm_case', row('CASE-00003'), {} as never)).rejects.toThrow(
      /UNIQUE constraint failed: index 'uniq_crm_case_organization_id_case_number'/,
    );
  });
});

// ────────────────────────────────────────────── reverse verification ──

describe('the OLD table-composite spelling constrained nothing untenanted', () => {
  /**
   * Reverse verification, kept in the repo rather than done by hand once: put
   * the deleted spelling back and measure that the hole reopens. Predicted
   * direction, decided before running it — the untenanted duplicate flips
   * REJECTED → ACCEPTED, because SQL UNIQUE treats the two NULL
   * `organization_id`s as distinct. This is the assertion that would go red if
   * someone "simplified" the field-level declaration back into `indexes[]`,
   * and it is the reason the fix is not a cosmetic re-spelling.
   */
  const legacy = JSON.parse(JSON.stringify(kase)) as AnyRec;
  delete legacy.fields.case_number.unique;
  (legacy.indexes as AnyRec[]).unshift({ fields: ['organization_id', 'case_number'], unique: true });
  const legacyScoped = applySystemFields(legacy as any, { multiTenant: true }) as AnyRec;

  let driver: SqliteWasmDriver;

  beforeAll(async () => {
    driver = new SqliteWasmDriver({ filename: ':memory:' });
    await driver.connect();
    await driver.initObjects([
      {
        name: 'crm_case',
        fields: legacyScoped.fields as Record<string, unknown>,
        indexes: legacyScoped.indexes,
      } as never,
    ]);
  }, 60_000);

  afterAll(async () => {
    await driver?.disconnect();
  });

  it('materializes a plain composite with no COALESCE key part', async () => {
    const rows = (await driver
      .getKnex()
      .raw("select name, sql from sqlite_master where type = 'index' and tbl_name = 'crm_case'")) as Array<{
      name: string;
      sql: string | null;
    }>;
    const uniq = rows.find((r) => r.name === 'uniq_crm_case_organization_id_case_number');
    expect(uniq?.sql).toBeTruthy();
    expect(uniq!.sql).not.toMatch(/COALESCE/);
  });

  it('still rejects a duplicate within one organization — which is what hid the hole', () => {
    // Named so the next reader does not conclude the old index was inert. On a
    // multi-organization install it worked, which is exactly why the defect
    // survived review: the case it failed is the case nobody tested.
    return expect(
      (async () => {
        await driver.create('crm_case', row('CASE-00010'), { tenantId: 'org_a' } as never);
        await driver.create('crm_case', row('CASE-00010'), { tenantId: 'org_a' } as never);
      })(),
    ).rejects.toThrow(/UNIQUE constraint failed/);
  });

  it('ACCEPTS a duplicate untenanted case number — the defect, reproduced', async () => {
    const first = await driver.create('crm_case', row('CASE-00011'), {} as never);
    const second = await driver.create('crm_case', row('CASE-00011'), {} as never);
    expect(first?.id).toBeTruthy();
    expect(second?.id).toBeTruthy();
    expect(second.id).not.toBe(first.id);
    expect(second.organization_id ?? null).toBeNull();
  });
});
