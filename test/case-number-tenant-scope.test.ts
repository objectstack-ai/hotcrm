// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { applySystemFields } from '@objectstack/objectql';
import { expectedIndexes } from '@objectstack/driver-sql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import stack from './helpers/composed-stack';

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
 * Since platform 18.1.0 the second defect is closed one layer down: the driver
 * creates the tenant column `NOT NULL` (objectstack#24940), so a row with no
 * organization is refused before it reaches any index, and the per-organization
 * index keys the plain column (objectstack#24893) — the COALESCE key part had
 * nothing left to bucket. The first defect still stands, so the field-level
 * spelling is still the one required here.
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

describe('the physical index set is tenant-scoped', () => {
  const indexes = expectedIndexes({
    table: 'crm_case',
    fields: orgScoped.fields as Record<string, unknown>,
    tenantField: 'organization_id',
    declaredIndexes: (orgScoped.indexes ?? []) as AnyRec[],
    physicalColumns,
  });

  it('expects exactly one unique index, on (organization_id, case_number)', () => {
    // Matched exactly rather than with `objectContaining`, so a NULL-safe key
    // part coming back (or any other change to the shape) is a visible change.
    // There is none on 18.1.0: the tenant column is `NOT NULL`, see the
    // untenanted case in the SQLite block below.
    const unique = indexes.filter((i) => i.unique);
    expect(unique).toEqual([
      {
        name: 'uniq_crm_case_organization_id_case_number',
        columns: ['organization_id', 'case_number'],
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

  it('materialized the per-organization unique index over a NOT NULL tenant column', async () => {
    const rows = (await driver
      .getKnex()
      .raw("select name, sql from sqlite_master where tbl_name = 'crm_case'")) as Array<{
      name: string;
      sql: string | null;
    }>;
    const uniq = rows.find((r) => r.name === 'uniq_crm_case_organization_id_case_number');
    expect(uniq, 'the per-organization unique index is missing entirely').toBeTruthy();
    expect(uniq!.sql).toMatch(/\(`organization_id`, `case_number`\)/);
    expect(rows.map((r) => r.name)).not.toContain('uniq_crm_case_case_number');
    // The column, not the index, is what keeps an untenanted row out now.
    const table = rows.find((r) => r.name === 'crm_case');
    expect(table!.sql).toMatch(/`organization_id` varchar\(255\) not null/);
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
    // A plain column index since 18.1.0, so SQLite names the columns.
    await expect(
      driver.create('crm_case', row('CASE-00002'), { tenantId: 'org_a' } as never),
    ).rejects.toThrow(/UNIQUE constraint failed: crm_case\.organization_id, crm_case\.case_number/);
  });

  it('stores no UNTENANTED case at all, so no duplicate can escape the index', async () => {
    // The acceptance criterion of #1023, and the one the old table composite
    // failed. Up to 18.0.0 a single-organization deployment left
    // `organization_id` NULL on every row; since 18.1.0 the database refuses
    // such a row outright, the first one already.
    await expect(driver.create('crm_case', row('CASE-00003'), {} as never)).rejects.toThrow(
      /NOT NULL constraint failed: crm_case\.organization_id/,
    );
  });
});

// ────────────────────────────────────────────── reverse verification ──

describe('the OLD table-composite spelling, re-measured', () => {
  /**
   * Reverse verification, kept in the repo rather than done by hand once: put
   * the deleted spelling back and measure what it materializes. Up to 18.0.0
   * the untenanted duplicate flipped REJECTED → ACCEPTED here, because SQL
   * UNIQUE treats two NULL `organization_id`s as distinct. Since 18.1.0 the
   * NOT NULL tenant column refuses the untenanted row under this spelling too,
   * so the last case below pins that the column closed the hole; the first
   * defect (an unstated scope) is still why the spelling is gone.
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

  it('no longer stores an untenanted case: the NOT NULL column closed the hole (18.1.0)', async () => {
    await expect(driver.create('crm_case', row('CASE-00011'), {} as never)).rejects.toThrow(
      /NOT NULL constraint failed: crm_case\.organization_id/,
    );
  });
});
