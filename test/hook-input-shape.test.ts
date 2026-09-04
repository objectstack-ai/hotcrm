// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
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
 * **`delete` became effective.** This is what happened, on the 17.2.0 -> 17.3.0
 * upgrade: the engine grew the `deleteProperty` trap (upstream
 * objectstack#12277, shipped in the platform 17.3.0 line — objectql's changelog
 * grades it `minor` precisely because "any shipped hook that already contains
 * `delete ctx.input.<field>` has been a no-op until now and starts taking effect
 * on upgrade"). Both mechanisms closed together: the in-process flat-record
 * Proxy now traps `deleteProperty`, and the sandbox path diffs deletions
 * against the entry snapshot instead of writing mutations home with
 * `Object.assign`, which cannot represent a removal.
 *
 * The instruction this paragraph used to carry — re-read the hooks rewritten to
 * assign-instead-of-delete and decide whether the workaround can be retired —
 * was followed, and the answer is NO, on the ground those hooks already stated
 * before the trap existed. What they WRITE is load-bearing independently of how
 * it is spelled: `case_auto_assign` stands down only on a non-empty STRING
 * `owner_id`, and `lead_duplicate_check` only on a non-blank verdict, so those
 * columns must arrive `null` and not ABSENT. Removing a key and writing `null`
 * are different downstream. The assertions below therefore move to the new
 * contract; the hooks do not move at all.
 *
 * If a future release takes the trap away again, this file goes red in the
 * other direction and that too is NEWS — ⛔ neither direction is a licence to
 * relax an assertion.
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

  it('`delete` on a hook\'s input REMOVES the field, and the removal reaches the record', async () => {
    // Through 17.2.0 this case asserted the opposite: the delete was a silent
    // no-op and every read-back below still answered with the caller's value.
    // objectstack#12277 landed in 17.3.0 and closed it on both execution paths.
    const record: Rec = { subject: 'Spoofed', owner_id: 'attacker_chosen_user' };
    const ctx = makeCtx({ event: 'beforeInsert', input: record });

    await deletingHandler(ctx);

    expect(
      ctx.input.owner_id,
      'the `deleteProperty` trap has gone away again — production changed under this app ' +
        'a second time. Find out which release, and do not relax this assertion.',
    ).toBeUndefined();
    expect('owner_id' in ctx.input, 'the key survived `delete`').toBe(false);
    expect(Object.keys(ctx.input)).not.toContain('owner_id');
    // The removal routes into `data` — the object the engine persists — exactly
    // as an assignment does. That symmetry is the whole point of the fix.
    expect(record.owner_id, 'the record the engine would persist kept the key').toBeUndefined();
  });

  it('delete reports success AND does it — JS, the read-back and storage now agree', async () => {
    const record: Rec = { owner_id: 'attacker_chosen_user' };
    const ctx = makeCtx({ event: 'beforeInsert', input: record });

    // `true` was always the answer here; what changed is that it is now true.
    expect(Reflect.deleteProperty(ctx.input, 'owner_id')).toBe(true);
    expect(ctx.input.owner_id).toBeUndefined();
    expect(record.owner_id).toBeUndefined();
  });

  it('assign-then-delete removes the ASSIGNED value — both operations reach `data` now', async () => {
    // Through 17.2.0 this was the discriminator that ruled out "the engine
    // merges caller data over hook input": `set` was trapped into `data` while
    // `delete` fell through to the wrapper, so an assignment survived its own
    // removal. Both operations land in `data` from 17.3.0, so the later one
    // wins — which is what an author reading the two lines would expect.
    //
    // ⚠️ This is exactly why `case.hook.ts` and `lead.hook.ts` still ASSIGN
    // rather than delete: they need the column to arrive `null`, not absent.
    const record: Rec = { owner_id: 'attacker_chosen_user' };
    const ctx = makeCtx({ event: 'beforeInsert', input: record });

    ctx.input.owner_id = null;
    await deletingHandler(ctx);

    expect(ctx.input.owner_id).toBeUndefined();
    expect(record.owner_id).toBeUndefined();
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
    expect(probe.input.owner_id).toBeUndefined();
    expect(record.owner_id, 'the engine wrapper deleted from the wrapper, not the record').toBeUndefined();
  });

  it('a wrapper takes an `Object.assign` write-back into the record (the sandbox return path)', () => {
    // `runHookBody` hands the platform's bound body handler a wrapper, and the
    // runtime's `applyMutationsToInput` writes the sandbox's result back with
    // `Object.assign(ctx.input, …)`. Against the wrapper those writes route
    // through the `set` trap into `data` — which IS the caller's record — so
    // the ~44 call sites that read `input.<field>` back are unaffected. This
    // pins the mechanism that conversion depends on.
    const record: Rec = { subject: 'x' };
    const wrapped = engineFlatInput(record);

    Object.assign(wrapped, { priority: 'high' });

    expect(record.priority, 'the write-back did not reach the record').toBe('high');
    expect(Object.keys(wrapped)).toEqual(['subject', 'priority']);
    // ...and it did NOT land on the wrapper as a sibling of `data`/`options`.
    expect(Object.getOwnPropertyDescriptor(record, 'priority')?.enumerable).toBe(true);
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

// ─────────────────── the guard that keeps the 40th call site from re-opening this ──

/**
 * #1298 — the residual half of #1295, and the reason it is a GATE and not a
 * one-time sweep.
 *
 * #1295 gave `makeCtx` the engine's wrapper shape, which fixed every call site
 * that went through it. It could not fix the ones that did not: a test that
 * writes `handler({ event, input, api })` by hand hands the hook a PLAIN
 * OBJECT, and is back in the blind spot #1133 shipped under — with its
 * assertions still reporting success, because reads and assignments behave
 * identically across the two shapes. Converting the sites that existed is
 * worthless on its own; nothing stops the next one being written the old way,
 * and nothing would report it.
 *
 * ### Why TWO rules and not one
 *
 * They fail on different things, and neither subsumes the other. Measured
 * against the pre-conversion tree, rule A caught 22 of the 23 live sites and
 * rule B caught all 6 files, including the one A structurally cannot see:
 *
 *  - **A** reads the CALL. It is the direct form (`handler({ … })`) and it
 *    reports the exact line, which is what makes a violation actionable. It is
 *    blind to a ctx built one line earlier, or by a local builder.
 *  - **B** reads the FILE. Any file that calls a hook handler at all must
 *    obtain its ctx from the shared harness. That catches the indirect forms
 *    without needing to trace them — `test/priority-rank-parity.test.ts`'s
 *    local `ctxFor` builder was invisible to A and caught by B.
 *
 * ### The counting trap, and the control that rules it out
 *
 * A naive `event:` grep does NOT discriminate: `makeCtx({ event: … })` and
 * `handler({ event: … })` both match it and they are OPPOSITES here. Measured
 * on this tree, `event:` hits 414 times across 53 files, of which 16 files hold
 * no hook ctx at all (flow metadata, seed fixtures, prose). So both scans below
 * key on the CONSUMER — what the object is handed to — never on the presence of
 * an `event:` key, and rule A additionally requires the literal to carry an
 * `event` key before judging it, so an ACTION ctx (`runActionBody`'s
 * `{ record, user, session, params }`) is skipped rather than mis-flagged.
 *
 * ⛔ A violation is not fixed by adding a file to an exception list. Route the
 * ctx through `makeCtx` (or `engineFlatInput` when a raw wrapper is what the
 * call needs), the same way every other call site does.
 */
describe('no test may hand a hook handler a plain-object ctx (#1298)', () => {
  const TEST_DIR = join(process.cwd(), 'test');

  const testFiles = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) testFiles(p, out);
      else if (p.endsWith('.ts')) out.push(p);
    }
    return out;
  };

  /**
   * Blank out comments and the BODIES of strings/templates, keeping newlines so
   * line numbers still line up.
   *
   * Not optional: this file's own prose says `handler({ … })` several times,
   * and several tests carry scanner regexes as string literals. A scan that
   * read those would report itself.
   */
  const codeOnly = (src: string): string => {
    let out = '';
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      const d = src[i + 1];
      if (c === '/' && d === '/') {
        while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
        continue;
      }
      if (c === '/' && d === '*') {
        out += '  '; i += 2;
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
          out += src[i] === '\n' ? '\n' : ' '; i++;
        }
        out += '  '; i += 2;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        out += c; i++;
        while (i < src.length && src[i] !== c) {
          if (src[i] === '\\') { out += '  '; i += 2; continue; }
          out += src[i] === '\n' ? '\n' : ' '; i++;
        }
        out += c; i++;
        continue;
      }
      out += c; i++;
    }
    return out;
  };

  /** The balanced `{ … }` beginning at `open`. */
  const literalAt = (code: string, open: number): string => {
    let depth = 0;
    for (let i = open; i < code.length; i++) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') { depth--; if (depth === 0) return code.slice(open, i + 1); }
    }
    return code.slice(open);
  };

  const HAS_EVENT = /(^|[{,\s])event\s*:/;
  const ROUTED_INPUT = /(^|[^\w$])input\s*:\s*(?:engineFlatInput|makeCtx)\s*\(/;
  const IMPORTS_HARNESS = /from\s+'(?:\.\.?\/)*(?:helpers\/)?hook-harness'/;
  const USES_ROUTER = /\b(?:makeCtx|engineFlatInput)\b/;

  const sources = testFiles(TEST_DIR).map((path) => ({
    file: relative(process.cwd(), path),
    raw: readFileSync(path, 'utf8'),
  }));

  it('A · no hook handler is called with an object literal', () => {
    const offenders: string[] = [];
    for (const { file, raw } of sources) {
      const code = codeOnly(raw);
      const re = /(?<![\w$])handler\s*\(\s*\{/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code))) {
        const literal = literalAt(code, code.indexOf('{', m.index));
        // No `event` key ⇒ not a hook ctx (this is how an ACTION ctx passes).
        if (!HAS_EVENT.test(literal)) continue;
        // Already the engine's shape ⇒ this is a helper doing it correctly.
        if (ROUTED_INPUT.test(literal)) continue;
        offenders.push(`${file}:${code.slice(0, m.index).split('\n').length}`);
      }
    }

    expect(
      offenders,
      'A hook handler was handed a PLAIN OBJECT as `ctx.input`. The engine hands it a ' +
        'flat-record Proxy over `{ data, options }`, and the two differ on `delete`, ' +
        '`ownKeys`, `has` and `getOwnPropertyDescriptor` — so a defect living in that ' +
        'difference is invisible while the assertions report success (#1133 shipped ' +
        'exactly that way). Build the ctx with `makeCtx({ … })` from ' +
        '`test/helpers/hook-harness.ts`. ⛔ Do not add an exception here.',
    ).toEqual([]);
  });

  it('B · a file that calls a hook handler builds its ctx with the shared harness', () => {
    const offenders: string[] = [];
    for (const { file, raw } of sources) {
      const code = codeOnly(raw);
      if (!/(?<![\w$])handler\s*\(\s*[^)\s]/.test(code)) continue;
      if (IMPORTS_HARNESS.test(raw) && USES_ROUTER.test(code)) continue;
      offenders.push(file);
    }

    expect(
      offenders,
      'This file invokes a hook handler but never reaches `makeCtx` / `engineFlatInput`, ' +
        'so whatever it passes as `ctx` was built by hand — the shape production never ' +
        'uses. This is the rule that catches a ctx built by a LOCAL BUILDER, which rule ' +
        'A cannot see. Import from `test/helpers/hook-harness.ts` and route the ctx ' +
        'through it.',
    ).toEqual([]);
  });

  it('the guard reports the shape it is meant to report (self-test)', () => {
    // Without this, both cases above pass just as happily when the scan is
    // broken and matches nothing — the failure mode a static gate is most prone
    // to, and the one that would let the 40th call site through silently.
    const planted = [
      "await rollup.handler({ event: 'afterInsert', input: { crm_opportunity: 'opp1' }, api } as any);",
      'await lifecycle.handler({\n  event: "beforeUpdate",\n  input,\n  previous,\n} as any);',
    ];
    for (const sample of planted) {
      const code = codeOnly(sample);
      const m = /(?<![\w$])handler\s*\(\s*\{/.exec(code);
      expect(m, `rule A stopped matching a known-bad ctx: ${sample}`).not.toBeNull();
      const literal = literalAt(code, code.indexOf('{', m!.index));
      expect(HAS_EVENT.test(literal), 'rule A stopped recognising the `event` key').toBe(true);
      expect(ROUTED_INPUT.test(literal), 'rule A wrongly read a plain ctx as routed').toBe(false);
    }

    // ...and the two exemptions are real rather than accidental: an ACTION ctx
    // carries no `event`, and a helper that routes its `input` is not a
    // violation just because it writes a literal.
    const actionCtx = codeOnly('await handler({ record, user, session, params });');
    const actionLit = literalAt(actionCtx, actionCtx.indexOf('{'));
    expect(HAS_EVENT.test(actionLit), 'an action ctx would now be mis-flagged').toBe(false);

    const routed = codeOnly("await handler({ event: opts.event, input: engineFlatInput(input) });");
    const routedLit = literalAt(routed, routed.indexOf('{'));
    expect(ROUTED_INPUT.test(routedLit), 'a correctly-routed helper would now be flagged').toBe(true);

    // The scan must read CODE, not prose: this very file documents the bad form.
    expect(codeOnly("const s = 'handler({ event: 1 })';")).not.toContain('event');
  });
});
