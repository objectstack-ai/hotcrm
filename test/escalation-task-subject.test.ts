// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack, { type AnyRec } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

const objects: AnyRec[] = (stack as AnyRec).objects ?? [];

/**
 * The escalation follow-up task is titled with the CASE NUMBER, not the record
 * id (#1208).
 *
 * The task used to be subjected `Escalated case ${caseId} needs attention`, so
 * a demo org with nine seeded escalations opened **All Tasks** on nine urgent
 * rows differing only in a 16-character opaque key — indistinguishable to the
 * agent who has to work them, and unmatchable against anything else in the UI,
 * because every case surface in this app (record pages, list views,
 * breadcrumbs, `crm_case.display_title`) names a case `CASE-00039`.
 *
 * Two things make this worth a file of its own rather than another assertion
 * in `hooks-runtime-service.test.ts`:
 *
 *  1. **The title must be composed INSIDE the body.** Hook bodies ship
 *     body-only through QuickJS. A shared helper for composing the title would
 *     make `extractHookBody` throw, the CLI build would CATCH that and bundle
 *     the closure instead, and no gate would go red — the app would just stop
 *     shipping this hook as metadata — except that `os lint --strict`
 *     (`pnpm lint`) refuses exactly that, as `hook-body/not-lowerable`. This
 *     file guards the behaviour that depends on the body, on a real
 *     escalation: the shipped app booted through `@objectstack/verify`'s
 *     handle, a service agent escalating a case.
 *  2. **The 255-character cap is load-bearing, and only a real engine can say
 *     so.** `crm_task.subject` declares `maxLength: 255` and the engine
 *     ENFORCES it; `crm_case.subject` allows the same 255. An uncapped
 *     `Escalated: ` + number + separator + subject is therefore up to 279
 *     characters, and this hook is `async: true` + `onError: 'log'` — the
 *     rejected insert would surface nowhere and the escalation task would
 *     simply never exist. The last block drives both halves through the
 *     engine on the shipped `crm_task` metadata.
 */

let verify: VerifyStack;
let agent: Person;
let accountId: string;

beforeAll(async () => {
  verify = await hotcrmStack();
  // The person this is about: a service agent escalating a case they work.
  agent = await signUpPerson(verify, 'agent@escalation-task-subject.test', {
    name: 'Escalating Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });
  const rep = await signUpPerson(verify, 'rep@escalation-task-subject.test', {
    name: 'Account Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Escalation Co', owner_id: rep.id }]);
  accountId = String(account.id);
}, 120_000);

/**
 * Open a case as the agent, optionally reshape its stored pre-image, escalate
 * it in a real update, and return the follow-up task `case_status_side_effects`
 * inserted for it.
 *
 * That hook is `async: true` + `onError: 'log'` — the engine runs it after the
 * write has returned, so the task is waited for rather than read back at once.
 * `stored` is applied as the SYSTEM after the case is opened: it is how a case
 * whose stored number or subject is blank (a state no form produces) reaches
 * the hook as its `previous`.
 */
const escalate = async (
  subject: string,
  input: Rec = {},
  stored: Rec = {},
): Promise<{ task: Rec; kase: Rec }> => {
  const opened = await verify.hooks.run(
    'crm_case', 'insert',
    { subject, description: 'Customer reported it twice.', crm_account: accountId },
    { as: agent.token },
  );
  if (Object.keys(stored).length > 0) await systemUpdate(verify, 'crm_case', { id: opened.id, ...stored });
  const [kase] = await verify.rows('crm_case', { id: opened.id });
  await verify.hooks.run('crm_case', 'update', { id: opened.id, status: 'escalated', ...input }, { as: agent.token });
  const task = await vi.waitFor(async () => {
    const [row] = await verify.rows('crm_task', { related_to_case: opened.id });
    expect(row, 'no escalation task was inserted').toBeTruthy();
    return row!;
  }, { timeout: 10_000, interval: 50 });
  return { task, kase: kase! };
};

describe('escalation task subject — on a real escalation', () => {
  it('names the case the way every other surface in the app names it', async () => {
    const { task, kase } = await escalate('Login SSO failure after password reset');
    expect(kase.case_number, 'the engine stamped no case number').toMatch(/^CASE-\d+$/);
    expect(task.subject).toBe(`Escalated: ${kase.case_number} · Login SSO failure after password reset`);
  });

  it('keeps the record id out of the title and in the relationship', async () => {
    const { task, kase } = await escalate('Login SSO failure after password reset');
    expect(task.subject).not.toContain(kase.id);
    // The id is not lost — `related_to_case` is where a relationship belongs.
    expect(task.related_to_case).toBe(kase.id);
    expect(task.related_to_type).toBe('crm_case');
  });

  it('gives nine escalations nine rows the agent can tell apart', async () => {
    // The reported symptom, restated as an assertion — and deliberately NOT as
    // "the nine subjects are distinct". Nine raw ids are nine distinct strings
    // too, so distinctness alone passes on the very code this file exists to
    // reject. What was missing is a discriminator the reader can MATCH against
    // the case pages, list views and breadcrumbs: the case number.
    for (let n = 31; n <= 39; n += 1) {
      const { task, kase } = await escalate(`Customer ${n} cannot sign in`);
      expect(task.subject).toBe(`Escalated: ${kase.case_number} · Customer ${n} cannot sign in`);
      expect(task.subject).not.toContain(kase.id);
    }
  });

  it('prefers a subject the same write is changing', async () => {
    const { task, kase } = await escalate('Login SSO failure after password reset', { subject: 'Renamed in this very write' });
    expect(task.subject).toBe(`Escalated: ${kase.case_number} · Renamed in this very write`);
  });

  it('drops the separator when the case number is missing, and a blank subject is refused before the hook', async () => {
    // The number half: a stored case whose number was cleared.
    const noNumber = await escalate('Login SSO failure after password reset', {}, { case_number: null });
    expect(noNumber.task.subject).toBe('Escalated: Login SSO failure after password reset');

    // The subject half cannot reach the hook on a real install: `crm_case.subject`
    // is required, and the engine refuses a blank one on every door — a
    // person's insert, the system's seed, and a system update ("cannot be
    // cleared"). The hook's blank-subject branches ("Escalated: CASE-…" alone,
    // and "Escalated case needs attention") defend a pre-image no write can
    // produce; this pins the refusal that makes them unreachable, so the day the
    // subject stops being required this goes red and the branches are back in play.
    const kase = await verify.hooks.run(
      'crm_case', 'insert', { subject: 'Will not be blanked', description: 'x', crm_account: accountId }, { as: agent.token },
    );
    for (const blank of ['   ', '']) {
      await expect(systemUpdate(verify, 'crm_case', { id: kase.id, subject: blank }))
        .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    }
  });

  it('still creates the task, and still leads with the identifier, at maximum length', async () => {
    const { task, kase } = await escalate('S'.repeat(255));
    expect((task.subject as string).length).toBeLessThanOrEqual(255);
    expect(task.subject as string).toMatch(new RegExp(`^Escalated: ${kase.case_number} · S+…$`));
  });
});

/**
 * The cap, measured against the engine that enforces it.
 *
 * The hook cannot import `crm_task`'s declared `maxLength` — a body-only hook
 * has no module scope — so the number is written inline there and pinned here
 * against the shipped metadata AND against a real insert. If someone lowers
 * `crm_task.subject.maxLength`, the first assertion fails; if the engine stops
 * enforcing it, the reverse-verification below fails.
 */
describe('the 255 cap, against the real engine', () => {
  const taskSubject = (objects.find((o) => o.name === 'crm_task')?.fields ?? {}).subject;

  /** Insert a task the way the hook does — through the engine, as the agent. */
  const insertTask = (subject: string) =>
    verify.hooks.run('crm_task', 'insert', { subject, status: 'not_started', related_to_account: accountId }, { as: agent.token });

  it('is the length the shipped metadata declares', () => {
    expect(taskSubject?.maxLength).toBe(255);
  });

  it('accepts the capped subject the hook composes', async () => {
    const { task } = await escalate('S'.repeat(255));
    // Pin the worst case, not just any case: a subject that came back SHORT
    // would make this insert succeed without ever exercising the cap.
    expect((task.subject as string).length).toBe(255);
    const row = await insertTask(task.subject as string);
    expect(row.id).toBeTruthy();
  });

  it('rejects the uncapped composition — which is why the cap exists', async () => {
    // Reverse verification. `async: true` + `onError: 'log'` means this
    // rejection would be swallowed: no escalation task, no error anyone sees.
    const uncapped = `Escalated: CASE-00039 · ${'S'.repeat(255)}`;
    expect(uncapped.length).toBeGreaterThan(255);
    await expect(insertTask(uncapped)).rejects.toThrow(/255/);
  });
});
