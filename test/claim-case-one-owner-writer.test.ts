// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import { CLAIMABLE_TARGET_STATUSES } from '../src/objects/_case-assignment';

/**
 * ═══ Ownership has exactly ONE writer, and the Claim button is not it ═══════
 *
 * The guard the #1144 ruling asked to ship WITH the feature (decision batch
 * #21, 2026-09-03): **the claim flow's payload never carries `owner_id`**, so
 * "one writer" is enforced rather than intended.
 *
 * ## Why this is worth a guard at all, when the platform already refuses it
 *
 * It refuses it LOUDLY, and that is exactly why the rule needs writing down
 * here. The #3004 transfer gate rejects any payload carrying `owner_id` inside
 * the sharing MIDDLEWARE, upstream of the hook phase, and a screen flow's
 * `update_record` runs as the caller — so an author who adds the column gets a
 * FORBIDDEN at runtime, not a silent drift. A loud failure is the good case; it
 * is also the case nobody meets until a demo, because nothing in `pnpm
 * validate` or `pnpm build` opens a flow node's field map. This file moves the
 * discovery to CI.
 *
 * And there is a second, quieter failure the runtime would NOT catch. A caller
 * who legitimately holds `allowTransfer` passes the gate — and for that caller
 * `case_self_claim` guard 2 ("an explicit `owner_id` in the payload WINS and is
 * never touched") stands down. Adding the column would therefore take the claim
 * seam out of the path on the one caller it could still reach, which is the
 * "second writer of ownership" the ruling forbade in the first place.
 *
 * ## Reverse verification — predicted, then measured
 *
 * Predicted direction: RED, naming the node. Measured by adding
 * `owner_id: '{$user.id}'` beside `status` in the `claim` node's field map and
 * running this file: `1 failed` —
 *
 *     claim_case writes ownership itself. Nodes carrying `owner_id`:
 *       claim (update_record).status,owner_id
 *
 * …then removed, and the file is green again. The mutation and its restore were
 * each proven on disk before the run they justify; see the PR body.
 *
 * ## What else is pinned here, and why it belongs beside the ruled assertion
 *
 * **`runAs` is not `system`.** This is the same sentence read from the other
 * end: `case_self_claim` returns early for a write with no user and again for
 * `ctx.session.isSystem`, so an elevated run of this flow moves the status and
 * claims NOTHING — the case leaves triage still ownerless, which is a worse
 * outcome than the refusal above because it looks like it worked. House rule 9
 * says a screen flow stays `runAs: 'user'`; here that is a functional
 * requirement, not a policy preference.
 *
 * **The button's `visible` equals the GRANT.** `case_unassigned_triage_sharing`
 * is what decides whether the agent looking at the button may write the row, so
 * a button offered outside the grant is a button that answers FORBIDDEN. #1145
 * unified every consumer of "no longer live work" on
 * `CLOSED_CASE_STATUSES` and `test/live-work-predicate-parity.test.ts` holds
 * them to it BY NAME — but that roster reaches views, sharing conditions, hook
 * bodies and flow node filters, and an action's `visible` is a fifth surface it
 * has no reader for. Rather than leave a new consumer of the concept unpinned
 * (which is precisely how the original defect grew), the parity is asserted
 * here, against the shipped rule rather than against a copy of its text.
 *
 * **The picker is the seam's own set.** The three claiming statuses are
 * declared once, in `CLAIMABLE_TARGET_STATUSES`, and the screen's options are
 * built from it — so this pins the LABELS, which are the half a constant cannot
 * carry: they must be `crm_case.status`'s own, or the picker offers an agent a
 * word the record page never shows them (#490).
 */

type AnyRec = Record<string, any>;

const flows: AnyRec[] = (stack as any).flows ?? [];
const actions: AnyRec[] = (stack as any).actions ?? [];
const objects: AnyRec[] = (stack as any).objects ?? [];
const sharingRules: AnyRec[] = (stack as any).sharingRules ?? [];

const FLOW = 'claim_case';
const ACTION = 'claim_case';
const RULE = 'case_unassigned_triage_sharing';

/** By NAME, and a miss is a failure — never a silently skipped assertion. */
const named = (list: AnyRec[], name: string, what: string): AnyRec => {
  const hit = list.find((x) => x.name === name);
  if (!hit) throw new Error(`no ${what} named "${name}" is registered — this guard has gone blind`);
  return hit;
};

/** Every key any node of the flow writes, as `<node id> (<type>).<keys>`. */
const writtenFields = (flow: AnyRec): { id: string; type: string; keys: string[] }[] =>
  (flow.nodes ?? [])
    .filter((n: AnyRec) => n.config?.fields && !Array.isArray(n.config.fields))
    .map((n: AnyRec) => ({ id: n.id, type: n.type, keys: Object.keys(n.config.fields) }));

const celSource = (value: unknown): string =>
  typeof value === 'string' ? value : String((value as AnyRec)?.source ?? '');

describe('claim_case is a button over the claim seam, not a second writer of ownership', () => {
  it('the flow, the action and the grant all resolve — anti-vacuity', () => {
    const flow = named(flows, FLOW, 'flow');
    named(actions, ACTION, 'action');
    named(sharingRules, RULE, 'sharing rule');
    expect(
      writtenFields(flow).length,
      'claim_case writes no record at all — every assertion below would pass over an empty walk',
    ).toBeGreaterThan(0);
  });

  it('NO node of the claim flow writes owner_id', () => {
    const flow = named(flows, FLOW, 'flow');
    const offenders = writtenFields(flow)
      .filter((n) => n.keys.includes('owner_id'))
      .map((n) => `${n.id} (${n.type}).${n.keys.join(',')}`);
    expect(
      offenders,
      'claim_case writes ownership itself. Nodes carrying `owner_id`:\n  ' +
        offenders.join('\n  ') +
        '\nOwnership has exactly one writer and it is `case_self_claim` (priority 260, ' +
        '`src/objects/_case-assignment.ts`), which stamps the CALLER. A payload carrying ' +
        '`owner_id` is refused by the #3004 transfer gate in middleware, upstream of the hook ' +
        'phase — and for a caller holding `allowTransfer` it passes the gate and takes the ' +
        'claim seam out of the path instead. Move the status; the seam moves the owner.',
    ).toEqual([]);
  });

  it('the claim node moves the STATUS, and that is the whole write', () => {
    const flow = named(flows, FLOW, 'flow');
    const writes = writtenFields(flow);
    expect(writes.length, 'claim_case grew a second writing node').toBe(1);
    expect(
      writes[0].keys,
      `claim_case's ${writes[0].id} node writes ${writes[0].keys.join(', ')}. The claim is a ` +
        'STATUS MOVE and nothing else — anything further is behaviour the seam did not ask for.',
    ).toEqual(['status']);
  });

  it('the flow is not elevated — an elevated run claims nobody', () => {
    const flow = named(flows, FLOW, 'flow');
    expect(
      flow.runAs,
      "claim_case is runAs:'system'. `case_self_claim` returns early for a write with no user " +
        'and again for `ctx.session.isSystem`, so an elevated run moves the status and leaves ' +
        'the case OWNERLESS — it drops out of triage having claimed nothing, and looks like it ' +
        'worked. House rule 9 (AGENTS.md) says a screen flow stays runAs:\'user\'; here that is ' +
        'what makes the feature function.',
    ).not.toBe('system');
  });

  it('the action targets the screen flow, on both locations the ruling named', () => {
    const action = named(actions, ACTION, 'action');
    expect(action.type, 'claim_case must be flow-typed').toBe('flow');
    const target = named(flows, action.target, 'flow');
    expect(target.type, `claim_case targets "${action.target}", which is not a screen flow`).toBe('screen');
    expect(
      [...(action.locations ?? [])].sort(),
      'the ruling put the button on the record header AND the triage row menu — the record page ' +
        'is where the discoverability gap was measured, the row menu is where triage happens',
    ).toEqual(['list_item', 'record_header']);
  });

  it("the button's visible predicate is the sharing grant's own, verbatim", () => {
    // Compared against the SHIPPED rule, never against a copy of its text: a
    // literal here would go stale the next time the grant is re-derived, and
    // would then pin the button to a predicate the platform no longer applies.
    const action = named(actions, ACTION, 'action');
    const rule = named(sharingRules, RULE, 'sharing rule');
    expect(
      celSource(action.visible),
      'claim_case is offered on a different set of cases than `case_unassigned_triage_sharing` ' +
        'grants edit on. Outside the grant the button answers FORBIDDEN; inside it but narrower, ' +
        'the button hides on cases an agent may legitimately claim. ⛔ `record.is_closed == false` ' +
        'is NOT the grant — that flag is derived as `status === "closed"` and never flips on ' +
        '`resolved` (#1145).',
    ).toBe(celSource(rule.condition));
  });

  it('the picker offers exactly the statuses the seam reads as a claim, with the record page’s own labels', () => {
    const flow = named(flows, FLOW, 'flow');
    const screen = (flow.nodes ?? []).find((n: AnyRec) => n.type === 'screen');
    expect(screen, 'claim_case lost its screen — the agent no longer chooses a status').toBeTruthy();
    const picker = (screen!.config?.fields ?? []).find((f: AnyRec) => f.type === 'select');
    expect(picker, 'claim_case has no status picker').toBeTruthy();

    const options: AnyRec[] = picker!.options ?? [];
    expect(
      options.map((o) => o.value),
      'the picker has drifted from CLAIMABLE_TARGET_STATUSES. A status offered here that the ' +
        'hook does not read as a claim moves the case and claims nothing; one the hook reads ' +
        'but the picker omits is a claim gesture with no button.',
    ).toEqual([...CLAIMABLE_TARGET_STATUSES]);

    // The half the constant cannot carry. `crm_case.status` is where an agent
    // reads these words everywhere else in the app.
    const declared: AnyRec[] =
      named(objects, 'crm_case', 'object').fields?.status?.options ?? [];
    const labelOf = (value: string) => declared.find((o) => o.value === value)?.label;
    for (const option of options) {
      expect(
        option.label,
        `the picker labels "${option.value}" as "${option.label}", but crm_case.status calls it ` +
          `"${labelOf(option.value)}" — the agent would be offered a word the record page never shows.`,
      ).toBe(labelOf(option.value));
    }

    expect(
      picker!.defaultValue,
      'the picker no longer defaults to a claimable status',
    ).toBeOneOf([...CLAIMABLE_TARGET_STATUSES]);
  });
});
