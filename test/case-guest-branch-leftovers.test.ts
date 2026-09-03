// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import {
  SecurityPlugin,
  appDefaultPermissionSetName,
  buildContextForUser,
} from '@objectstack/plugin-security';
import { SharingServicePlugin } from '@objectstack/plugin-sharing';
import { tenancyProbe } from './helpers/tenancy-probe';
import stack from '../objectstack.config';

/**
 * The two leftovers #1133 left in the `crm_case` guest branch, pinned on
 * STORED ROWS (#1296).
 *
 * ### Why a second guest-submission file rather than more cases in the first
 *
 * `test/guest-submission-sanitisation.test.ts` pins the #1133 repair: the
 * fields that branch already claimed to strip really are neutralised, because
 * the branch ASSIGNS instead of `delete`-ing. This file pins the two things
 * that card deliberately did not settle, and they are different claims:
 *
 *  1. `escalation_reason` joins the strip — a WIDENING of the control, argued
 *     rather than assumed (see below);
 *  2. the branch's `priority` default was dead code, and the field's own
 *     declared default is what a guest submission actually gets.
 *
 * ### Both cases assert what was STORED, and each carries a positive control
 *
 * Every case reads the row back through the engine and asserts values on it.
 * None of them can pass by the submission being rejected, by the object being
 * unreachable, or by the guest branch being deleted outright: `crm_case.origin`
 * declares no `defaultValue` anywhere in this app, so a stored `origin: "web"`
 * has exactly one possible source — the first statement of the very branch
 * under test. That is the same discriminator the sibling file uses, and it is
 * why "the branch ran" is a measurement here rather than an assumption.
 *
 * ⚠️ The boundary from #1133 is unchanged and is not quietly widened here.
 * What these cases measure is the HOOK-LEVEL control, and that stays the whole
 * of what a red below proves: they call ObjectQL directly with a guest context
 * and make no HTTP request, so the REST layer and `plugin-security`'s
 * middleware — which a real anonymous write does cross — are not in play here.
 *
 * That middleware path is no longer unmeasured. ⚠️ The reading is INHERITED,
 * not taken for this file: PR #1515 drove it against a real server
 * (`objectstack start`, the production plugin set) unauthenticated over HTTP,
 * and it was NOT re-run when this paragraph was rewritten. In that run every
 * generic anonymous write surface answered `401 UNAUTHENTICATED`, and the one
 * surviving route is the public form submit, which filters the body against an
 * allow-list built from the matched form view's OWN declared sections.
 * `src/objects/case.hook.ts` carries that measurement in full, at the branch
 * these cases exercise — read it there rather than a second copy of the table
 * here.
 *
 * ⛔ The answer is PER-COLUMN, and flattening it into one reassuring sentence
 * gets one of the two columns below wrong. `web_to_case` declares exactly
 * `subject`, `description`, `type` and `priority` (`src/views/case.view.ts` —
 * that list WAS re-read here, unlike the route readings above), so against the
 * allow-list mechanism the two columns this file pins land differently:
 *
 *   escalation_reason  NOT declared ⇒ dropped before ObjectQL and before the
 *                      hook, so a guest does not reach it on the shipped app.
 *   priority           DECLARED ⇒ the form ASKS the guest for it, so a guest
 *                      DOES reach it — by design, and that is exactly what
 *                      item 2 below is about.
 *
 * ⛔ Nor do those 401s make this branch redundant. What holds is that declared
 * field list — a product decision, not a security declaration — and #1515
 * measured it as such by widening the form by one field, after which the same
 * anonymous POST stored the planted value. The strip is the layer that has to
 * hold when the list moves.
 *
 * ### Item 1 — why `escalation_reason` belongs in the strip
 *
 * Adding a field to a security control widens it, so the reasoning is recorded
 * where the pin lives. The branch's own rule is that guests "state facts about
 * themselves, never about the pipeline", and an escalation reason is pipeline:
 * every real writer of the column is staff-side (`case_escalation`,
 * `case_sla_monitor`, the `escalate_case` screen flow), and the public
 * `web_to_case` form view collects exactly `subject`, `description`, `type` and
 * `priority` — so nulling it drops nothing any guest surface asks for.
 *
 * After #1133 the incoherence is the sharper argument: `is_escalated` is
 * cleaned and the prose EXPLAINING that flag was not, so a case could carry a
 * stated escalation reason while not being escalated, on a record page that
 * renders both in one `escalation` field group. Pre-#1133 the record was at
 * least self-consistent.
 *
 * `guest_portal` grants `crm_case.allowCreate` at the OBJECT level with no
 * field allow-list (`src/profiles/guest-portal.profile.ts`), which is what
 * makes this branch the field-level control rather than a second layer behind
 * one — and an omission from it a hole rather than redundancy.
 *
 * ### Item 2 — the `priority` default was dead, and this is how that is visible
 *
 * `if (!input.priority) input.priority = 'medium'` never executed.
 * `crm_case.priority` declares its `low` option `default: true`, and on the
 * engine's insert path `applyFieldDefaults` builds the row that BECOMES
 * `ctx.input.data` before `triggerHooks('beforeInsert')` runs — so the slot is
 * always already full when the branch sees it.
 *
 * The stored `priority` alone would be weak evidence: `low` is also what you
 * would get if the hook wrote `medium` and something later overwrote it. Two
 * further values discriminate, and both are computed BY THE HOOK from what the
 * hook itself saw in `input.priority`:
 *
 *  - `priority_rank` is stamped from that value (`low` ⇒ 1, `medium` ⇒ 2);
 *  - `sla_due_date` is stamped off the same value through the priority × tier
 *    matrix, and the two rows are far apart — `low`/`smb` is 168 calendar
 *    hours, `medium`/`smb` is 48.
 *
 * So a rank of 1 and a ~168-hour clock are only reachable if the defaulted
 * `low` was already in `input` when the branch ran. Had the deleted line ever
 * fired, both would read `2` and ~48 instead.
 *
 * ⛔ Neither case says anything about whether a web-submitted case SHOULD start
 * above `low`. That is a product question with no measured pull behind it and
 * is not settled here; what is settled is that the app no longer carries code
 * claiming it already is.
 */

type AnyRec = Record<string, any>;

process.env.OS_REGISTRY_LOG ??= 'silent';

/**
 * A genuinely anonymous caller: no user id AND no `isSystem`. Both are needed —
 * a userless-but-system context is the most trusted caller there is, not a
 * guest, and the branch under test deliberately excludes it.
 */
const GUEST = {} as AnyRec;
/** The trusted write / read-back channel. */
const SYS = { isSystem: true } as AnyRec;

/** `low`/`smb` from the priority × account-tier matrix, in calendar hours. */
const LOW_TIER_SLA_HOURS = 168;
/** `medium`/`smb` — what the clock would read if the deleted line had fired. */
const MEDIUM_TIER_SLA_HOURS = 48;

let kernel: AnyRec;
let ql: AnyRec;
const id: Record<string, string> = {};
let agentCtx: AnyRec;

const insertAs = async (context: AnyRec, object: string, doc: AnyRec): Promise<string> => {
  const row = await ql.insert(object, doc, { context });
  return String(row?.id ?? row?.record?.id);
};
const rowById = async (object: string, rowId: string): Promise<AnyRec> => {
  const found = await ql.findOne(object, { where: { id: rowId } }, { context: SYS });
  return (found ?? {}) as AnyRec;
};

/** Hours between now and an ISO timestamp the hook stamped. */
const hoursFromNow = (iso: unknown): number =>
  (new Date(String(iso)).getTime() - Date.now()) / 3_600_000;

beforeAll(async () => {
  kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
  await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
  await kernel.use(
    new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_test' } as never),
  );
  await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_test' } as never));
  await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
  await kernel.use(
    new SecurityPlugin({
      fallbackPermissionSet: appDefaultPermissionSetName((stack as AnyRec).permissions),
    } as never),
  );
  // 17.2.0: declared sharing rules are only seeded once this stack states its
  // tenancy posture — see `test/helpers/tenancy-probe.ts` for the measurement.
  // Mounted BEFORE SharingServicePlugin, which reads the posture during its own
  // boot.
  await kernel.use(tenancyProbe('single') as never);
  await kernel.use(new SharingServicePlugin());
  await kernel.bootstrap();
  ql = kernel.getService('objectql');

  // The FIRST human user is auto-promoted to platform admin at boot. Burn that
  // promotion on a throwaway so the agent below is an ordinary user whose
  // writes go through the same enforcement a real staff edit would.
  await insertAs(SYS, 'sys_user', { name: 'Platform Admin', email: 'admin@case-leftovers.test' });
  id.agent = await insertAs(SYS, 'sys_user', { name: 'Service Agent', email: 'agent@case-leftovers.test' });

  const sets = await ql.find('sys_permission_set', { where: {} }, { context: SYS });
  const agentSet = (sets as AnyRec[]).find((s) => s.name === 'service_agent');
  await insertAs(SYS, 'sys_user_permission_set', {
    user_id: id.agent,
    permission_set_id: agentSet?.id,
  });

  agentCtx = await buildContextForUser(ql, id.agent);
}, 120_000);

describe('crm_case — a guest cannot state an escalation reason (#1296 item 1)', () => {
  it('nulls a planted escalation_reason, so the flag and its prose stay coherent', async () => {
    const caseId = await insertAs(GUEST, 'crm_case', {
      subject: 'Everything is broken',
      description: 'And it has been broken since Tuesday.',
      // Both halves of the escalation surface, planted by the submitter.
      is_escalated: true,
      escalation_reason: 'PLANTED-REASON',
    });
    const stored = await rowById('crm_case', caseId);

    // Positive control: the guest branch RAN. `crm_case.origin` declares no
    // `defaultValue`, so this value has exactly one possible source.
    expect(stored.origin).toBe('web');

    expect(
      stored.escalation_reason,
      'a guest-supplied escalation reason survived the strip — the branch cleans the ' +
        'flag but not the prose that explains it, which is the incoherence #1296 closed. ' +
        'If this came back as the planted string, ⛔ do not relax the assertion.',
    ).toBeNull();

    // The pair, asserted together: this is the property the card is about.
    // Either both are clean or the record contradicts itself.
    expect(stored.is_escalated).toBe(false);
  }, 60_000);

  it('stores the row rather than rejecting it — the strip cannot trip escalation_reason_required', async () => {
    // `crm_case.escalation_reason_required` (severity: error) demands a reason
    // whenever `is_escalated` is true. Nulling the reason while the same branch
    // forces the flag false must therefore be SAFE — and the way to show that
    // is a stored row, not a caught error: the engine runs `validateRecord` /
    // `evaluateValidationRules` after the `beforeInsert` hooks, against the row
    // the hook has already rewritten.
    const caseId = await insertAs(GUEST, 'crm_case', {
      subject: 'Escalate me immediately',
      description: 'I would like to speak to a manager.',
      escalation_reason: 'PLANTED-REASON-NO-FLAG',
    });
    const stored = await rowById('crm_case', caseId);

    expect(stored.origin).toBe('web'); // positive control
    // A row came back at all, with the case's own subject on it: the write was
    // not rejected, and the validation rule is satisfied by the hook's output.
    expect(stored.subject).toBe('Escalate me immediately');
    expect(stored.escalation_reason).toBeNull();
    expect(stored.is_escalated).toBe(false);
  }, 60_000);

  it('a trusted write keeps the escalation reason', async () => {
    // The negative control, in the other direction: without it every assertion
    // above would still pass if the strip lost its `isGuestSubmission` guard
    // and started blanking staff edits — which would break the three flows that
    // are the column's only real writers.
    const caseId = await insertAs(agentCtx, 'crm_case', {
      subject: 'Escalated by an agent',
      description: 'Raised internally after a call.',
      is_escalated: true,
      escalation_reason: 'Customer is a strategic account',
    });
    const stored = await rowById('crm_case', caseId);

    expect(stored.escalation_reason).toBe('Customer is a strategic account');
    expect(stored.is_escalated).toBe(true);
  }, 60_000);
});

describe('crm_case — the field owns its priority default, not the hook (#1296 item 2)', () => {
  it('a guest submission naming no priority stores low, and the HOOK saw low', async () => {
    const caseId = await insertAs(GUEST, 'crm_case', {
      subject: 'Printer makes a noise',
      description: 'A sort of grinding noise.',
      // Deliberately no `priority` — the branch that used to default it is gone.
    });
    const stored = await rowById('crm_case', caseId);

    expect(stored.origin).toBe('web'); // positive control

    // The field's own declared default (`low`, `default: true`), applied by
    // `applyFieldDefaults` before the hook ever ran.
    expect(
      stored.priority,
      'a guest submission no longer stores the priority the FIELD declares. If this ' +
        'reads "medium", a default has been re-added to the hook — the field already ' +
        'owns this, and a hook-side copy is dead code that lies about the app.',
    ).toBe('low');

    // ── the ordering discriminators ──
    // Both of these are computed by the hook FROM `input.priority`, so they
    // report what the hook actually saw rather than what was stored afterwards.
    expect(
      stored.priority_rank,
      'the rank the hook stamped is not `low`\'s. The hook read some other priority ' +
        'out of its input, which means field defaults no longer land before beforeInsert.',
    ).toBe(1);

    const hours = hoursFromNow(stored.sla_due_date);
    expect(
      hours,
      `the SLA clock is ~${Math.round(hours)}h, not the ~${LOW_TIER_SLA_HOURS}h the ` +
        `low/smb matrix cell gives. ~${MEDIUM_TIER_SLA_HOURS}h would mean the hook saw ` +
        '`medium` — i.e. a priority default is executing in the hook again.',
    ).toBeGreaterThan(LOW_TIER_SLA_HOURS - 8);
    expect(hours).toBeLessThanOrEqual(LOW_TIER_SLA_HOURS);
    // ...and unambiguously not the medium row, which is what the deleted line
    // would have produced.
    expect(hours).toBeGreaterThan(MEDIUM_TIER_SLA_HOURS);
  }, 60_000);
});
