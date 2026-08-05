// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AutomationEngine } from '@objectstack/service-automation';
import { REPO_ROOT } from './helpers/repo-root';
import stack from '../objectstack.config';

/**
 * ═══ HOUSE RULE: there is exactly ONE definition of a "hot" lead ═══════════
 *
 * The `lead_assignment` flow is the SEMANTICS PRODUCER. Its `check_hot`
 * decision (edge `e2`) is what stamps a 1-day follow-up SLA on a new lead and
 * fires "Hot lead — assign within 24h" at the owner. The `hot_leads` list view
 * is the queue that alert sends that owner to. If the two disagree on where
 * the line sits, the product tells a rep a lead is hot and then hides it.
 *
 * That is what happened (#766). The view cut at `rating >= 4.5` while the flow
 * cut at `>= 4`, and `rating` is a WHOLE-star field:
 *
 *   - `src/objects/lead.hook.ts` rounds the computed score — "round to WHOLE
 *     stars … half values rendered inconsistently in the star widget";
 *   - `Field.rating(5)` renders as `star_rating`, which offers whole stars only;
 *   - the one seeded `4.5` was deleted for exactly this reason (#591 — "the one
 *     rating in the system the contract could never produce").
 *
 * So `>= 4.5` was `== 5` on every row that can exist, and a 4-star lead got the
 * hot SLA, got the 24h alert, and never appeared in 🔥 Hot Leads.
 *
 * This file pins the agreement itself. Both numbers are DERIVED from the
 * shipped metadata — the view's filter clause and the flow edge's CEL source —
 * so neither side can be edited alone without turning this red. The truth
 * table at the bottom goes further than comparing two literals: it asks the
 * real automation engine whether a lead is routed hot, asks the view filter
 * whether that same lead is in the queue, and requires the two answers to
 * agree for every rating a lead can carry.
 *
 * Scope, stated honestly: the parity claim is about the RATING cut only. The
 * view additionally scopes to `status in (new, contacted)` — leads still worth
 * working — which the flow has no opinion about because it fires on insert.
 * The truth table therefore runs at a status inside that scope, and a separate
 * assertion pins that the status a freshly created lead carries is inside it.
 */

type AnyRec = Record<string, any>;

const VIEWS_DIR = join(REPO_ROOT, 'src', 'views');
const HOOK_SOURCE = readFileSync(join(REPO_ROOT, 'src', 'objects', 'lead.hook.ts'), 'utf8');

// ── The view side ──────────────────────────────────────────────────────────

const viewBundles: AnyRec[] = ((stack as AnyRec).views ?? []) as AnyRec[];
const leadBundle = viewBundles.find((v) => v?.listViews?.hot_leads);
const hotLeadsView: AnyRec | undefined = leadBundle?.listViews?.hot_leads;
const highPriorityView: AnyRec | undefined = leadBundle?.listViews?.high_priority;

const clausesOn = (view: AnyRec | undefined, field: string): AnyRec[] =>
  ((view?.filter ?? []) as AnyRec[]).filter((c) => c?.field === field);

/**
 * View filter operator → the CEL operator that says the same thing.
 *
 * Deliberately partial: an operator that is not in this table is a filter this
 * file does not know how to compare against a flow condition, and that must
 * fail loudly rather than be waved through. (`greater_than_or_equal` is the
 * console data adapter's `$gte`.)
 */
const CEL_OP: Record<string, '>=' | '>'> = {
  greater_than_or_equal: '>=',
  greater_than: '>',
};

const viewRatingClause = clausesOn(hotLeadsView, 'rating')[0];
const viewOp = CEL_OP[String(viewRatingClause?.operator)];
const viewThreshold = viewRatingClause?.value;

// ── The flow side ──────────────────────────────────────────────────────────

const flows: AnyRec[] = ((stack as AnyRec).flows ?? []) as AnyRec[];
const routingFlow = flows.find((f) => f?.name === 'lead_assignment');

/** The edge into the hot branch — the one node pair that means "this is hot". */
const hotEdge: AnyRec | undefined = ((routingFlow?.edges ?? []) as AnyRec[]).find(
  (e) => e?.target === 'sla_hot' && e?.type === 'conditional',
);

/** `P` compiles to `{ dialect: 'cel', source }`; older conditions may be raw strings. */
const celSource = (condition: unknown): string =>
  typeof condition === 'string'
    ? condition
    : String((condition as AnyRec)?.source ?? '');

const hotConditionSource = celSource(hotEdge?.condition);

/**
 * Every ORDERING comparison the hot condition makes on `record.rating`.
 *
 * `!=`/`==` guards (`record.rating != null`) are intentionally not matched —
 * they are totality guards, not the cut. More than one ordering comparison
 * would make "the threshold" ambiguous, so the count is asserted, not assumed.
 */
const ratingCuts = [
  ...hotConditionSource.matchAll(/record\.rating\s*(>=|>)\s*(-?\d+(?:\.\d+)?)/g),
].map((m) => ({ op: m[1] as '>=' | '>', value: Number(m[2]) }));

const flowOp = ratingCuts[0]?.op;
const flowThreshold = ratingCuts[0]?.value;

// ── Evaluators ─────────────────────────────────────────────────────────────

const silent: any = { info() {}, warn() {}, error() {}, debug() {}, trace() {} };
silent.child = () => silent;
const engine = new AutomationEngine(silent);

/** Exactly what `traverseNext` calls to decide whether an edge is taken. */
const routedHot = (record: AnyRec): boolean =>
  (engine as unknown as {
    evaluateCondition(e: unknown, v: Map<string, unknown>): boolean;
  }).evaluateCondition(hotEdge?.condition, new Map(Object.entries({ record, previous: null })));

/**
 * Apply a view filter the way the data adapter does.
 *
 * Only the operators `hot_leads` actually uses are implemented, and anything
 * else throws: a silently mis-evaluated operator would turn this whole file
 * into decoration. A field that is absent or null satisfies no comparison —
 * `$gte` against a missing column excludes the row on every driver.
 */
function matchesFilter(filter: AnyRec[], record: AnyRec): boolean {
  return filter.every((clause) => {
    const value = record[clause.field];
    switch (clause.operator) {
      case 'greater_than_or_equal':
        return typeof value === 'number' && value >= Number(clause.value);
      case 'greater_than':
        return typeof value === 'number' && value > Number(clause.value);
      case 'in':
        return (clause.value as unknown[]).includes(value);
      default:
        throw new Error(
          `hot_leads filter uses operator "${clause.operator}", which this parity ` +
            `test cannot evaluate — teach it the operator instead of deleting the case.`,
        );
    }
  });
}

// ── The pins ───────────────────────────────────────────────────────────────

describe('both sides of the "hot" definition are actually found', () => {
  // ANTI-VACUITY. Everything below compares two derived values; if either
  // derivation silently yielded `undefined`, the comparisons would pass by
  // being vacuous. These assertions are what make the rest mean something.
  it('the hot_leads view ships with exactly one rating cut', () => {
    expect(hotLeadsView, 'hot_leads view missing from the compiled stack').toBeTruthy();
    expect(clausesOn(hotLeadsView, 'rating')).toHaveLength(1);
    expect(viewOp, `unknown view operator "${viewRatingClause?.operator}"`).toBeDefined();
    expect(typeof viewThreshold, 'view threshold is not a number').toBe('number');
  });

  it('the lead_assignment flow ships with exactly one rating cut on its hot edge', () => {
    expect(routingFlow, 'lead_assignment flow missing from the compiled stack').toBeTruthy();
    expect(hotEdge, 'no conditional edge into sla_hot').toBeTruthy();
    expect(hotConditionSource).toContain('record.rating');
    expect(ratingCuts, `ambiguous rating cuts in: ${hotConditionSource}`).toHaveLength(1);
    expect(typeof flowThreshold, 'flow threshold is not a number').toBe('number');
  });
});

describe('one definition of "hot"', () => {
  it('the view and the routing flow cut at the same rating, with the same operator', () => {
    expect(
      { op: viewOp, threshold: viewThreshold },
      'hot_leads and the lead_assignment hot branch disagree on what "hot" means — ' +
        'a lead the flow alerts on would be missing from the queue the alert points at',
    ).toEqual({ op: flowOp, threshold: flowThreshold });
  });

  it('the cut is a whole star, because rating only ever holds whole stars', () => {
    // Derived, not asserted from memory: the hook is what makes ratings whole.
    expect(HOOK_SOURCE, 'lead.hook.ts no longer rounds the score').toMatch(
      /Math\.round\(\s*clamped\s*\)/,
    );
    expect(
      Number.isInteger(viewThreshold),
      `rating is a whole-star field, so a cut at ${viewThreshold} silently means ` +
        `${Math.ceil(Number(viewThreshold))} — write the star you mean`,
    ).toBe(true);
    expect(Number(viewThreshold)).toBeGreaterThanOrEqual(1);
    expect(Number(viewThreshold)).toBeLessThanOrEqual(5);
  });

  it('the queue is scoped to statuses a new lead can be in, so routing can reach it', () => {
    // The status cut is the view's own scope, not part of the parity claim —
    // but if it excluded `new`, the flow could route a lead hot at insert and
    // the queue would still be empty, which is the same defect by other means.
    const statuses = clausesOn(hotLeadsView, 'status')[0];
    expect(statuses?.operator).toBe('in');
    expect(statuses?.value).toContain('new');
  });
});

/**
 * The property the two literals only stand in for: for every rating a lead can
 * carry, "routing called it hot" and "it is in the Hot Leads queue" are the
 * SAME answer. The flow side runs on the real `AutomationEngine`; the view
 * side runs the shipped filter.
 *
 * Reverse verification (predicted before running): restoring `value: 4.5` on
 * the view filter turns the `rating: 4` row RED here — routed hot, not in the
 * queue — and turns the whole-star assertion above red as well. It is a plain
 * red, not one of the inverted directions: both sides are read from live
 * metadata, so nothing is judged by a rule that stopped running.
 */
describe('a lead routing calls hot is a lead in the Hot Leads queue', () => {
  const STATUS = 'new'; // inside the view's status scope; what an insert carries
  const RATINGS: Array<number | null | undefined> = [1, 2, 3, 4, 5, null, undefined];

  const rows = RATINGS.map((rating) => {
    const record: AnyRec = { status: STATUS };
    // `undefined` models the absent column a sparse driver returns; setting the
    // key at all would be a different record shape.
    if (rating !== undefined) record.rating = rating;
    return {
      rating,
      hot: routedHot(record),
      queued: matchesFilter((hotLeadsView?.filter ?? []) as AnyRec[], record),
    };
  });

  it.each(rows.map((r) => [String(r.rating), r] as const))(
    'rating %s: routed-hot and in-queue agree',
    (_label, row) => {
      expect(
        row.queued,
        row.hot
          ? `rating ${row.rating} is routed HOT (1-day SLA + "assign within 24h" alert) ` +
            `but is NOT in the 🔥 Hot Leads queue that alert points at`
          : `rating ${row.rating} is NOT routed hot but sits in the 🔥 Hot Leads queue`,
      ).toBe(row.hot);
    },
  );

  it('the table separates leads at all (both verdicts occur)', () => {
    // Without this, an "always false" filter and an "always false" condition
    // would agree perfectly and prove nothing.
    expect(rows.some((r) => r.hot), 'no rating is routed hot').toBe(true);
    expect(rows.some((r) => !r.hot), 'every rating is routed hot').toBe(true);
  });

  it('an unrated lead is in neither — it is not a hot lead', () => {
    for (const row of rows.filter((r) => r.rating === null || r.rating === undefined)) {
      expect(row.hot, `rating ${row.rating} routed hot`).toBe(false);
      expect(row.queued, `rating ${row.rating} queued`).toBe(false);
    }
  });
});

/**
 * The other half of #766: the view's comment cited an `auto_flag_hot_lead`
 * workflow that has never existed in this repo. A prose reference to a
 * non-existent automation is worse than no reference — it sends the next
 * reader (or the next agent) looking for the producer of a behaviour in a file
 * that isn't there, and nothing in CI noticed for as long as it stood.
 *
 * So every automation named in a view comment must resolve to something the
 * stack actually registers. The name shape is the tell: a `snake_case`
 * identifier next to the words flow / workflow / automation, in either order.
 * Ordinary prose ("the routing flow", "a record-change flow") carries no
 * underscore and is not matched.
 */
describe('view comments only name automations that exist', () => {
  const registered = new Set<string>([
    ...flows.map((f) => String(f?.name)),
    ...(((stack as AnyRec).hooks ?? []) as AnyRec[]).map((h) => String(h?.name)),
    ...(((stack as AnyRec).actions ?? []) as AnyRec[]).map((a) => String(a?.name)),
  ]);

  const NAME = String.raw`\`?([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\`?`;
  const KIND = String.raw`(?:flow|workflow|automation)`;
  const PATTERNS = [
    new RegExp(String.raw`${NAME}\s+${KIND}\b`, 'g'),
    new RegExp(String.raw`${KIND}\s+(?:named|called)?\s*${NAME}`, 'g'),
  ];

  const references = readdirSync(VIEWS_DIR)
    .filter((f) => f.endsWith('.view.ts'))
    .flatMap((file) => {
      const source = readFileSync(join(VIEWS_DIR, file), 'utf8');
      return PATTERNS.flatMap((re) =>
        [...source.matchAll(re)].map((m) => ({ file, name: m[1] })),
      );
    });

  it('finds automation references to check at all', () => {
    // Anti-vacuity: an empty sweep would pass the next assertion trivially.
    expect(registered.size).toBeGreaterThan(0);
    expect(references.length, 'no automation reference found in src/views').toBeGreaterThan(0);
  });

  it('every automation a view comment names is registered in the stack', () => {
    const ghosts = references
      .filter((r) => !registered.has(r.name))
      .map((r) => `${r.file}: "${r.name}"`);
    expect(
      ghosts,
      'These view comments name an automation that does not exist. Cite the real ' +
        'producer (a flow / hook / action the stack registers) or drop the name:\n  ' +
        ghosts.join('\n  '),
    ).toEqual([]);
  });
});
