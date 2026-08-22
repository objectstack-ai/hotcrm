// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import caseHooks from '../src/objects/case.hook';
import { objects } from './helpers/metadata-fixtures';
import { makeSandboxEngine, runHookBody, type Rec } from './helpers/action-sandbox';

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
 *  1. **It runs the LOWERED body, not the handler closure.** Hook bodies ship
 *     body-only through QuickJS. A shared helper for composing the title would
 *     make `extractHookBody` throw, the CLI build would CATCH that and bundle
 *     the closure instead, and no gate would go red — the app would just stop
 *     shipping this hook as metadata. `runHookBody` executes what the artifact
 *     actually carries, so a title composed out of module scope fails here.
 *     (The repo-wide "every registered hook still lowers to a metadata-only
 *     body" sweep in `action-sandbox.test.ts` guards the property; this guards
 *     the behaviour that depends on it.)
 *  2. **The 255-character cap is load-bearing, and only a real engine can say
 *     so.** `crm_task.subject` declares `maxLength: 255` and the engine
 *     ENFORCES it; `crm_case.subject` allows the same 255. An uncapped
 *     `Escalated: ` + number + separator + subject is therefore up to 279
 *     characters, and this hook is `async: true` + `onError: 'log'` — the
 *     rejected insert would surface nowhere and the escalation task would
 *     simply never exist. The last test below drives both halves through a
 *     real ObjectQL on the shipped `crm_task` metadata.
 */

const hook = caseHooks.find((h) => h.name === 'case_status_side_effects')!;

/** A case pre-image as the engine hands it to an `afterUpdate` hook. */
const CASE_ID = 'PZPqP6vSaQQF-FHb';
const previousCase = (over: Rec = {}): Rec => ({
  id: CASE_ID,
  case_number: 'CASE-00039',
  subject: 'Login SSO failure after password reset',
  status: 'working',
  crm_account: 'acc1',
  ...over,
});

/**
 * Escalate one case through the SHIPPED body and return the task it inserted.
 *
 * `input` deliberately carries no `id`: the engine's flat-input proxy enumerates
 * only the write payload, so `ctx.input.id` is absent in the sandbox and the
 * body resolves the case off `previous` — the same pre-image it reads
 * `case_number` and `subject` from.
 */
const escalate = async (previous: Rec, input: Rec = {}): Promise<Rec> => {
  const engine = makeSandboxEngine({
    crm_account: [{ id: 'acc1', owner_id: 'rep1' }],
    crm_task: [],
  });
  await runHookBody(hook as never, {
    event: 'afterUpdate',
    input: { status: 'escalated', ...input },
    previous,
    user: { id: 'user_1' },
    engine,
  });
  const [task] = engine.inserted('crm_task');
  expect(task, 'no escalation task was inserted').toBeTruthy();
  return task!;
};

describe('escalation task subject — out of the lowered hook body', () => {
  it('names the case the way every other surface in the app names it', async () => {
    const task = await escalate(previousCase());
    expect(task.subject).toBe('Escalated: CASE-00039 · Login SSO failure after password reset');
  });

  it('keeps the record id out of the title and in the relationship', async () => {
    const task = await escalate(previousCase());
    expect(task.subject).not.toContain(CASE_ID);
    // The id is not lost — `related_to_case` is where a relationship belongs.
    expect(task.related_to_case).toBe(CASE_ID);
    expect(task.related_to_type).toBe('crm_case');
  });

  it('gives nine seeded escalations nine rows the agent can tell apart', async () => {
    // The reported symptom, restated as an assertion — and deliberately NOT as
    // "the nine subjects are distinct". Nine raw ids are nine distinct strings
    // too, so distinctness alone passes on the very code this file exists to
    // reject. What was missing is a discriminator the reader can MATCH against
    // the case pages, list views and breadcrumbs: the case number.
    for (let n = 31; n <= 39; n += 1) {
      const task = await escalate(previousCase({
        id: `id_${n}`,
        case_number: `CASE-000${n}`,
        subject: `Customer ${n} cannot sign in`,
      }));
      expect(task.subject).toBe(`Escalated: CASE-000${n} · Customer ${n} cannot sign in`);
      expect(task.subject).not.toContain(`id_${n}`);
    }
  });

  it('prefers a subject the same write is changing', async () => {
    const task = await escalate(previousCase(), { subject: 'Renamed in this very write' });
    expect(task.subject).toBe('Escalated: CASE-00039 · Renamed in this very write');
  });

  it('drops the separator rather than dangling it when a half is missing', async () => {
    const noSubject = await escalate(previousCase({ subject: '   ' }));
    expect(noSubject.subject).toBe('Escalated: CASE-00039');

    const noNumber = await escalate(previousCase({ case_number: undefined }));
    expect(noNumber.subject).toBe('Escalated: Login SSO failure after password reset');

    const neither = await escalate(previousCase({ case_number: undefined, subject: '' }));
    expect(neither.subject).toBe('Escalated case needs attention');
  });

  it('still creates the task, and still leads with the identifier, at maximum length', async () => {
    const task = await escalate(previousCase({ subject: 'S'.repeat(255) }));
    expect((task.subject as string).length).toBeLessThanOrEqual(255);
    expect(task.subject as string).toMatch(/^Escalated: CASE-00039 · S+…$/);
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
describe('the 255 cap, against a real ObjectQL', () => {
  const taskSubject = (objects.find((o) => o.name === 'crm_task')?.fields ?? {}).subject;

  const makeEngine = () =>
    ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_task: objects.find((o) => o.name === 'crm_task'),
      } as never,
    });

  let ql: Awaited<ReturnType<typeof makeEngine>>;
  let api: ReturnType<typeof ql.createContext>;

  beforeAll(async () => {
    ql = await makeEngine();
    api = ql.createContext({ isSystem: true, tenantId: 'org_1' } as never);
  });
  afterAll(async () => {
    await ql?.close();
  });

  it('is the length the shipped metadata declares', () => {
    expect(taskSubject?.maxLength).toBe(255);
  });

  it('accepts the capped subject the hook composes', async () => {
    const task = await escalate(previousCase({ subject: 'S'.repeat(255) }));
    // Pin the worst case, not just any case: a subject that came back SHORT
    // would make this insert succeed without ever exercising the cap.
    expect((task.subject as string).length).toBe(255);
    const row = await api.object('crm_task').insert({
      subject: task.subject, status: 'not_started', organization_id: 'org_1',
    });
    expect((row as Rec).id).toBeTruthy();
  });

  it('rejects the uncapped composition — which is why the cap exists', async () => {
    // Reverse verification. `async: true` + `onError: 'log'` means this
    // rejection would be swallowed: no escalation task, no error anyone sees.
    const uncapped = `Escalated: CASE-00039 · ${'S'.repeat(255)}`;
    expect(uncapped.length).toBeGreaterThan(255);
    await expect(
      api.object('crm_task').insert({
        subject: uncapped, status: 'not_started', organization_id: 'org_1',
      }),
    ).rejects.toThrow(/255/);
  });
});
