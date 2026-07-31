// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';
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
const action = (name: string): AnyRec => {
  const found = stackActions.find((a) => a.name === name);
  if (!found) throw new Error(`no ${name} action registered`);
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
    const stripped = { ...action('log_call'), body: { ...action('log_call').body, capabilities: [] } };
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
    log_call: {
      opts: { objectName: 'crm_case', record: { id: 'case_1', display_title: 'CASE-1' }, input: { subject: 'Intro call' } },
    },
    log_meeting: {
      opts: { objectName: 'crm_case', record: { id: 'case_1', display_title: 'CASE-1' }, input: { subject: 'Kickoff' } },
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
  };

  /** Asserted separately below, because it does not currently reach the engine. */
  const BROKEN = 'mass_update_stage';

  it('covers every action the runtime will sandbox', () => {
    expect(Object.keys(INVOCATIONS).sort()).toEqual(SCRIPT_ACTIONS.map((a) => a.name).sort());
  });

  it.each(SCRIPT_ACTIONS.map((a) => a.name).filter((n) => n !== BROKEN))('%s', async (name) => {
    const { opts, seed } = INVOCATIONS[name]!;
    const engine = makeSandboxEngine(seed ?? {});
    const { result } = await runActionBody(action(name), { ...opts, engine });
    expect(result, `${name} returned nothing`).toBeTruthy();
  });

  /**
   * The defect this executor was built to be able to find, recorded rather than
   * fixed: `mass_update_stage` calls `update(id, { stage })`, but `ctx.api` is
   * the engine repo facade, whose update takes `(data, options)` — so the id
   * lands in the `data` slot and the engine refuses the write (the same
   * rejection pinned against the real kernel at the top of this file). Every
   * invocation of this action fails, and nothing before this file could say so:
   * the metadata is valid, the body parses, and the action has no live
   * invocation path to fail on (#508, `src/actions/opportunity.actions.ts`).
   *
   * Fixing the body is a change to a shipped action and belongs to whoever
   * revives it — at which point this assertion is the thing that tells them the
   * behaviour moved.
   */
  it(`${BROKEN} is rejected by the engine — it passes an id where the facade wants a document`, async () => {
    const { opts, seed } = INVOCATIONS[BROKEN]!;
    const engine = makeSandboxEngine(seed ?? {});
    await expect(runActionBody(action(BROKEN), { ...opts, engine })).rejects.toThrow(
      /Update requires an ID or options\.multi=true/,
    );
    expect(engine.rows('crm_opportunity')[0]!.stage, 'the stage move silently landed').toBe('prospecting');
  });

  it('clone_opportunity copies the required fields onto a fresh prospecting deal', async () => {
    const engine = makeSandboxEngine();
    const { result } = await runActionBody(action('clone_opportunity'), { ...INVOCATIONS.clone_opportunity!.opts, engine });
    const [clone] = engine.inserted('crm_opportunity');
    expect(clone!.name).toBe('Copy of Acme Expansion');
    expect(clone!.crm_account).toBe('acc_1');
    expect(clone!.amount).toBe(50000);
    expect(clone!.stage).toBe('prospecting');
    expect(clone!.owner).toBe('usr_1');
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
