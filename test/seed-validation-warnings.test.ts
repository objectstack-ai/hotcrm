// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateValidationRules } from '@objectstack/objectql';
import stack from '../objectstack.config';
import { CrmSeedData } from '../src/data/index';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Which seed rows trip a `severity: 'warning'` validation — pinned as a VALUE.
 *
 * # Why this file exists
 *
 * A clean `pnpm dev` boot logs, twice:
 *
 *     WARN Validation rule 'related_to_required' (warning): At least one
 *          related record should be selected
 *
 * The obvious reading — "a seed row forgot its parent, go fix it" — is wrong,
 * and this file is here so nobody has to re-derive that. The warning comes from
 * exactly ONE seeded row, `crm_task` / 'Update CRM pipeline report', which is
 * unparented **on purpose**: it is the internal-housekeeping task, it models a
 * to-do that hangs off no customer record, and the comment beside it in
 * `src/data/service.seed.ts` has said so since it was written. The rule is
 * declared `severity: 'warning'` on both `crm_task` and `crm_event` precisely
 * so a row like that is allowed to exist and still be remarked on.
 *
 * So the honest boot state is "one deliberate warning", not "zero warnings",
 * and the useful guard is not *absence* of warnings — it is that the set of
 * warning-producing rows is exactly the set somebody chose. A test asserting
 * "no seed row warns" would have to be satisfied by parenting that row, which
 * deletes the thing it demonstrates. A test asserting "nothing threw" would
 * pass identically before and after any regression here. Hence: the exact set,
 * by object, rule and record key.
 *
 * # What a failure here means
 *
 * - **An entry appeared.** A new seed row trips a warning rule. That is the
 *   defect the boot log was always trying to report — an accidentally
 *   unparented activity row. Parent it (`related_to_type` AND the matching
 *   `related_to_*` lookup — both halves, see the note at the top of the task
 *   seeds), or, if it is deliberate like the row below, add it here WITH the
 *   reasoning in the seed file.
 * - **An entry vanished.** Either the row was parented — check that was
 *   intended and not a drive-by "fix the log noise" — or the rule stopped
 *   firing, which usually means its predicate broke rather than the data
 *   improved. A CEL predicate that aborts is SKIPPED (or, from 17.0.0-rc.2,
 *   rejects the write); either way it stops producing the warning it used to.
 *   `test/object-validation-predicates.test.ts` is the guard for that hazard
 *   and carries the measurement.
 *
 * # What this measures, and what it does NOT
 *
 * Each rule is evaluated in isolation — lifted onto a copy of its object
 * carrying only that one rule — by the engine's own `evaluateValidationRules`,
 * against the AUTHORED seed record. Isolation matters: an `error`-severity rule
 * on the same object throws, and a throw would mask every warning that has not
 * been reached yet, making the pin depend on rule ORDER.
 *
 * ⚠️ This reads the seed as authored, which is not quite the seed as stored,
 * and there are two distinct gaps.
 *
 * **1. Unresolved CEL is not a value, and evaluating it lies.** Seeded dates
 * are authored as CEL (`close_date: cel`daysFromNow(30)``) and resolved by the
 * loader at BOOT — deliberately, so a published artifact does not ship a
 * calendar frozen at build time. Handed the unresolved envelope instead of a
 * timestamp, a date predicate still returns a verdict, and the verdict is
 * junk: measured here, `crm_opportunity.close_date_future` "fired" for TEN
 * seeded opportunities whose close dates are all in the future, while a real
 * clean-DB boot logged that rule ZERO times. So any (rule, record) pair whose
 * predicate reads a field holding an unresolved CEL envelope is SKIPPED below
 * — the authored record cannot answer that question and pretending otherwise
 * would pin ten fictions. Those rules are measured where they can be: on the
 * running server.
 *
 * **2. Lookups are natural keys.** `related_to_account: 'Acme Corporation'` is
 * resolved to an id at boot; a key resolving to NOTHING is stored null, and
 * the row would trip the rule at runtime while reading as parented here. That
 * gap is closed from the other side by `test/metadata-references.test.ts`
 * (a seeded lookup names a row that exists).
 *
 * Neither gap touches `related_to_required`: it reads only the five
 * `related_to_*` lookups, which are plain strings or absent in every seed row,
 * never CEL. The sweep below asserts that it really was evaluated for every
 * `crm_task` / `crm_event` row rather than skipped, so this pin cannot go
 * vacuously green.
 *
 * Measured on the running server at the time of writing, this file and the
 * boot agree: a clean-DB boot produced exactly two `related_to_required` log
 * lines, both accounted for by the single row below (one for the seed insert,
 * one for `demo_bootstrap`'s claim sweep re-writing the same row to stamp
 * `owner_id`), and a SQL sweep of the seeded database for rows with all five
 * `related_to_*` columns empty returned exactly that one row.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const datasets = CrmSeedData as unknown as Array<{ object: string; records: AnyRec[] }>;

/** The record's own natural key, for a readable pin. */
const keyOf = (rec: AnyRec): string =>
  String(rec.subject ?? rec.name ?? rec.title ?? rec.email ?? JSON.stringify(rec).slice(0, 60));

/** `P` compiles a predicate to `{ dialect: 'cel', source }`. */
const celSource = (condition: unknown): string =>
  typeof condition === 'string'
    ? condition
    : String((condition as AnyRec)?.source ?? '');

/** Is this seeded value an UNRESOLVED CEL envelope rather than a value? */
const isCelEnvelope = (v: unknown): boolean =>
  !!v && typeof v === 'object' && (v as AnyRec).dialect === 'cel';

/** Every field name a predicate reads. */
const fieldsRead = (rule: AnyRec): string[] => [
  ...new Set([...celSource(rule.condition).matchAll(/record\.(\w+)/g)].map((m) => m[1])),
];

type Sweep = { fired: string[]; skipped: string[] };

/**
 * Every `(object, rule, record)` triple where a warning-severity rule fires,
 * plus the pairs that could not honestly be measured (gap 1 above).
 *
 * `mode: 'insert'` with an empty `previous` is the shape a seed write actually
 * has, and the mode in which the engine fills absent fields with null.
 */
function sweep(): Sweep {
  const fired: string[] = [];
  const skipped: string[] = [];
  for (const ds of datasets) {
    const obj = objects.find((o) => o.name === ds.object);
    if (!obj) continue;
    const warnRules = ((obj.validations ?? []) as AnyRec[]).filter(
      (v) => v.severity === 'warning' && v.type === 'script',
    );
    for (const rule of warnRules) {
      const reads = fieldsRead(rule);
      // One rule at a time — see "isolation matters" above.
      const solo = { ...obj, validations: [rule] };
      for (const rec of ds.records) {
        const label = `${ds.object}.${rule.name} :: ${keyOf(rec)}`;
        // Unresolved CEL in a field this predicate reads ⇒ NOT MEASURABLE here.
        if (reads.some((f) => isCelEnvelope(rec[f]))) {
          skipped.push(label);
          continue;
        }
        const warns: string[] = [];
        const logger = { warn: (...a: unknown[]) => void warns.push(a.map(String).join(' ')) };
        try {
          evaluateValidationRules(solo as never, rec, 'insert', { previous: {}, logger } as never);
        } catch {
          // A warning-severity rule does not throw; an unexpected throw is
          // caught so one bad row cannot hide the rest of the sweep.
        }
        for (const w of warns) {
          // `failed to evaluate` is a predicate that ABORTED, not a rule that
          // fired — a different defect, owned by object-validation-predicates.
          if (/failed to evaluate/.test(w)) continue;
          fired.push(label);
        }
      }
    }
  }
  return { fired: fired.sort(), skipped: skipped.sort() };
}

/**
 * The full expected set. Every entry is a deliberate choice with a reason
 * recorded in the seed file — adding one here without that reasoning is how
 * this pin stops meaning anything.
 */
const EXPECTED_WARNING_ROWS = [
  // Internal housekeeping task, deliberately unparented — the rule is a
  // warning, not an error, exactly so this row can exist. See
  // `src/data/service.seed.ts`.
  'crm_task.related_to_required :: Update CRM pipeline report',
];

describe('seed rows that trip a warning-severity validation', () => {
  it('is exactly the pinned set', () => {
    expect(sweep().fired).toEqual(EXPECTED_WARNING_ROWS);
  });

  it('related_to_required was actually evaluated for every activity seed row', () => {
    // The anti-vacuity guard. The CEL skip above is a real hole, and a pin that
    // silently fell into it would read green while measuring nothing. These two
    // objects are the ones this file is about, so their coverage is asserted
    // rather than assumed: no row of either may be skipped.
    const { skipped } = sweep();
    const activity = skipped.filter(
      (s) => s.startsWith('crm_task.related_to_required') || s.startsWith('crm_event.related_to_required'),
    );
    expect(activity, 'related_to_required went unmeasured for these rows').toEqual([]);

    const counted = datasets
      .filter((d) => d.object === 'crm_task' || d.object === 'crm_event')
      .reduce((n, d) => n + d.records.length, 0);
    // Both objects are seeded and non-empty — a dataset that vanished would
    // otherwise satisfy every assertion in this file.
    expect(counted).toBeGreaterThan(30);
  });

  it('the one deliberate row is still documented as deliberate in the seed file', () => {
    // Pins the ROW to its REASON: parenting the row, or deleting the comment
    // that explains why it is unparented, both fail here. Without this the
    // pin above would happily outlive the rationale it depends on.
    const src = readFileSync(join(REPO_ROOT, 'src/data/service.seed.ts'), 'utf8');
    const idx = src.indexOf("subject: 'Update CRM pipeline report'");
    expect(idx, 'the pinned deliberate row is gone from the seeds').toBeGreaterThan(-1);
    const preamble = src.slice(Math.max(0, idx - 400), idx);
    expect(preamble).toMatch(/deliberately unparented/);
    expect(preamble).toMatch(/related_to_required/);
  });

  it('every other crm_task and crm_event seed row names a parent', () => {
    // The positive half of the same property: the pin above says which rows
    // warn, this says the rest carry BOTH halves of a polymorphic parent —
    // `related_to_type` plus the matching lookup. A lookup without the type is
    // invisible to the Related tab and the activity bubble (#490), and would
    // not be caught by the rule, which only reads the lookups.
    const RELATED = [
      'related_to_account',
      'related_to_contact',
      'related_to_opportunity',
      'related_to_lead',
      'related_to_case',
    ] as const;
    const FIELD_FOR: Record<string, string> = {
      crm_account: 'related_to_account',
      crm_contact: 'related_to_contact',
      crm_opportunity: 'related_to_opportunity',
      crm_lead: 'related_to_lead',
      crm_case: 'related_to_case',
    };

    const offenders: string[] = [];
    for (const ds of datasets.filter((d) => d.object === 'crm_task' || d.object === 'crm_event')) {
      for (const rec of ds.records) {
        const key = `${ds.object} :: ${keyOf(rec)}`;
        const parented = RELATED.some((f) => typeof rec[f] === 'string' && rec[f].trim() !== '');
        if (!parented) continue; // the pinned deliberate row; covered above
        const type = rec.related_to_type;
        if (typeof type !== 'string' || !type) {
          offenders.push(`${key} — has a lookup but no related_to_type`);
          continue;
        }
        const expectedField = FIELD_FOR[type];
        if (!expectedField) {
          offenders.push(`${key} — related_to_type '${type}' is not one of the five`);
          continue;
        }
        const v = rec[expectedField];
        if (typeof v !== 'string' || v.trim() === '') {
          offenders.push(`${key} — related_to_type '${type}' but ${expectedField} is empty`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
