// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { wrapDeclarativeHook } from '@objectstack/objectql';
import caseHooks from '../src/objects/case.hook';
import { makeCtx, makeHarness, engineFlatInput, hookNamed, type Rec } from './helpers/hook-harness';

/**
 * The instrument that certifies this app's fast hook harness hands a handler
 * the SHAPE THE ENGINE HANDS IT (#1295).
 *
 * ### Why this file exists
 *
 * `test/helpers/hook-harness.ts` used to pass `ctx.input` as a plain object.
 * The engine passes `{ data, options }` behind a flat-record Proxy
 * (`installFlatInput`, `@objectstack/objectql` `src/hook-wrappers.ts`). Reads
 * and assignments are identical across the two; **everything else is not**. So
 * every hook defect living in that difference was invisible to ~270 assertions
 * that reported success the whole time.
 *
 * #1133 is that failure, already cashed: fifteen `delete` statements across two
 * intake hooks were silent no-ops in production, and the tests asserting the
 * strip passed throughout — because on a plain object `delete` works. A
 * security control read as enforced, in code and in its tests, and did nothing.
 *
 * ### How to read a failure here — the two directions are NOT the same
 *
 * **`delete` became effective.** The engine grew a `deleteProperty` trap
 * (upstream objectstack#12277). Production changed underneath this app: that is
 * NEWS, and the right response is to re-read the hooks that were rewritten to
 * assign-instead-of-delete (`case_sla_defaults`, `lead_automation`) and decide
 * whether the workaround can be retired — ⛔ not to relax the assertion.
 *
 * **The wrapper stopped being installed.** The harness has reverted to a plain
 * object and the whole suite is back to certifying behaviour production does
 * not have. `engineFlatInput` throws loudly for this case rather than letting
 * it pass quietly; if you are here because that throw fired, fix the probe.
 *
 * ⛔ Neither failure is fixed by deleting a case from this file.
 *
 * ### Why these pins are meaningful rather than tautological
 *
 * The harness does not reimplement the Proxy — it drives the real, exported
 * `wrapDeclarativeHook`, which is the function that calls `installFlatInput`.
 * So these cases cannot drift from the engine; what they pin is that the
 * harness is still WIRED to it, and that the resulting behaviour is the one the
 * app's hooks were repaired against. Every case below is written to go RED
 * against the pre-#1295 plain-object harness — that is the bar the card sets,
 * and `the pre-#1295 shape would pass these` at the bottom states it as an
 * executable contrast rather than a claim.
 */

type AnyRec = Record<string, any>;

/** A hook-shaped handler that strips a key the way the intake hooks used to. */
const deletingHandler = async (ctx: AnyRec): Promise<void> => {
  delete ctx.input.owner_id;
};

describe('the harness hands a hook the ENGINE\'s input shape, not a plain object', () => {
  it('is a wrapper, not the record: the reserved keys are reachable and non-enumerable', () => {
    const record: Rec = { subject: 'Printer on fire', priority: 'high' };
    const ctx = makeCtx({ event: 'beforeInsert', input: record });

    // On a plain-object ctx every one of these is false/undefined.
    expect('data' in ctx.input, 'ctx.input is not wrapper-shaped').toBe(true);
    expect(ctx.input.data, 'the wrapper does not carry the caller\'s record as `data`').toBe(record);
    expect('options' in ctx.input).toBe(true);

    // ...and yet they must not show up as record fields, or every hook that
    // iterates the payload would start writing `data`/`options` columns. The
    // engine makes them non-enumerable; so must this.
    expect(Object.getOwnPropertyDescriptor(ctx.input, 'data')?.enumerable).toBe(false);
    expect(Object.getOwnPropertyDescriptor(ctx.input, 'options')?.enumerable).toBe(false);
    expect(Object.keys(ctx.input)).toEqual(['subject', 'priority']);
    expect({ ...ctx.input }).toEqual({ subject: 'Printer on fire', priority: 'high' });
  });

  it('reads and assignments still reach the caller\'s own object (the ~270 call sites)', () => {
    const record: Rec = { priority: 'high' };
    const ctx = makeCtx({ event: 'beforeInsert', input: record });

    expect(ctx.input.priority).toBe('high');
    ctx.input.priority_rank = 3;
    // `data` IS the object the test passed in, which is what keeps every
    // existing `expect(input.<field>)` assertion working unchanged.
    expect(record.priority_rank).toBe(3);
  });

  // ───────────────────────────── the pin the card exists for ──

  it('⛔ `delete` on a hook\'s input is a SILENT NO-OP, exactly as in production', async () => {
    // THIS IS THE CASE THAT MUST FAIL ON THE OLD HARNESS. On a plain object
    // `delete` genuinely removes the key and all five read-backs below flip.
    const record: Rec = { subject: 'Spoofed', owner_id: 'attacker_chosen_user' };
    const ctx = makeCtx({ event: 'beforeInsert', input: record });

    await deletingHandler(ctx);

    expect(
      ctx.input.owner_id,
      'a hook\'s `delete` now REMOVES the key. Either the engine grew a `deleteProperty` ' +
        'trap (objectstack#12277 — re-read the assign-instead-of-delete repairs in ' +
        'case.hook.ts / lead.hook.ts) or this harness reverted to a plain object. ' +
        'Do not relax this assertion; find out which.',
    ).toBe('attacker_chosen_user');
    expect('owner_id' in ctx.input, 'the key stopped surviving `delete`').toBe(true);
    expect(Object.keys(ctx.input)).toContain('owner_id');
    expect(record.owner_id, 'the record the engine would persist lost the key').toBe('attacker_chosen_user');
  });

  it('delete reports SUCCESS while doing nothing — which is why it stayed hidden', async () => {
    const record: Rec = { owner_id: 'attacker_chosen_user' };
    const ctx = makeCtx({ event: 'beforeInsert', input: record });

    // JS says it worked. Every read-back says it worked. Storage disagrees.
    expect(Reflect.deleteProperty(ctx.input, 'owner_id')).toBe(true);
    expect(ctx.input.owner_id).toBe('attacker_chosen_user');
  });

  it('assign-then-delete keeps the ASSIGNED value — no merge, a delete aimed one level too high', async () => {
    // The discriminator that rules out "the engine merges caller data over hook
    // input": `set` is trapped into `data`, `delete` falls through to the
    // wrapper, so the assignment survives its own removal.
    const record: Rec = { owner_id: 'attacker_chosen_user' };
    const ctx = makeCtx({ event: 'beforeInsert', input: record });

    ctx.input.owner_id = null;
    await deletingHandler(ctx);

    expect(ctx.input.owner_id).toBeNull();
    expect(record.owner_id).toBeNull();
  });

  // ─────────────── the failure mode generalises past `delete` ──

  it('`has` answers from the record, and says NO to an absent key', () => {
    const ctx = makeCtx({ event: 'beforeInsert', input: { subject: 'x' } });
    expect('subject' in ctx.input).toBe(true);
    expect('never_declared_anywhere' in ctx.input).toBe(false);
  });

  it('`getOwnPropertyDescriptor` describes a record key as a real data property', () => {
    const ctx = makeCtx({ event: 'beforeInsert', input: { subject: 'x' } });
    const desc = Object.getOwnPropertyDescriptor(ctx.input, 'subject');
    expect(desc).toEqual({ configurable: true, enumerable: true, writable: true, value: 'x' });
  });

  it('`ownKeys` lists the record\'s keys, in the record\'s order, and nothing else', () => {
    const ctx = makeCtx({ event: 'beforeInsert', input: { b: 1, a: 2, c: 3 } });
    expect(Reflect.ownKeys(ctx.input)).toEqual(['b', 'a', 'c']);
    expect(JSON.stringify(ctx.input)).toBe('{"b":1,"a":2,"c":3}');
  });

  it('`id` is answered from the WRAPPER, which is where the engine binds it', () => {
    // Seven hooks in this app read `ctx.input.id`. The Proxy's `get` short-
    // circuits `id` to the wrapper and never consults `data`, so an id left
    // only in the record reads back as `undefined` — measured. The harness
    // hoists it; this pin is what keeps the hoist in place.
    const ctx = makeCtx({ event: 'beforeUpdate', input: { id: 'case1', status: 'resolved' } });
    expect(ctx.input.id).toBe('case1');

    // ...and the raw wrapper genuinely carries it, rather than the pin passing
    // through `data` by accident.
    expect(ctx.input.data.id).toBe('case1');
    const bare = engineFlatInput({ status: 'resolved' });
    expect(bare.id, 'a record with no id must not invent one').toBeUndefined();
  });

  // ────────────────────────────────── wiring, drift and provenance ──

  it('the shape comes from the real engine export, not a local copy', () => {
    // The design this file guards: `installFlatInput` is internal, but
    // `wrapDeclarativeHook` — the function that CALLS it — is exported, so the
    // harness drives the genuine wrapper instead of reimplementing it. A local
    // reimplementation is the one thing that could make every case above pass
    // while diverging from production, so the reachability is pinned here.
    expect(typeof wrapDeclarativeHook).toBe('function');

    // Driven by hand, the engine's own wrapper must reach the same verdict the
    // harness reaches. If these two ever disagree, the harness has stopped
    // being wired to the engine.
    const record: Rec = { owner_id: 'attacker_chosen_user' };
    const raw: AnyRec = { data: record, options: {} };
    const probe: AnyRec = { event: 'beforeInsert', input: raw };
    void (wrapDeclarativeHook({ name: 'pin' } as never, (async () => {}) as never)(
      probe as never,
    ) as unknown as Promise<void>).catch(() => {});

    expect(probe.input, 'wrapDeclarativeHook stopped installing the flat-input Proxy').not.toBe(raw);
    delete probe.input.owner_id;
    expect(probe.input.owner_id).toBe('attacker_chosen_user');
  });

  it('the pre-#1295 shape would PASS these assertions — which is the whole point', async () => {
    // The executable contrast. This is what the harness used to hand a
    // handler; running the same defect against it reproduces the green that
    // #1133 shipped under. If this case ever goes red, a plain object has
    // started behaving like the wrapper and the contrast is no longer real.
    const plainInput: Rec = { subject: 'Spoofed', owner_id: 'attacker_chosen_user' };
    const oldStyleCtx: AnyRec = { event: 'beforeInsert', input: plainInput, user: undefined };

    await deletingHandler(oldStyleCtx);

    expect(oldStyleCtx.input.owner_id, 'a plain object no longer honours `delete`').toBeUndefined();
    expect('owner_id' in oldStyleCtx.input).toBe(false);
    // ...and that green is a lie about production, which is what the pins above
    // now prevent this suite from telling.
  });
});

// ──────────────────────────── the app-side repair, seen through the real shape ──

describe('the #1133 repair holds under the engine\'s input shape', () => {
  const slaDefaults = hookNamed(caseHooks, 'case_sla_defaults');

  it('the guest strip NULLS the spoofed owner rather than removing it', async () => {
    // The repair only works because it assigns. Under the plain-object harness
    // a `delete`-based strip would have passed this too; under the real shape
    // only the assignment can.
    const harness = makeHarness({ crm_case: [] });
    const record: Rec = { subject: 'Spoofed', description: 'x', owner_id: 'attacker_chosen_user' };
    const ctx = makeCtx({ event: 'beforeInsert', input: record, user: undefined, api: harness.api });

    await slaDefaults.handler(ctx as never);

    expect(record.owner_id, 'the guest strip stopped neutralising the spoofed owner').toBeNull();
    expect('owner_id' in ctx.input, 'a nulled key is still a PRESENT key').toBe(true);
    expect(record.origin, 'the guest branch did not run at all (positive control)').toBe('web');
  });
});
