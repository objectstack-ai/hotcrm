// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { compileCelToFilter } from '@objectstack/formula';
import { parseFilterAST } from '@objectstack/spec/data';
import stack from '../objectstack.config';
import { CLOSED_CASE_STATUSES } from '../src/objects/_case-assignment';

/**
 * ═══ ONE predicate for "no longer live work" on `crm_case` (#1145) ══════════
 *
 * **Every consumer of "this case is no longer live work" excludes exactly
 * `CLOSED_CASE_STATUSES` — `['resolved', 'closed']` — and the consumers are
 * pinned HERE, BY NAME.**
 *
 * ### The defect this file exists to prevent regrowing
 *
 * `is_closed` is derived by `case_sla_defaults` as `effStatus === 'closed'`, so
 * it never flips on `resolved`. Four consumers expressed one concept three
 * ways, and two of them used the flag:
 *
 *   | consumer                          | before                    |
 *   | --------------------------------- | ------------------------- |
 *   | `unassigned_triage` (view)        | `is_closed == false`      |
 *   | `case_unassigned_triage_sharing`  | `is_closed == false`      |
 *   | `case_auto_assign` load balancing | `status $nin [...]`       |
 *   | `case_escalation_reassign`        | `status $nin [...]`       |
 *   | `case_sla_monitor` (flow)         | `status $nin [...]`       |
 *
 * A resolved, still-ownerless case therefore satisfied the triage view's own
 * filter forever, and the sharing rule handed every service agent `edit` on it
 * for the same reason. #1145 moved both onto the status predicate; this file is
 * what stops a fifth spelling growing back, because "one concept, three
 * spellings" is the root cause and a fix without a guard only resets the clock.
 *
 * ### The roster earning its keep (#1325)
 *
 * `sla_at_risk` was pinned BELOW, on the boundary roster, as a same-shape view
 * left alone by #1145's scope. It was then measured against the producer that
 * owns SLA — `case_sla_monitor` already excludes `['resolved', 'closed']` —
 * and the two were found to CONTRADICT each other: the sweep would not flag a
 * resolved case as breached while the ⏰ SLA at Risk tab still listed that same
 * case for an agent to work. That is not a second concept, it is the #1145
 * defect wearing a sixth spelling, so the view moved onto the status predicate
 * and its name moved from the boundary roster into the consumer roster in the
 * same change. `test/sla-at-risk-live-work.test.ts` is its behavioural half.
 *
 * ### The three that were left, answered one by one (#1328)
 *
 * #1145 left three same-shape consumers undecided and forbade widening to them.
 * They were ruled 2026-08-31, and NOT the same way — which is the point:
 *
 *   - `my_open_cases` JOINED the roster above. A tab labelled "My Open Cases"
 *     that lists resolved cases is a label saying one thing and a filter doing
 *     another; measured on the seeded demo population the flag returned 30 of
 *     38 cases and 7 of those 30 were resolved.
 *   - `case_escalation_sharing` and `case_director_sharing` STAYED below, and
 *     stayed on `is_closed == false` on purpose. `resolved → closed` is the
 *     review window, and standing manager/director reach INSIDE that window is
 *     the workflow those grants exist for. Their entries carry the reasoning.
 *
 * ⛔ So "these three have the same shape" is not an argument for giving them the
 * same predicate. Each entry below says which answer it got and why.
 *
 * ### ⚠️ BY NAME, never by count
 *
 * The roster below is a list of NAMES, and every name must resolve. A guard
 * that counted consumers ("at least three agree") is satisfied by any N — and a
 * consumer that drops out of the walk (renamed view, retired hook, a filter
 * that stopped narrowing on `status`) takes itself out of the assertion with
 * nothing going red. So each named consumer is looked up individually and a
 * lookup that finds nothing, or an extraction that yields an empty set, is a
 * FAILURE rather than a silently skipped row.
 *
 * ### What is compared is the LOWERED filter, not the source text
 *
 * The four surfaces have four different authoring schemas, and that is correct
 * — a view `filter[]` rule, a CEL sharing condition, a flow node `filter:`, and
 * an inline `$nin` in a sandboxed hook body cannot be one literal string. What
 * has to agree is the SET each one excludes, so each is normalised through the
 * platform's own lowering first (`parseFilterAST` for the view rule,
 * `compileCelToFilter` for the sharing condition — the exact function
 * `plugin-sharing`'s seeder calls) and the set is read off the result. That
 * survives a future re-spelling of any one consumer and still holds the set.
 *
 * `test/unassigned-case-triage-reach.test.ts` is the behavioural half — it
 * boots the real stack on both drivers and asks what an agent can actually see
 * and claim. This file is the metadata half, and neither replaces the other.
 */

type AnyRec = Record<string, any>;

/** The single declared source of truth, as a sorted set. */
const EXPECTED = [...CLOSED_CASE_STATUSES].map(String).sort();

/**
 * The values a LOWERED `FilterCondition` excludes on `field`.
 *
 * Understands the three lowerings the four surfaces produce — `$nin`, a chain
 * of `$ne`, and a negated `$in` — because which one a surface produces is a
 * property of its schema, not of the concept. `$not` flips the sense on the way
 * down so a negated membership reads as an exclusion and a negated `$ne` does
 * not silently read as one.
 */
function excludedValues(filter: unknown, field: string): string[] {
  const out: string[] = [];
  const walk = (node: unknown, negated: boolean): void => {
    if (Array.isArray(node)) {
      node.forEach((child) => walk(child, negated));
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node as AnyRec)) {
      if (key === '$and' || key === '$or') {
        walk(value, negated);
        continue;
      }
      if (key === '$nor') {
        walk(value, !negated);
        continue;
      }
      if (key === '$not') {
        walk(value, !negated);
        continue;
      }
      if (key !== field) continue;
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      for (const [operator, operand] of Object.entries(value as AnyRec)) {
        if (operator === '$nin' && Array.isArray(operand) && !negated) out.push(...operand.map(String));
        else if (operator === '$in' && Array.isArray(operand) && negated) out.push(...operand.map(String));
        else if (operator === '$ne' && !negated) out.push(String(operand));
      }
    }
  };
  walk(filter, false);
  return [...new Set(out)].sort();
}

/** Fields a lowered filter narrows on at all — used to prove a NON-consumer. */
function narrowedFields(filter: unknown): string[] {
  if (!filter || typeof filter !== 'object') return [];
  if (Array.isArray(filter)) return filter.flatMap(narrowedFields);
  const out: string[] = [];
  for (const [key, value] of Object.entries(filter as AnyRec)) {
    if (key.startsWith('$')) out.push(...narrowedFields(value));
    else out.push(key);
  }
  return [...new Set(out)].sort();
}

const views: AnyRec[] = ((stack as AnyRec).views ?? []) as AnyRec[];
const caseViews = views.find((v) => v.list?.data?.object === 'crm_case');
const sharingRules: AnyRec[] = ((stack as AnyRec).sharingRules ?? []) as AnyRec[];
const flows: AnyRec[] = ((stack as AnyRec).flows ?? []) as AnyRec[];
const hooks: AnyRec[] = ((stack as AnyRec).hooks ?? []) as AnyRec[];

/** A view's `filter[]`, lowered rule by rule into one `$and`. */
function loweredViewFilter(viewName: string): unknown {
  const view = caseViews?.listViews?.[viewName];
  if (!view) return undefined;
  const rules: AnyRec[] = (view.filter ?? []) as AnyRec[];
  return { $and: rules.map((r) => parseFilterAST([r.field, r.operator, r.value])) };
}

/** A sharing rule's condition, through the compiler the seeder itself calls. */
function loweredSharingCondition(ruleName: string): unknown {
  const rule = sharingRules.find((r) => r.name === ruleName);
  if (!rule) return undefined;
  const source = typeof rule.condition === 'string' ? rule.condition : String(rule.condition?.source ?? '');
  const compiled = compileCelToFilter(source, { variables: {} });
  return compiled.ok ? compiled.filter : undefined;
}

/** Every `filter:` object anywhere inside one flow definition. */
function flowFilters(flowName: string): unknown[] {
  const flow = flows.find((f) => f.name === flowName);
  if (!flow) return [];
  const found: unknown[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node as AnyRec)) {
      if (key === 'filter' && value && typeof value === 'object') found.push(value);
      walk(value);
    }
  };
  walk(flow);
  return found;
}

/**
 * The `$nin` a sandboxed hook body spells INLINE.
 *
 * `_case-assignment.ts` exports `CLOSED_CASE_STATUSES`, but the L2 sandbox
 * gives a handler no module scope, so the two load-balancing handlers write the
 * literals out. Read them off the REGISTERED handler rather than off the file,
 * so a hook that fell out of the stack fails this lookup instead of passing on
 * the strength of a source file nothing mounts.
 */
function hookInlineStatusExclusions(hookName: string): string[] | undefined {
  const hook = hooks.find((h) => h.name === hookName);
  if (!hook) return undefined;
  const body = String(hook.handler ?? '');
  const matches = [...body.matchAll(/status:\s*\{\s*\$nin:\s*\[([^\]]*)\]/g)];
  if (matches.length === 0) return undefined;
  const sets = matches.map((m) =>
    [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((s) => s[1]).sort().join(','),
  );
  // One handler stating the concept two different ways is the very defect.
  if (new Set(sets).size !== 1) return [`INCONSISTENT: ${sets.join(' | ')}`];
  return sets[0].split(',');
}

/**
 * The roster. Every entry is looked up by NAME and must produce a set.
 */
const LIVE_WORK_CONSUMERS: { name: string; surface: string; excluded: () => string[] | undefined }[] = [
  {
    name: 'unassigned_triage',
    surface: 'view filter[] — src/views/case.view.ts',
    excluded: () => excludedValues(loweredViewFilter('unassigned_triage'), 'status'),
  },
  {
    name: 'sla_at_risk',
    surface: 'view filter[] — src/views/case.view.ts',
    excluded: () => excludedValues(loweredViewFilter('sla_at_risk'), 'status'),
  },
  {
    name: 'my_open_cases',
    surface: 'view filter[] — src/views/case.view.ts',
    excluded: () => excludedValues(loweredViewFilter('my_open_cases'), 'status'),
  },
  {
    name: 'case_unassigned_triage_sharing',
    surface: 'sharing condition (CEL) — src/sharing/case.sharing.ts',
    excluded: () => excludedValues(loweredSharingCondition('case_unassigned_triage_sharing'), 'status'),
  },
  {
    name: 'case_auto_assign',
    surface: 'load-balancing count — src/objects/_case-assignment.ts',
    excluded: () => hookInlineStatusExclusions('case_auto_assign'),
  },
  {
    name: 'case_escalation_reassign',
    surface: 'load-balancing count — src/objects/_case-assignment.ts',
    excluded: () => hookInlineStatusExclusions('case_escalation_reassign'),
  },
  {
    name: 'case_sla_monitor',
    surface: 'flow node filter — src/flows/case-sla-monitor.flow.ts',
    excluded: () => {
      const sets = flowFilters('case_sla_monitor')
        .map((f) => excludedValues(f, 'status'))
        .filter((s) => s.length > 0);
      return sets.length === 0 ? undefined : [...new Set(sets.flat())].sort();
    },
  },
];

describe('the "no longer live work" predicate is ONE set, and the roster is by name', () => {
  it('the declared set is real statuses on crm_case, not a typo', () => {
    // The whole file compares everything against `CLOSED_CASE_STATUSES`, so a
    // typo there would make every consumer agree on a status that does not
    // exist. Anchor it to the object's own option list.
    const caseObject = ((stack as AnyRec).objects ?? []).find((o: AnyRec) => o.name === 'crm_case');
    const options: string[] = (caseObject?.fields?.status?.options ?? []).map((o: AnyRec) => String(o.value));
    expect(options, 'crm_case.status declares no options — this anchor checks nothing').toContain('resolved');
    for (const status of EXPECTED) {
      expect(options, `CLOSED_CASE_STATUSES names "${status}", which is not a crm_case status`).toContain(status);
    }
  });

  it('every named consumer resolves — no row may drop out of the walk', () => {
    // Anti-vacuity, and the reason this guard is by NAME. A consumer that is
    // gone, renamed, or has stopped narrowing on `status` returns `undefined`
    // here; a count-based guard would simply not see it.
    const missing = LIVE_WORK_CONSUMERS.filter((c) => {
      const set = c.excluded();
      return set === undefined || set.length === 0;
    }).map((c) => `${c.name} (${c.surface})`);
    expect(
      missing,
      'these consumers of "no longer live work" could not be found, or no longer exclude any ' +
        'status at all — either they were renamed (fix the roster) or one of them has quietly ' +
        'stopped agreeing with the others:\n  ' + missing.join('\n  '),
    ).toEqual([]);
    expect(LIVE_WORK_CONSUMERS.length, 'the roster is empty').toBeGreaterThanOrEqual(5);
  });

  it.each(LIVE_WORK_CONSUMERS.map((c) => [c.name, c] as const))(
    '%s excludes exactly CLOSED_CASE_STATUSES',
    (_name, consumer) => {
      expect(
        consumer.excluded(),
        `${consumer.name} (${consumer.surface}) is a fifth spelling of "no longer live work". ` +
          'The four consumers were unified on `[\'resolved\', \'closed\'] `in #1145 precisely ' +
          'because they had drifted; do not add a sixth — change CLOSED_CASE_STATUSES and bring ' +
          'every consumer with it.',
      ).toEqual(EXPECTED);
    },
  );

  it('no live-work consumer keys the concept on is_closed', () => {
    // `is_closed` only flips on `closed`, so ANY of these reading it is the
    // original defect back. Stated as its own case because the set assertion
    // above would also pass a consumer that excluded the right statuses AND
    // additionally narrowed on the flag.
    const offenders: string[] = [];
    for (const name of ['unassigned_triage', 'sla_at_risk', 'my_open_cases']) {
      const fields = narrowedFields(loweredViewFilter(name));
      if (fields.includes('is_closed')) offenders.push(`${name} (view filter)`);
    }
    for (const name of ['case_unassigned_triage_sharing']) {
      const fields = narrowedFields(loweredSharingCondition(name));
      if (fields.includes('is_closed')) offenders.push(`${name} (sharing condition)`);
    }
    expect(
      offenders,
      '`is_closed` is derived as `status === "closed"` and never flips on `resolved`, so it ' +
        'cannot express "no longer live work":\n  ' + offenders.join('\n  '),
    ).toEqual([]);
  });
});

/**
 * The consumers that deliberately do NOT belong to the set above — pinned by
 * name too, so the boundary is visible rather than inferred from an absence.
 *
 * ⚠️ Every entry here is a RULED KEEP, not an unexamined leftover, and it is
 * not a decision anyone is free to re-make in passing. `case_workflow` was
 * measured and ruled a different concept; the two sharing rules were ruled a
 * deliberate standing grant on 2026-08-31 (#1328). What is pinned is that they
 * still key on `is_closed` and still exclude no status, so a later "tidy-up"
 * onto the status predicate turns red here instead of landing silently.
 *
 * ⚠️ TWO entries have LEFT this roster, and reading how is the fastest way to
 * see what the boundary is for. `sla_at_risk` left in #1325: `case_sla_monitor`
 * owns SLA and had already answered the same question the other way, so the
 * view was contradicting the automation rather than expressing a second
 * concept. `my_open_cases` left in #1328: its label promises "open" and its
 * filter delivered "not closed", which is a user-visible inconsistency rather
 * than a deliberate reach. Neither departure licenses the next one — the two
 * rules below were examined in that SAME ruling and kept, so moving one of
 * them up on the strength of the other two leaving is exactly the silent
 * widening this roster exists to make visible.
 */
const NOT_LIVE_WORK: { name: string; surface: 'view' | 'sharing'; why: string }[] = [
  {
    name: 'case_workflow',
    surface: 'view',
    why:
      'A status-grouped kanban, not a backlog. `KanbanConfigSchema` carries only ' +
      '`groupByField` + card `columns`, so the swimlanes come from the `status` field\'s own ' +
      'options — `resolved` IS a column on this board, and it is where a card lands when an ' +
      'agent drags one across. Excluding `resolved` would empty a swimlane the board still ' +
      'renders and make the resolve gesture\'s destination a hole. The triage tab\'s contract ' +
      'is "work waiting for a human"; this board\'s contract is the lifecycle itself.',
  },
  {
    name: 'case_escalation_sharing',
    surface: 'sharing',
    why:
      'The post-resolution REVIEW WINDOW, kept deliberately (ruled 2026-08-31). `resolved` ' +
      'is the state in which a critical case gets quality-checked, called back on, or ' +
      'reopened, and the manager holding `edit` is who does that — so the reach this rule ' +
      'has over a resolved case is the feature, not the #1145 defect wearing another ' +
      'spelling. It is narrow (critical only) and it is BOUNDED: `is_closed` flips at ' +
      '`closed`, which ends the grant. Moving it onto the status predicate would revoke ' +
      'access inside the window it exists for. The reasoning is beside the rule itself in ' +
      '`src/sharing/case.sharing.ts`; changing it needs the same standing to be re-argued.',
  },
  {
    name: 'case_director_sharing',
    surface: 'sharing',
    why:
      'The same review window one rung up, kept deliberately (ruled 2026-08-31), and ' +
      '`read` rather than `edit` — the director watches the window, the manager works it. ' +
      'Same boundary as the rule above: narrow (critical only), bounded (ends at `closed`). ' +
      'See `src/sharing/case.sharing.ts` for the reasoning beside the rule.',
  },
];

describe('the boundary of the set — what deliberately still keys on is_closed', () => {
  it.each(NOT_LIVE_WORK.map((e) => [e.name, e] as const))(
    '%s still narrows on is_closed and on no status',
    (_name, entry) => {
      const lowered =
        entry.surface === 'view' ? loweredViewFilter(entry.name) : loweredSharingCondition(entry.name);
      expect(lowered, `${entry.name} is gone — this boundary pin now checks nothing`).toBeDefined();
      const fields = narrowedFields(lowered);
      expect(
        fields,
        `${entry.name} stopped filtering on is_closed. If that is #1145's predicate arriving ` +
          `here, it is a WIDENING of that ruling and belongs on its own card. Reason it was ` +
          `left alone: ${entry.why}`,
      ).toContain('is_closed');
      expect(
        excludedValues(lowered, 'status'),
        `${entry.name} started excluding statuses — see above; this is the widening #1145 ruled out`,
      ).toEqual([]);
    },
  );
});
