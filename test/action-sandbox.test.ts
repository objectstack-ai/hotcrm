// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';
import { ACTOR_NAME_RESOLUTION_SOURCE } from '../src/actions/global.actions';
import { allHooks } from '../src/hooks';
import { createLineItemPriceFill } from '../src/objects/_line-item-price-fill';
import oppLineItemHooks from '../src/objects/opportunity_line_item.hook';
import quoteLineItemHooks from '../src/objects/quote_line_item.hook';
import { hookNamed } from './helpers/hook-harness';
import {
  extractSandboxBody,
  makeSandboxEngine,
  runActionBody,
  runHookBody,
  type Rec,
  type SandboxEngine,
} from './helpers/action-sandbox';

/**
 * The action / hook SANDBOX guards (issue #575 A1).
 *
 * Everything else that executes app code in this suite executes it as ordinary
 * JavaScript: `hooks-runtime*.test.ts` calls `hook.handler(ctx)` with the
 * closure intact, and `global-actions.test.ts` runs the action bodies for what
 * they compute. That answers "is the logic right" and is structurally unable to
 * answer "does this survive the runtime", because the runtime does not run a
 * closure — it evaluates a lowered `body.source` string inside QuickJS, with no
 * module scope, a JSON-only boundary, a capability gate, and a `ctx.api` built
 * by the engine rather than by the author.
 *
 * This file is the missing half. It runs the real `QuickJSScriptRunner` through
 * the real body-runner factories (see `test/helpers/action-sandbox.ts`) and
 * pins the constraints that only exist there — starting with the one that has
 * so far lived only in a comment: the shared price-fill factory in
 * `src/objects/_line-item-price-fill.ts` is safe ONLY while its handler body
 * never reads a factory parameter.
 */

type AnyRec = Record<string, any>;

const stackActions: AnyRec[] = (stack as any).actions ?? [];

/**
 * An action's registry key — `<objectName>:<name>`, which is how the runtime
 * itself keys `registerAction` and how the dispatcher resolves a call.
 *
 * A bare name stopped identifying an action in #592: `log_call`, `log_meeting`
 * and `schedule_meeting` are registered once per sales object, so five distinct
 * bodies answer to "log_call". Keying on the name alone silently exercised
 * whichever one happened to be first in the array.
 */
const keyOf = (a: AnyRec): string => `${a.objectName ?? 'global'}:${a.name}`;

const action = (key: string): AnyRec => {
  const found = stackActions.find((a) => keyOf(a) === key)
    // A bare name still resolves, for the actions that are unique by name.
    ?? (stackActions.filter((a) => a.name === key).length === 1
      ? stackActions.find((a) => a.name === key)
      : undefined);
  if (!found) throw new Error(`no ${key} action registered (ambiguous or missing)`);
  return found;
};

/** Every action the runtime will execute as a sandboxed body. */
const SCRIPT_ACTIONS = stackActions.filter((a) => a.body?.language === 'js');

// ─────────────────────────── the stub engine's contract is the kernel's ──

/**
 * `makeSandboxEngine` stands in for ObjectQL, and a stand-in that accepts calls
 * the real engine rejects is worse than no test at all — it is the exact defect
 * `hook-harness.ts` documents in its `where`/`filter` note. So the two rules
 * the stub implements by hand are pinned here against a REAL ObjectQL on the
 * in-memory driver, the same way `hook-query-predicate.test.ts` pins the read
 * predicate.
 */
describe('the sandbox engine stub obeys the kernel’s update contract', () => {
  let ql: Awaited<ReturnType<typeof makeEngine>>;

  const makeEngine = () =>
    ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_opportunity: {
          name: 'crm_opportunity',
          fields: { id: { type: 'text' }, name: { type: 'text' }, stage: { type: 'text' } },
        },
      } as never,
    });

  beforeAll(async () => {
    ql = await makeEngine();
  });
  afterAll(async () => {
    await ql?.close();
  });

  /** A body doing exactly one write, so the engine call under test is unambiguous. */
  const writerAction = (source: string): AnyRec => ({
    name: 'sandbox_probe',
    objectName: 'crm_opportunity',
    type: 'script',
    body: { language: 'js', source, capabilities: ['api.write'], timeoutMs: 2000 },
  });

  it('rejects update(id, doc) — the id never reaches the engine', async () => {
    // The real kernel first. `ctx.api` in production is an ObjectRepository (or
    // the runtime's identical repo facade), whose update takes `(data, options)`
    // — so passing an id string as `data` leaves the engine with nothing to
    // resolve. v17 now rejects the second positional document as an unknown
    // option rather than risking a write to every row.
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_opportunity').insert({ name: 'A', stage: 'prospecting' });
    await expect(
      (api.object('crm_opportunity') as AnyRec).update(row.id, { stage: 'closed_won' }),
    ).rejects.toThrow(/does not recognise option 'stage'|Update requires an ID or options\.multi=true/);
    expect((await api.object('crm_opportunity').findOne({ where: { id: row.id } }))?.stage).toBe('prospecting');

    // Now the stub, reached the way a body reaches it: through the runtime's
    // own repo facade inside QuickJS.
    const engine = makeSandboxEngine({ crm_opportunity: [{ id: 'opp_1', stage: 'prospecting' }] });
    await expect(
      runActionBody(writerAction(`await ctx.api.object('crm_opportunity').update('opp_1', { stage: 'closed_won' });`), { engine }),
    ).rejects.toThrow(/does not recognise option 'stage'|Update requires an ID or options\.multi=true/);
    expect(engine.rows('crm_opportunity')[0]!.stage).toBe('prospecting');
  });

  it('applies update(data, { where }) — the spelling that works', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_opportunity').insert({ name: 'B', stage: 'prospecting' });
    await api.object('crm_opportunity').update({ id: row.id, stage: 'negotiation' }, { where: { id: row.id } });
    expect((await api.object('crm_opportunity').findOne({ where: { id: row.id } }))?.stage).toBe('negotiation');

    const engine = makeSandboxEngine({ crm_opportunity: [{ id: 'opp_1', stage: 'prospecting' }] });
    await runActionBody(
      writerAction(`await ctx.api.object('crm_opportunity').update({ id: 'opp_1', stage: 'negotiation' }, { where: { id: 'opp_1' } });`),
      { engine },
    );
    expect(engine.rows('crm_opportunity')[0]!.stage).toBe('negotiation');
  });
});

// ─────────────────────────────────── the sandbox boundary itself ──

describe('the sandbox boundary is real', () => {
  it('denies a capability the body did not declare', async () => {
    // `log_call` writes; stripping `api.write` must stop it at the call, not
    // let it through with a shrug. This is the check that makes every
    // `capabilities: [...]` list in `src/actions/` load-bearing metadata
    // rather than documentation.
    // Addressed by registry key: since #592 five objects each register their
    // own `log_call`, so a bare name no longer names one body.
    const logCall = action('crm_case:log_call');
    const stripped = { ...logCall, body: { ...logCall.body, capabilities: [] } };
    await expect(
      runActionBody(stripped, { objectName: 'crm_case', record: { id: 'case_1' }, input: { subject: 'x' } }),
    ).rejects.toThrow(/capability 'api\.write' not granted/);
  });

  it('gives the body no module scope at all', async () => {
    // Not a hypothetical: this is what a lowered body IS. The runner evaluates
    // the source string in a fresh VM, so any identifier that was a closure at
    // authoring time is simply absent.
    await expect(
      runActionBody({
        name: 'scope_probe',
        type: 'script',
        body: { language: 'js', source: 'return { v: someModuleConst };', capabilities: [], timeoutMs: 2000 },
      }),
    ).rejects.toThrow(/ReferenceError/);
  });

  it('hands the dispatcher’s params through as `input`, and no `ctx.object`', async () => {
    // Both dispatch paths in the runtime build `params: { ...params, recordId,
    // objectName }` and set no `object` key on the action context — so a body
    // that identifies its object via `ctx.object` alone reads undefined. The
    // activity actions read `input.objectName` because of this.
    const { result } = await runActionBody({
      name: 'ctx_probe',
      type: 'script',
      body: {
        language: 'js',
        source: 'return { fromInput: input.objectName ?? null, fromCtx: ctx.object ?? null, recordId: ctx.recordId ?? null };',
        capabilities: [],
        timeoutMs: 2000,
      },
    }, { objectName: 'crm_case', record: { id: 'case_1' } });
    expect(result).toEqual({ fromInput: 'crm_case', fromCtx: null, recordId: 'case_1' });
  });
});

// ────────────────────────────── every shipped action body, executed ──

describe('every script action body executes under QuickJS', () => {
  /**
   * One invocation per action, shaped the way its own doc comment says it is
   * dispatched. The bar is deliberately the runtime's: a body that references a
   * missing identifier, uses a construct the sandbox forbids, or calls the
   * engine with an argument shape it rejects fails here — none of which
   * `os validate`, `build`, or a metadata assertion can see.
   */
  const INVOCATIONS: Record<string, { opts: Parameters<typeof runActionBody>[1]; seed?: Record<string, Rec[]> }> = {
    clone_opportunity: {
      opts: {
        objectName: 'crm_opportunity',
        record: { id: 'opp_1', name: 'Acme Expansion', crm_account: 'acc_1', amount: 50000, primary_contact: 'con_1' },
      },
    },
    create_campaign: {
      opts: { objectName: 'crm_lead', record: { id: 'lead_1' }, input: { crm_campaign: 'cmp_1' } },
    },
    // The contact-side mirror of `create_campaign` (#597) — the writer that
    // finally populates `crm_campaign_member.crm_contact`.
    add_contact_to_campaign: {
      opts: { objectName: 'crm_contact', record: { id: 'con_1' }, input: { crm_campaign: 'cmp_1' } },
    },
    // The `responded` status's writer (#597). Seeded with the member it stamps,
    // so the body's update resolves a real row.
    mark_responded: {
      opts: { objectName: 'crm_campaign_member', record: { id: 'cm_1' } },
      seed: { crm_campaign_member: [{ id: 'cm_1', crm_campaign: 'cmp_1', crm_lead: 'lead_1', status: 'sent' }] },
    },
    mark_primary: {
      opts: { objectName: 'crm_contact', record: { id: 'con_1' } },
      seed: { crm_contact: [{ id: 'con_1', is_primary: false }] },
    },
    send_email: {
      opts: {
        objectName: 'crm_contact',
        record: { id: 'con_1', email: 'ada@example.com', full_name: 'Ada Lovelace' },
        input: { subject: 'Hello', body: 'Body text' },
      },
    },
    mass_update_stage: {
      opts: { objectName: 'crm_opportunity', record: { id: 'opp_1' }, input: { stage: 'negotiation' } },
      seed: { crm_opportunity: [{ id: 'opp_1', stage: 'prospecting' }] },
    },
    // The knowledge-article counters' writers (#601). Both bodies INSERT a
    // `crm_article_feedback` row rather than touching the article — the article
    // is `public_read` (write-owned) and a sandboxed body carries no caller
    // identity, so an update would be refused. Invoked with a real `user`
    // because the voter's id is what keys the one-vote-per-reader index; the
    // seeded article is what the body reads first.
    mark_article_helpful: {
      opts: { objectName: 'crm_knowledge_article', record: { id: 'ka_1' }, user: { id: 'usr_1' } },
      seed: { crm_knowledge_article: [{ id: 'ka_1', status: 'published', audience: 'public' }] },
    },
    mark_article_not_helpful: {
      opts: { objectName: 'crm_knowledge_article', record: { id: 'ka_1' }, user: { id: 'usr_1' } },
      seed: { crm_knowledge_article: [{ id: 'ka_1', status: 'published', audience: 'public' }] },
    },
    // The activity family (#592): the same three bodies, generated once per
    // sales object. Each is invoked against ITS OWN object with that object's
    // declared nameField in the record, because the body carries the resolved
    // field name — a body dispatched against the wrong object would stamp a
    // null label and nothing else would notice.
    ...Object.fromEntries(
      ([
        ['crm_lead', { id: 'lead_1', full_name: 'Ada Lovelace' }],
        ['crm_contact', { id: 'con_1', full_name: 'Ada Lovelace' }],
        ['crm_account', { id: 'acc_1', display_title: 'ACC-1 - Acme' }],
        ['crm_opportunity', { id: 'opp_1', name: 'Acme Expansion' }],
        ['crm_case', { id: 'case_1', display_title: 'CASE-1' }],
      ] as Array<[string, Rec]>).flatMap(([objectName, record]) => [
        [`${objectName}:log_call`, { opts: { objectName, record, input: { subject: 'Intro call', duration: 15 } } }],
        [`${objectName}:log_meeting`, { opts: { objectName, record, input: { subject: 'Kickoff' } } }],
        [`${objectName}:schedule_meeting`, {
          opts: {
            objectName,
            record,
            input: { subject: 'Deep dive', start_date: '2026-09-01', start_time: '09:00', duration: 60, location: 'Zoom' },
          },
        }],
      ]),
    ),
  };

  it('covers every action the runtime will sandbox', () => {
    // Keyed the way the runtime keys its own registry, so fifteen distinct
    // activity bodies are fifteen distinct cases rather than three.
    const covered = new Set(Object.keys(INVOCATIONS));
    const uncovered = SCRIPT_ACTIONS
      .filter((a) => !covered.has(keyOf(a)) && !covered.has(a.name))
      .map(keyOf);
    expect(uncovered, `script bodies nothing executes:\n  ${uncovered.join('\n  ')}`).toEqual([]);
    const stale = [...covered].filter(
      (k) => !SCRIPT_ACTIONS.some((a) => keyOf(a) === k || a.name === k),
    );
    expect(stale, `INVOCATIONS names actions that no longer exist:\n  ${stale.join('\n  ')}`).toEqual([]);
  });

  it.each(SCRIPT_ACTIONS.map(keyOf))('%s', async (key) => {
    const { opts, seed } = (INVOCATIONS[key] ?? INVOCATIONS[key.split(':')[1]!])!;
    const engine = makeSandboxEngine(seed ?? {});
    const { result } = await runActionBody(action(key), { ...opts, engine });
    expect(result, `${key} returned nothing`).toBeTruthy();
  });

  /**
   * `mass_update_stage` — the defect this executor was built to be able to
   * find, now fixed and pinned the other way round (#508, CRM half).
   *
   * The body used to call `update(id, { stage })`, but `ctx.api` is the engine
   * repo facade, whose update takes `(data, options)` — so the id landed in the
   * `data` slot and the engine refused the write. Live, that was an HTTP 400 on
   * every single-row dispatch: `update('crm_opportunity') does not recognise
   * option 'stage'`. The rejection ITSELF is still pinned, action-independently,
   * at the top of this file (`rejects update(id, doc)`), against both the real
   * kernel and the stub — so nothing here has to re-prove that the wrong
   * spelling is wrong. What these three assert is the shipped body: the call it
   * makes, and the row that moves because of it.
   *
   * Reverting the body to `update(id, { … })` turns all three red, plus the
   * `it.each` case above, which now covers this action like any other.
   *
   * The MULTI-record leg is live as of #508: the opportunity list declares
   * `bulkActionDefs: [{ name: 'mass_update_stage', operation: 'custom',
   * execution: 'aggregate' }]`, and the renderer delivers the whole selection
   * in the builtin `params._selectedIds` — which a script body reads as
   * `input._selectedIds`, because `input` IS the params bag. The underscore is
   * the entire reason this looked undeliverable for two release candidates
   * (objectstack-ai/objectstack#5568, closed works-as-declared). The two legs
   * below execute that shape against a real kernel.
   */
  describe('mass_update_stage writes the stage it was given (#508, CRM half)', () => {
    const MASS_UPDATE = 'crm_opportunity:mass_update_stage';

    /**
     * A real ObjectQL, handed to the body runner in the `engine` slot.
     *
     * `runActionBody` passes `engine.engine` through as the runner factory's
     * `ql`, and `buildSandboxApi` wraps whatever it gets in the very same
     * `buildEngineRepoFacade` production builds: an ObjectQL instance exposes
     * no `.object()`, and this harness supplies no `executionContext`, so both
     * of the earlier branches are skipped. What the body meets here is
     * therefore the production facade over the production kernel — only the
     * `SandboxEngine` recorder side is missing, which this leg does not use.
     */
    const asBodyEngine = (kernel: unknown): SandboxEngine =>
      ({ engine: kernel } as unknown as SandboxEngine);

    const makeKernel = () =>
      ObjectQL.create({
        datasources: { default: new InMemoryDriver({ persistence: false }) },
        objects: {
          crm_opportunity: {
            name: 'crm_opportunity',
            fields: { id: { type: 'text' }, name: { type: 'text' }, stage: { type: 'text' } },
          },
        } as never,
      });

    let ql: Awaited<ReturnType<typeof makeKernel>>;

    beforeAll(async () => {
      ql = await makeKernel();
    });
    afterAll(async () => {
      await ql?.close();
    });

    it('calls the facade with (data, options) — and the stub row moves', async () => {
      const engine = makeSandboxEngine({ crm_opportunity: [{ id: 'opp_1', stage: 'qualification' }] });
      const { result } = await runActionBody(action(MASS_UPDATE), {
        objectName: 'crm_opportunity',
        record: { id: 'opp_1' },
        input: { stage: 'needs_analysis' },
        engine,
      });
      const [call] = engine.callsFor('crm_opportunity', 'update');
      // The document in the `data` slot, the predicate in `options` — the id is
      // never a positional argument.
      expect(call!.args[0]).toEqual({ id: 'opp_1', stage: 'needs_analysis' });
      expect(call!.args[1]).toEqual({ where: { id: 'opp_1' } });
      expect(engine.rows('crm_opportunity')[0]!.stage).toBe('needs_analysis');
      expect(result).toEqual({ stage: 'needs_analysis', updated: 1 });
    });

    it('moves the STORED stage on a real kernel — the single-row path end to end', async () => {
      // The exact live 400 from the rc.2 acceptance run: a `qualification` deal
      // dispatched single-row to `needs_analysis`, which never applied.
      const api = ql.createContext({ isSystem: true });
      const row = await api.object('crm_opportunity').insert({
        name: 'Acme Expansion',
        stage: 'qualification',
      });

      const { result } = await runActionBody(action(MASS_UPDATE), {
        objectName: 'crm_opportunity',
        record: { id: row.id },
        input: { stage: 'needs_analysis' },
        engine: asBodyEngine(ql),
      });

      expect(result).toEqual({ stage: 'needs_analysis', updated: 1 });
      // Read back from the driver, not from the body's return value: the return
      // value was always honest about what the body INTENDED.
      const stored = await api.object('crm_opportunity').findOne({ where: { id: row.id } });
      expect(stored?.stage, 'the stage move never reached the store').toBe('needs_analysis');
    });

    it('moves every STORED row of an aggregate selection — the multi-row path end to end', async () => {
      const api = ql.createContext({ isSystem: true });
      const a = await api.object('crm_opportunity').insert({ name: 'Deal A', stage: 'prospecting' });
      const b = await api.object('crm_opportunity').insert({ name: 'Deal B', stage: 'proposal' });

      const { result } = await runActionBody(action(MASS_UPDATE), {
        objectName: 'crm_opportunity',
        // No `record`: an aggregate dispatch carries NO recordId — the whole
        // selection arrives under the builtin `_selectedIds` instead. This is
        // the shape the grid renderer POSTs, underscore included.
        input: { stage: 'negotiation', _selectedIds: [a.id, b.id] },
        engine: asBodyEngine(ql),
      });

      expect(result).toEqual({ stage: 'negotiation', updated: 2 });
      // Read back from the driver: `updated: 2` is the body's own count, and
      // the point of this leg is that two rows really moved in the store.
      for (const id of [a.id, b.id]) {
        const stored = await api.object('crm_opportunity').findOne({ where: { id } });
        expect(stored?.stage).toBe('negotiation');
      }
    });

    it('rejects an aggregate run it cannot cover, instead of counting the miss', async () => {
      // All-or-nothing (objectui#3139): the selection bar offers no per-row
      // retry, so a handler that covers only part of the selection must reject
      // rather than return a success the bar will toast.
      //
      // The trap this pins is specific and silent: an id matching no row does
      // NOT make the engine throw — `update` RESOLVES WITH NULL. A body that
      // counted iterations instead of returned rows would answer `updated: 2`
      // for one write, which is exactly the "success toast, nothing written"
      // failure #588 pulled this button off the list for.
      const api = ql.createContext({ isSystem: true });
      const live = await api.object('crm_opportunity').insert({ name: 'Deal C', stage: 'prospecting' });
      const stale = 'opp_deleted_between_select_and_submit';

      await expect(
        runActionBody(action(MASS_UPDATE), {
          objectName: 'crm_opportunity',
          input: { stage: 'negotiation', _selectedIds: [live.id, stale] },
          engine: asBodyEngine(ql),
        }),
      ).rejects.toThrow(/1 of 2 selected opportunities could not be updated/);

      // And the honest half of "all-or-nothing without a transaction": the row
      // that WAS written keeps its new stage. The body says so in its error and
      // in its comment; re-running the action is the retry, which is safe
      // because setting a stage is idempotent.
      const stored = await api.object('crm_opportunity').findOne({ where: { id: live.id } });
      expect(stored?.stage).toBe('negotiation');
    });
  });

  it('clone_opportunity copies the required fields onto a fresh prospecting deal', async () => {
    const engine = makeSandboxEngine();
    const { result } = await runActionBody(action('clone_opportunity'), { ...INVOCATIONS.clone_opportunity!.opts, engine });
    const [clone] = engine.inserted('crm_opportunity');
    expect(clone!.name).toBe('Copy of Acme Expansion');
    expect(clone!.crm_account).toBe('acc_1');
    expect(clone!.amount).toBe(50000);
    expect(clone!.stage).toBe('prospecting');
    expect(clone!.owner_id).toBe('usr_1');
    // A 90-day horizon computed INSIDE the VM — `Date` is one of the few host
    // globals a body may rely on, and this proves it is really there.
    expect(clone!.close_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(clone!.close_date).getTime()).toBeGreaterThan(Date.now());
    // The id comes back from the engine, so it is only ever on the stored row —
    // never on the document the body sent.
    expect(result.id).toBe(engine.rows('crm_opportunity')[0]!.id);
  });

  it('mark_primary calls update with the engine facade’s (data, options) shape', async () => {
    const engine = makeSandboxEngine({ crm_contact: [{ id: 'con_1', is_primary: false }] });
    await runActionBody(action('mark_primary'), { objectName: 'crm_contact', record: { id: 'con_1' }, engine });
    const [call] = engine.callsFor('crm_contact', 'update');
    expect(call!.args[0]).toEqual({ id: 'con_1', is_primary: true });
    expect(call!.args[1]).toEqual({ where: { id: 'con_1' } });
    expect(engine.rows('crm_contact')[0]!.is_primary).toBe(true);
  });

  /**
   * The behaviour pin for #813's lead half — deliberately a NON-regression
   * nail, not a change detector.
   *
   * The dead `input.selectedIds` limb removed there was unreachable, so this
   * body's observable behaviour is identical before and after: the old code
   * evaluated an empty selection and fell through to the same `ctx.recordId`
   * path. Restoring the limb therefore leaves this test GREEN, and that is the
   * point being pinned: behaviour unchanged. What the limb's removal could have
   * broken is the fan-out path itself, and nothing else asserted that a
   * dispatch carrying only a recordId actually WRITES a membership row: the
   * `it.each` smoke case above only checks the body returns something, and the
   * dedupe case below asserts a row is NOT written. The change-detecting half
   * lives in `test/bulk-action-dispatch.test.ts`, which goes red if the
   * no-underscore read (or an aggregate wiring the body cannot serve) returns.
   */
  it('create_campaign enrols the dispatched lead from ctx.recordId alone', async () => {
    // The per-record fan-out shape exactly: `bulkActions: ['create_campaign']`
    // dispatches once per selected row with that row's recordId and NO
    // selection array, so the params bag holds the campaign param only.
    const engine = makeSandboxEngine();
    const { result } = await runActionBody(action('create_campaign'), {
      objectName: 'crm_lead',
      record: { id: 'lead_7' },
      input: { crm_campaign: 'cmp_1' },
      engine,
    });

    expect(result).toMatchObject({ campaignId: 'cmp_1', count: 1, skipped: 0 });
    const members = engine.rows('crm_campaign_member');
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ crm_campaign: 'cmp_1', crm_lead: 'lead_7', status: 'sent' });
  });

  /**
   * The contact side of the same fan-out (#597).
   *
   * `crm_campaign_member.crm_contact` was a lookup no writer populated, so a
   * campaign could only ever reach leads. This body is the manual half of the
   * fix (the enrollment flow is the bulk half), and it is asserted in the
   * sandbox rather than against the handler because a `script` action's body is
   * what the runtime actually evaluates.
   */
  it('add_contact_to_campaign enrols the dispatched contact, keeping crm_lead null', async () => {
    const engine = makeSandboxEngine();
    const { result } = await runActionBody(action('add_contact_to_campaign'), {
      objectName: 'crm_contact',
      record: { id: 'con_7' },
      input: { crm_campaign: 'cmp_1' },
      engine,
    });

    expect(result).toMatchObject({ campaignId: 'cmp_1', count: 1, skipped: 0 });
    const members = engine.rows('crm_campaign_member');
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ crm_campaign: 'cmp_1', crm_contact: 'con_7', status: 'sent' });
    expect(members[0].crm_lead, 'a contact member must not also claim a lead').toBeUndefined();
  });

  it('add_contact_to_campaign skips a contact already on the campaign', async () => {
    const engine = makeSandboxEngine({
      crm_campaign_member: [{ id: 'cm_x', crm_campaign: 'cmp_1', crm_contact: 'con_7', status: 'sent' }],
    });
    const { result } = await runActionBody(action('add_contact_to_campaign'), {
      objectName: 'crm_contact',
      record: { id: 'con_7' },
      input: { crm_campaign: 'cmp_1' },
      engine,
    });
    expect(result).toMatchObject({ count: 0, skipped: 1 });
    expect(engine.rows('crm_campaign_member')).toHaveLength(1);
  });

  /**
   * `mark_responded` is the only writer of the `responded` status, and it
   * stamps all three response fields together rather than leaving two of them
   * for `campaign_member_lifecycle` to back-fill — a member that reads
   * "Responded / Has Responded: false" for the length of a hook dispatch is a
   * shape the detail page can render.
   */
  it('mark_responded stamps status, has_responded and response_date together', async () => {
    const engine = makeSandboxEngine({
      crm_campaign_member: [{ id: 'cm_9', crm_campaign: 'cmp_1', crm_lead: 'lead_1', status: 'sent' }],
    });
    const { result } = await runActionBody(action('mark_responded'), {
      objectName: 'crm_campaign_member',
      record: { id: 'cm_9', status: 'sent' },
      engine,
    });
    expect(result).toMatchObject({ id: 'cm_9', status: 'responded' });
    const [member] = engine.rows('crm_campaign_member');
    expect(member.status).toBe('responded');
    expect(member.has_responded).toBe(true);
    expect(typeof member.response_date).toBe('string');
  });

  it('create_campaign skips a lead already enrolled on the campaign', async () => {
    const engine = makeSandboxEngine({
      crm_campaign_member: [{ id: 'cm_1', crm_campaign: 'cmp_1', crm_lead: 'lead_1' }],
    });
    const { result } = await runActionBody(action('create_campaign'), {
      objectName: 'crm_lead',
      record: { id: 'lead_1' },
      input: { crm_campaign: 'cmp_1' },
      engine,
    });
    expect(result).toMatchObject({ campaignId: 'cmp_1', count: 0, skipped: 1 });
    expect(engine.callsFor('crm_campaign_member', 'insert')).toHaveLength(0);
  });

  it('send_email writes the email and its timeline pointer', async () => {
    const engine = makeSandboxEngine();
    const { result } = await runActionBody(action('send_email'), { ...INVOCATIONS.send_email!.opts, engine });
    const [email] = engine.rows('sys_email');
    const [activity] = engine.rows('sys_activity');
    expect(email!.to_addresses).toBe('ada@example.com');
    expect(email!.status).toBe('queued');
    expect(activity!.source_object).toBe('sys_email');
    // The pointer is the id the FIRST insert returned — so this also proves the
    // body's two awaits really sequenced across the VM boundary.
    expect(activity!.source_id).toBe(email!.id);
    expect(activity!.record_label).toBe('Ada Lovelace');
    expect(result).toEqual({ emailId: email!.id, activityId: activity!.id });
  });
});

// ─────────────── send_email's actor is a name, not a raw user id (#678) ──

/**
 * The twin of #673, on the same `sys_activity.actor_name` column.
 *
 * `send_email` stamped `actor_name: ctx.user?.name ?? null`, and on the
 * dispatch path the Console uses that key is not a display name: the REST
 * action dispatcher builds the body's user as `{ id: ec.userId, name: ec.userId,
 * … }` (`@objectstack/runtime` 17.0.0-rc.2, `dist/index.js:5397`), so the key is
 * PRESENT and carries the id — a plausible-looking string no `??` could catch.
 * Every logged email on a contact's timeline therefore showed a 32-character id
 * where the sender's name belongs.
 *
 * These run the REAL dispatcher user shape (`name === id`), which is why the
 * existing `send_email` guard above stayed green through the whole bug: the
 * harness default is `{ id: 'usr_1', name: 'Ada Lovelace' }`, a shape REST never
 * produces.
 */
const REST_USER_ID = 'grDEyLoIgnunJ2M7Y2muLgcuQbDUT0s2';

/** The user object the REST action dispatcher hands a body, verbatim. */
const restUser = (id: string = REST_USER_ID): Rec => ({
  id,
  name: id,
  email: 'admin@objectos.ai',
  roles: [],
  positions: [],
  permissions: [],
});

const sendEmailOpts = {
  objectName: 'crm_contact',
  record: { id: 'con_1', email: 'ada@example.com', full_name: 'Ada Lovelace' },
  input: { subject: 'Hello', body: 'Body text' },
};

describe('send_email writes a human-readable sys_activity.actor_name (#678)', () => {
  it('resolves the display name from sys_user instead of stamping the id', async () => {
    const engine = makeSandboxEngine({
      sys_user: [{ id: REST_USER_ID, name: 'Dev Admin', email: 'admin@objectos.ai' }],
    });
    await runActionBody(action('send_email'), { ...sendEmailOpts, user: restUser(), engine });
    const [activity] = engine.inserted('sys_activity') as Rec[];
    expect(activity!.actor_id).toBe(REST_USER_ID);
    expect(activity!.actor_name).toBe('Dev Admin');
    // The regression itself, as its own assertion: whatever else changes, the
    // contact timeline must never render the opaque id again.
    expect(activity!.actor_name).not.toBe(REST_USER_ID);
  });

  it('reads sys_user once — and only because the dispatcher delivered no name', async () => {
    const engine = makeSandboxEngine({
      sys_user: [{ id: REST_USER_ID, name: 'Dev Admin', email: 'admin@objectos.ai' }],
    });
    await runActionBody(action('send_email'), { ...sendEmailOpts, user: restUser(), engine });
    expect(engine.callsFor('sys_user', 'find')).toHaveLength(1);

    // A dispatcher that DOES deliver a display name is believed as-is: the
    // lookup is a workaround and has to retire itself the day the platform
    // starts honouring `ctx.user.name` (objectstack-ai/objectstack#5372).
    const delivered = makeSandboxEngine();
    await runActionBody(action('send_email'), {
      ...sendEmailOpts,
      user: { id: 'usr_1', name: 'Ada Lovelace' },
      engine: delivered,
    });
    expect(delivered.callsFor('sys_user', 'find')).toHaveLength(0);
    expect((delivered.inserted('sys_activity')[0] as Rec).actor_name).toBe('Ada Lovelace');
  });

  it('falls back to the id rather than writing a blank actor', async () => {
    // No `sys_user` row for the sender — a deleted user, or a read this context
    // is not allowed to satisfy. An opaque id is bad; an activity whose actor is
    // `null` is worse, because it is not attributable at all.
    const engine = makeSandboxEngine();
    await runActionBody(action('send_email'), { ...sendEmailOpts, user: restUser(), engine });
    const [activity] = engine.inserted('sys_activity') as Rec[];
    expect(activity!.actor_name).toBe(REST_USER_ID);
    expect(activity!.actor_name).not.toBeNull();
  });

  it('never fails the send when the sys_user read throws', async () => {
    const sandbox = makeSandboxEngine();
    const passThrough = sandbox.engine.find;
    sandbox.engine.find = async (object: string, options: Rec = {}) => {
      if (object === 'sys_user') throw new Error('FORBIDDEN: no read access to sys_user');
      return passThrough(object, options);
    };
    const { result } = await runActionBody(action('send_email'), {
      ...sendEmailOpts,
      user: restUser(),
      engine: sandbox,
    });
    // The email the rep just sent outranks the label on its timeline row.
    expect(result.emailId).toBeTruthy();
    expect(result.activityId).toBeTruthy();
    expect((sandbox.inserted('sys_activity')[0] as Rec).actor_name).toBe(REST_USER_ID);
  });

  /**
   * The anti-drift guard the acceptance criterion asks for.
   *
   * The resolution is shared as body SOURCE TEXT
   * (`ACTOR_NAME_RESOLUTION_SOURCE`), spliced into both bodies at authoring
   * time, because a body runs body-only inside QuickJS and cannot call an
   * imported helper. Sharing a string is only as good as the guarantee that
   * both sites still splice it — re-inlining a "small local tweak" in one body
   * is exactly how #673's fix failed to reach #678's call site in the first
   * place.
   */
  it('every actor_name writer splices the SAME resolution block', () => {
    const writers = stackActions.filter((a) =>
      String(a.body?.source ?? '').includes('actor_name:'),
    );
    // `send_email` plus the fifteen generated activity bodies.
    expect(writers.map(keyOf).sort()).toContain('crm_contact:send_email');
    expect(writers.length).toBeGreaterThan(1);

    const divergent = writers
      .filter((a) => !String(a.body.source).includes(ACTOR_NAME_RESOLUTION_SOURCE))
      .map(keyOf);
    expect(
      divergent,
      'these bodies write sys_activity.actor_name without the shared resolution ' +
        `block — a second copy is a second thing to forget (#673 / #678):\n  ${divergent.join('\n  ')}`,
    ).toEqual([]);

    // And nobody stamps the raw `ctx.user.name` beside it, which is the exact
    // expression both defects were. Comment lines are excluded on purpose: the
    // shared block QUOTES that expression in its own retirement note, and a
    // guard that cannot tell code from prose would fire on the fix.
    const raw = writers.filter((a) =>
      String(a.body.source)
        .split('\n')
        .some((line) => !line.trim().startsWith('//') && /actor_name:\s*ctx\.user/.test(line)),
    );
    expect(raw.map(keyOf), 'actor_name is being stamped from ctx.user again').toEqual([]);
  });
});

// ──────────────────── the constraint the shared price-fill factory rests on ──

describe('the shared line-item price fill stays shippable body-only', () => {
  const HOOKS = [
    { label: 'opportunity', hook: hookNamed(oppLineItemHooks, 'opportunity_line_item_price_fill') },
    { label: 'quote', hook: hookNamed(quoteLineItemHooks, 'quote_line_item_price_fill') },
  ];

  /**
   * The factory's doc comment says the sharing is safe because it happens at
   * AUTHORING time — `objectName` / `hookName` end up as plain metadata and the
   * handler body closes over nothing but its own `ctx`. Until now that was an
   * assertion in a comment. `extractSandboxBody` is the CLI build's own
   * lowering pass, and it throws when the handler references an identifier that
   * will not exist at runtime, so calling it IS the check.
   *
   * Note what the build does with that throw: it catches it and silently keeps
   * the handler in its bundled form. Nothing goes red, the app keeps working
   * locally, and the only thing lost is the metadata-only body — the form that
   * deploys. That is why this has to be asserted here instead of relying on the
   * build to complain.
   */
  it.each(HOOKS)('$label lowers to a body with no free identifiers', ({ hook }) => {
    expect(() => extractSandboxBody(hook.handler, `hook '${hook.name}'`)).not.toThrow();
  });

  it('lowers to the same source and the same inferred capabilities on both objects', () => {
    const [opp, quote] = HOOKS.map(({ hook }) => extractSandboxBody(hook.handler, `hook '${hook.name}'`));
    expect(quote!.source).toBe(opp!.source);
    // Inferred from the `findOne` the body performs — and `api.write` is
    // correctly absent: the hook mutates `ctx.input`, it does not write.
    expect(opp!.capabilities).toEqual(['api.read']);
  });

  it.each(HOOKS)('$label stamps list_price and defaults unit_price on insert, in the VM', async ({ hook }) => {
    const engine = makeSandboxEngine({ crm_product: [{ id: 'p1', list_price: 250 }] });
    const { input } = await runHookBody(hook, {
      event: 'beforeInsert',
      input: { crm_product: 'p1' },
      engine,
    });
    expect(input.list_price).toBe(250);
    expect(input.unit_price).toBe(250);
  });

  it.each(HOOKS)('$label re-syncs list_price but never clobbers a negotiated unit_price', async ({ hook }) => {
    const engine = makeSandboxEngine({ crm_product: [{ id: 'p1', list_price: 250 }] });
    const { input } = await runHookBody(hook, {
      event: 'beforeUpdate',
      input: { crm_product: 'p1', unit_price: 199 },
      engine,
    });
    expect(input.list_price).toBe(250);
    expect(input.unit_price).toBe(199);
  });

  it.each(HOOKS)('$label is a no-op when no product is part of the write', async ({ hook }) => {
    const engine = makeSandboxEngine({ crm_product: [{ id: 'p1', list_price: 250 }] });
    const { input } = await runHookBody(hook, { event: 'beforeInsert', input: { quantity: 2 }, engine });
    expect(input.list_price).toBeUndefined();
    expect(engine.calls).toHaveLength(0);
  });

  /**
   * The negative control. Without it the guard above is just "the current code
   * passes"; with it we know the check can still fail.
   */
  it('rejects a factory whose handler reads a factory parameter', () => {
    const leaky = createLeakyPriceFill('crm_quote_line_item', 'leaky_price_fill');
    expect(() => extractSandboxBody(leaky.handler, `hook '${leaky.name}'`)).toThrow(/objectName/);
    // And the real factory is the same shape apart from that one read, so the
    // guard is discriminating rather than allergic to factories in general.
    const real = createLineItemPriceFill('crm_quote_line_item', 'quote_line_item_price_fill');
    expect(() => extractSandboxBody(real.handler, `hook '${real.name}'`)).not.toThrow();
  });

  it('is a ReferenceError in the VM if such a body ever ships', async () => {
    // Extraction is the first line of defence, not the only outcome that
    // matters: it declines to report free identifiers when it cannot parse the
    // handler, in which case a body like this one ships and the failure moves
    // to runtime — on a write, in production. This is what that looks like.
    await expect(
      runHookBody(HOOKS[0]!.hook, {
        event: 'beforeInsert',
        input: { crm_product: 'p1' },
        source: 'ctx.input.stamped_object = objectName;',
      }),
    ).rejects.toThrow(/ReferenceError/);
  });
});

describe('every registered hook still lowers to a metadata-only body', () => {
  /**
   * The generalisation of the guard above. `objectstack build` reports this —
   * "Skipping legacy runtime bundle (all 24 callables are body-only)" — but it
   * reports the opposite just as quietly: a hook that stops lowering is caught,
   * bundled into `objectstack-runtime.{hash}.mjs`, and the build still passes.
   * The artifact silently grows a second delivery mechanism and the hook stops
   * being deployable as pure metadata.
   *
   * A hook that genuinely needs a closure is allowed to exist — but it should
   * arrive as a deliberate change to this list, not as a build line nobody read.
   */
  it.each(allHooks.map((h) => h.name))('%s', (name) => {
    const hook = allHooks.find((h) => h.name === name)!;
    expect(() => extractSandboxBody(hook.handler, `hook '${name}'`)).not.toThrow();
  });
});

/**
 * The territory derivation, executed in the VM rather than as a closure
 * (#621 the projection, #639 the classification).
 *
 * `crm_account.territory` is what the two territory sharing rules filter on,
 * `billing_country` is the value it is classified from, and
 * `account_protection` is the only writer of both.
 * `hooks-runtime-sales.test.ts` proves the logic by calling the handler
 * directly — which cannot see the one failure mode that matters here: the
 * derivation is written INLINE (no module-scope helper) precisely so the
 * handler still lowers to a metadata-only body, and a body is what the runtime
 * actually evaluates. If a future edit factors it back out into a helper, the
 * guard above turns red; if the inlined code uses something the sandbox does
 * not provide, only this does.
 *
 * That inline-ness is exactly why the country mapping has to be duplicated
 * between `src/objects/_territory.ts` and this handler — a sandboxed body has
 * no module scope to import it from. The duplication is not trusted:
 * `test/territory-single-source.test.ts` parses the table back out of the
 * lowered body and asserts it equals the module's, and drives every declared
 * spelling through this same VM.
 */
describe('account_protection derives billing_country and territory inside the sandbox', () => {
  const hook = hookNamed(allHooks.find((h) => h.name === 'account_protection'), 'account_protection');

  it('normalises the address country onto billing_country and classifies it', async () => {
    const { input } = await runHookBody(hook, {
      event: 'beforeInsert',
      input: { name: 'Acme', billing_address: { street: '1 Main', country: ' de ' } },
    });
    expect(input.billing_country).toBe('DE');
    expect(input.territory).toBe('emea');
  });

  it('classifies a full country name the old free-text match would have dropped', async () => {
    // The #639 defect in one case: `United States` used to belong to no
    // territory at all, silently. Run here rather than only as a closure
    // because a regex is one of the shapes QuickJS could plausibly differ on.
    const { input } = await runHookBody(hook, {
      event: 'beforeInsert',
      input: { name: 'Acme', billing_address: { country: 'United  States' } },
    });
    expect(input.billing_country).toBe('UNITED STATES');
    expect(input.territory).toBe('na');
  });

  it('yields null for an address carrying no country, and a stated `other`', async () => {
    const { input } = await runHookBody(hook, {
      event: 'beforeInsert',
      input: { name: 'Acme', billing_address: { city: 'Austin' } },
    });
    expect(input.billing_country).toBeNull();
    expect(input.territory).toBe('other');
  });

  it('leaves both derived columns untouched when the write omits the address', async () => {
    const { input } = await runHookBody(hook, {
      event: 'beforeUpdate',
      input: { phone: '+1-512-555-0100' },
      previous: { billing_country: 'US', territory: 'na' },
    });
    expect('billing_country' in input).toBe(false);
    expect('territory' in input).toBe(false);
  });
});

/**
 * A price fill written the way the factory's doc comment forbids: the handler
 * reads `objectName`, which is a closure here and nothing at all once the body
 * is lowered. Kept next to the test that rejects it so the forbidden shape is
 * legible rather than described.
 */
function createLeakyPriceFill(objectName: string, hookName: string): AnyRec {
  return {
    name: hookName,
    object: objectName,
    events: ['beforeInsert'],
    handler: async (ctx: AnyRec) => {
      ctx.input.stamped_object = objectName;
    },
  };
}
