// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { extractHookBody } from '@objectstack/cli/hook-body';
import type { VerifyStack } from '@objectstack/verify';
import { ErrorCode } from '@objectstack/spec/api';
import { allHooks } from '../objectstack.composition';
import { REFUSAL_CODES, REFUSE_HELPER } from '../src/sales/objects/_refusal';
import { hookNamed } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, runShippedHook, today, type Person } from './helpers/verify-stack';

/**
 * The refusal envelope, pinned where it actually ships (#1075 + #1167).
 *
 * # What was wrong
 *
 * Every business refusal in this app was a bare `throw new Error(msg)`, so
 * `resolveThrownHttpError` — the mapper `@objectstack/rest` uses — classified a
 * deliberate refusal as `500 / INTERNAL_ERROR`, a server fault. The only signal
 * a REST consumer had was the message string: prose, localised in places, and
 * the one part of a refusal that is MEANT to change (#693 / #719).
 *
 * # Why the helper is inline in every guard rather than imported
 *
 * A hook handler is lowered to a metadata-only `body.source` and evaluated in
 * QuickJS with no module scope. `extractHookBody` THROWS on a module-scope
 * reference, and the CLI build CATCHES that throw and silently bundles the
 * closure instead — so an imported `refuse()` would not go red anywhere, it
 * would just stop the hook shipping as pure metadata. The helper is therefore
 * inlined per handler, exactly as `account_protection` inlines the territory
 * table instead of importing `./_territory.ts`. This file removes the TRUST
 * that arrangement would otherwise require: each copy is read back out of the
 * LOWERED body and held to the declaration in `src/objects/_refusal.ts`.
 *
 * # Why the shipped path, and not the handler
 *
 * #1167: the in-process path is what this repo tests, and the body-only path is
 * what it ships. They differ — the shipped path re-throws as `SandboxError` and
 * rewrites the message to `hook 'NAME' threw: Error: ORIGINAL`, preserving the
 * original on `innerMessage`. More sharply, the sandbox marshals an allowlist
 * and drops everything else, so an envelope riding a key OUTSIDE it — `hint`,
 * `detail`, or a branch on `instanceof` — would pass a handler-level test and
 * be silently dead in production. Re-measured on 17.4.0 (#1863 / #1867): the
 * allowlist is FOUR properties — `code` as a non-empty string, `status` as a
 * finite number, `fields` as an array, `userMessage` as a string with
 * non-whitespace in it. This file said three, anchored to 17.1.0, and reached
 * for "a fourth key" as its example of something silently dead: `userMessage`
 * IS the fourth key, and it crosses. #1869 adopted it, so `refuse()` now writes
 * THREE of the four and the clean sentence reaches a consumer on a channel the
 * `hook 'NAME' threw:` rewrite cannot touch — `src/objects/_refusal.ts` carries
 * the reading and why the fourth argument defaults to the author's message.
 * `fields` stays declined. Every behavioural assertion below runs the lowered
 * body.
 *
 * The wording pins live alongside the envelope, never instead of it — the
 * phrasing is a real contract (#693 / #719).
 */

type AnyRec = Record<string, any>;

/** Whitespace-collapsed, so the pin is about what the code does, not indentation. */
const flat = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** The lowered body of every registered hook, by name. */
const LOWERED: Array<{ name: string; source: string }> = (allHooks as AnyRec[]).map((h) => ({
  name: h.name as string,
  source: extractHookBody(h.handler, `hook '${h.name}'`).source,
}));

/** `refuse(…, "CODE", NNN)` — the shape the printer emits, single- and multi-line alike. */
const CALL = /,\s*"([A-Z][A-Z0-9_]+)",\s*(\d{3})\s*[,)]/g;

const DECLARED = Object.values(REFUSAL_CODES);

describe('the refusal vocabulary is declared once (#1075)', () => {
  const carriers = LOWERED.filter((h) => h.source.includes('function refuse('));

  it('is carried by every hook that refuses, and by no other', () => {
    const callers = LOWERED.filter((h) => /throw refuse\(/.test(h.source)).map((h) => h.name);
    expect(carriers.map((h) => h.name).sort()).toEqual(callers.sort());
    // A floor, not a target: if a guard is deleted this should be re-measured,
    // not quietly lowered.
    expect(carriers.length).toBeGreaterThanOrEqual(11);
  });

  it('inlines a helper identical in every copy, and identical to the declaration', () => {
    const copies = carriers.map((h) => {
      const m = /function refuse\(message, code, status, userMessage = message\) \{[\s\S]*?\n\s*\}/.exec(
        h.source,
      );
      expect(m, `hook '${h.name}' carries no extractable refuse() helper`).toBeTruthy();
      return { name: h.name, text: flat(m![0]) };
    });
    const unique = [...new Set(copies.map((c) => c.text))];
    expect(unique, `copies drifted: ${copies.map((c) => c.name).join(', ')}`).toHaveLength(1);
    expect(unique[0]).toBe(flat(REFUSE_HELPER));
  });

  it('writes exactly three properties onto the error — what refuse() sets, not what crosses', () => {
    // Counts WRITES, deliberately, and says so: measured on 17.4.0 four
    // properties cross and this helper writes three of them, so one assertion
    // must not claim both lists. The header above pins what crosses.
    //
    // Two, until #1869 adopted `userMessage`. The expected value moved with the
    // helper and not on its own — which is the whole point of counting the
    // written set here: adding the key had to be a deliberate edit to this
    // line, and dropping it again turns this red.
    //
    // The character class covers BOTH cases on purpose. It was `[a-z]+` until
    // #1868 — lower-case only, so a write named `err.userMessage` was
    // undetectable while `err.hint` was caught, i.e. the guard was blind to
    // precisely the key 17.4.0 added to the allowlist, and precisely the key
    // this helper now writes. Its exact reach, so the next reader does not
    // over-read it: dot-notation writes only, in any case; `err['userMessage']
    // = …` would still be invisible.
    const body = flat(REFUSE_HELPER);
    expect(body).toContain('err.code = code');
    expect(body).toContain('err.status = status');
    expect(body).toContain('err.userMessage = userMessage');
    expect(body.match(/err\.[A-Za-z_$][A-Za-z0-9_$]* =/g)).toEqual([
      'err.code =',
      'err.status =',
      'err.userMessage =',
    ]);
  });
});

describe('every refusal names a code the platform will echo (#1075)', () => {
  const sites = LOWERED.flatMap((h) =>
    [...h.source.matchAll(CALL)].map((m) => ({ hook: h.name, code: m[1]!, status: Number(m[2]) })),
  );

  it('found every swept call site', () => {
    // 18 until REQ-0003 added the account capability gate in
    // `opportunity.hook.ts`; 19 until #549 added the activated-contract
    // refusal to `account_protection`; 20 until REQ-0006 added the
    // status-change gate to `opportunity_lifecycle`; 21 until REQ-0006 step 11
    // added the 立项 (qualification) gate beside it; 22 until #2014 added the
    // refusal of an acceptance the deal's approval holds to `quote_workflow`.
    // The number is hand-maintained on purpose: a new refusal has to be a
    // deliberate edit here, so a guard that quietly stopped being swept cannot
    // hide behind a count that follows it.
    expect(sites).toHaveLength(23);
  });

  it('uses only members of the platform ErrorCode enum', () => {
    // An invented spelling is not rejected and not lost — it is demoted to
    // `declaredCode`, and the `code` a caller branches on gets derived from the
    // HTTP status instead. That silent demotion is what this assertion stops.
    for (const s of sites) {
      expect(ErrorCode.safeParse(s.code).success, `${s.hook}: '${s.code}' is not an ErrorCode`).toBe(true);
    }
  });

  it('uses only pairs declared in REFUSAL_CODES, status included', () => {
    for (const s of sites) {
      expect(
        DECLARED.some((d) => d.code === s.code && d.status === s.status),
        `${s.hook}: ${s.code}/${s.status} is not a declared refusal class`,
      ).toBe(true);
    }
  });

  it('leaves exactly the two cascade faults bare — each IS a 500', () => {
    const bare = LOWERED.filter((h) => /throw new Error\(/.test(h.source)).map((h) => h.name);
    // The two accepted-quote hooks (one hook until #2014 split the elevated
    // contract draft out) fire from an afterUpdate cascade when the contract
    // draft or the close-won failed for reasons the user neither caused nor
    // can act on. `resolveThrownHttpError` maps a bare Error to 500 /
    // INTERNAL_ERROR, which is the correct answer — an envelope would file a
    // broken cascade as user error.
    expect(bare).toEqual(['quote_accepted_contract_draft', 'quote_on_accepted']);
  });
});

// ───────────────────────────── the shipped path, one case per class (#1167) ──

const accountGuard = hookNamed('account_protection');
const contactGuard = hookNamed('contact_integrity');
const oppGuard = hookNamed('opportunity_lifecycle');
const productGuard = hookNamed('product_catalog');
const taskGuard = hookNamed('task_do_not_call_guard');

/**
 * The real app — booted through `@objectstack/verify`'s handle — and the rows
 * both paths below refuse against: a contact holding an email, a product a
 * deal's line already references, a lead flagged Do Not Call.
 */
let verify: VerifyStack;
let rep: Person;
let admin: string;
const row: Record<string, string> = {};
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@refusal-envelope.test', {
    name: 'Envelope Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  const create = async (object: string, doc: AnyRec) =>
    String((await verify.hooks.run(object, 'insert', doc, { as: rep.token })).id);
  row.account = await create('crm_account', { name: 'Envelope Co' });
  row.contact = await create('crm_contact', {
    first_name: 'Ena', last_name: 'Velope', email: 'dup@acme.example.com', crm_account: row.account,
  });
  row.opportunity = await create('crm_opportunity', {
    name: 'Big Deal', crm_account: row.account, stage: 'proposal', amount: 100, close_date: today(),
  });
  const [product] = await verify.seed('crm_product', [{ name: 'Widget', list_price: 10, is_active: true }]);
  row.product = String(product.id);
  await create('crm_opportunity_line_item', {
    crm_opportunity: row.opportunity, crm_product: row.product, quantity: 1, unit_price: 10,
  });
  row.lead = await create('crm_lead', {
    first_name: 'Dee', last_name: 'Nc', company: 'Envelope Co', email: 'dee@acme.example.com', do_not_call: true,
  });
}, 180_000);

/** Run a hook's SHIPPED body and return the error it threw, or null if it did not. */
const refusalFrom = async (hook: AnyRec, opts: AnyRec): Promise<AnyRec | null> =>
  runShippedHook(verify, hook, opts as never).then(
    () => null,
    (e: AnyRec) => e,
  );

/**
 * The envelope AND the wording, on the body that ships.
 *
 * `code`/`status` are read as a pair on purpose: measured on 17.4.0,
 * `resolveThrownHttpError` still reads `status` FIRST, so a code with no status
 * is filed as a 500 — carrying the code itself, not `INTERNAL_ERROR`
 * (`code only` maps to 500 / `DELETE_RESTRICTED`). `VALIDATION_FAILED` is the
 * single exception: the mapper supplies 400 for that code itself, so that one
 * class survives a dropped status entirely. For the other four, asserting the
 * pair separately would let half an envelope pass. The wording is asserted
 * against `innerMessage` — the shipped path rewrites `message` to
 * `hook 'NAME' threw: Error: ORIGINAL` and keeps the original there — and the
 * rewrite itself is pinned, since it is what a REST consumer reading `message`
 * would see. `userMessage` is pinned EQUAL to `innerMessage`: since #1869
 * `refuse()` marks the sentence, and that mark is the half a consumer can read
 * without the wrapper. `innerMessage` is not a wire field, so asserting only it
 * would leave the user-facing outcome unpinned.
 */
const expectEnvelope = (
  err: AnyRec | null,
  cls: keyof typeof REFUSAL_CODES,
  hookName: string,
  wording: RegExp,
): void => {
  expect(err, `expected ${hookName} to refuse`).toBeTruthy();
  expect(err!.name, 'the shipped path re-throws as SandboxError').toBe('SandboxError');
  expect([err!.code, err!.status]).toEqual([REFUSAL_CODES[cls].code, REFUSAL_CODES[cls].status]);
  expect(String(err!.innerMessage)).toMatch(wording);
  expect(String(err!.message)).toBe(`hook '${hookName}' threw: Error: ${err!.innerMessage}`);
  expect(err!.userMessage, 'the marked channel carries the sentence, unwrapped').toBe(
    String(err!.innerMessage),
  );
};

describe('every refusal class survives the QuickJS boundary (#1167)', () => {
  // The shipped path: each guard's lowered body, in the runtime's QuickJS
  // sandbox, reading the real engine of the booted app (`runShippedHook` —
  // the handle runs hooks in-process and has no door for this one).
  it('invalid_value — account_protection rejects a malformed website', async () => {
    const err = await refusalFrom(accountGuard, {
      event: 'beforeInsert',
      input: { name: 'Acme', website: 'ftp://nope.example.com' },
    });
    expectEnvelope(err, 'invalid_value', 'account_protection', /must start with http/);
  });

  it('duplicate — contact_integrity rejects a repeated email in one organization', async () => {
    const err = await refusalFrom(contactGuard, {
      event: 'beforeInsert',
      input: { email: 'dup@acme.example.com' },
      as: rep.token,
    });
    expectEnvelope(err, 'duplicate', 'contact_integrity', /already exists/);
  });

  it('locked — opportunity_lifecycle freezes a closed deal', async () => {
    const err = await refusalFrom(oppGuard, {
      event: 'beforeUpdate',
      input: { id: row.opportunity, amount: 999 },
      previous: { id: row.opportunity, name: 'Big Deal', stage: 'closed_won', amount: 100 },
      as: rep.token,
    });
    expectEnvelope(err, 'locked', 'opportunity_lifecycle', /is closed \(closed_won\)/);
  });

  it('delete_restricted — product_catalog holds a referenced product', async () => {
    const err = await refusalFrom(productGuard, {
      event: 'beforeDelete',
      input: {},
      previous: { id: row.product, name: 'Widget' },
      // The catalog is an administrator's to curate.
      as: admin,
    });
    expectEnvelope(err, 'delete_restricted', 'product_catalog', /Cannot delete product/);
  });

  it('prohibited — task_do_not_call_guard refuses a call on a flagged lead', async () => {
    const err = await refusalFrom(taskGuard, {
      event: 'beforeInsert',
      input: { type: 'call', status: 'not_started', related_to_lead: row.lead },
      // The rep scheduling the call: the body reads the lead as its caller.
      as: rep.token,
    });
    expectEnvelope(err, 'prohibited', 'task_do_not_call_guard', /flagged Do Not Call/);
  });
});

// ─────────────────────────────────────── the in-process path, same envelope ──

/**
 * The SAME classes on the in-process path — a real write through the engine's
 * write door, as the person making it.
 *
 * Not redundant with the block above, for two reasons that pull in opposite
 * directions. The shipped path is what users get, so it is where the envelope
 * has to be true — but it runs inside QuickJS, where the source is a string and
 * v8 coverage cannot see it, so a guard tested only there reads as dead code.
 * The in-process path is the one #1075's original observation was taken on, and
 * it is the path every other runtime test in this repo drives — through
 * `@objectstack/verify`'s `hooks.run`, which rethrows the engine's error
 * unchanged.
 *
 * The two differ in ways worth pinning side by side: in-process the error is a
 * plain `Error` with the message unrewritten, so `innerMessage` does not exist
 * and `message` IS the original sentence. `code` and `status` must be identical
 * across both, and asserting that here is what would catch an envelope that
 * survives one path and not the other.
 */
const expectInProcess = (
  err: unknown,
  cls: keyof typeof REFUSAL_CODES,
  wording: RegExp,
): void => {
  expect(err, `expected a refusal matching ${wording}`).toBeInstanceOf(Error);
  const e = err as AnyRec;
  expect(e.name, 'in-process the error is NOT re-thrown as SandboxError').toBe('Error');
  expect(e.message).toMatch(wording);
  expect(e.innerMessage, 'only the sandbox adds innerMessage').toBeUndefined();
  expect([e.code, e.status]).toEqual([REFUSAL_CODES[cls].code, REFUSAL_CODES[cls].status]);
  // The mark is written by `refuse()`, so it is identical on both paths — here
  // `message` is unrewritten, so the two are the same string.
  expect(e.userMessage, 'refuse() marks the sentence on both paths').toBe(e.message);
};

/** A real write as `as`; returns what the engine refused it with, or null. */
const inProcess = async (
  object: string, op: 'insert' | 'update' | 'delete', doc: AnyRec, as: string = rep.token,
): Promise<unknown> =>
  verify.hooks.run(object, op, doc, { as }).then(
    () => null,
    (e: unknown) => e,
  );

describe('the same envelope on the in-process path (#1075)', () => {
  it('invalid_value — account_protection', async () => {
    expectInProcess(
      await inProcess('crm_account', 'insert', { name: 'Acme', website: 'ftp://nope.example.com' }),
      'invalid_value',
      /must start with http/,
    );
  });

  it('duplicate — contact_integrity', async () => {
    expectInProcess(
      await inProcess('crm_contact', 'insert', {
        first_name: 'Dup', last_name: 'Licate', email: 'dup@acme.example.com', crm_account: row.account,
      }),
      'duplicate',
      /already exists/,
    );
  });

  it('locked — opportunity_lifecycle', async () => {
    const opp = await verify.hooks.run('crm_opportunity', 'insert', {
      name: `Closed Deal ${++k}`, crm_account: row.account, stage: 'proposal', amount: 100, close_date: today(),
    }, { as: rep.token });
    await verify.hooks.run('crm_opportunity', 'update', { id: opp.id, stage: 'closed_won', win_reason: 'better_price' }, { as: rep.token });
    expectInProcess(
      await inProcess('crm_opportunity', 'update', { id: opp.id, amount: 999 }),
      'locked',
      /is closed \(closed_won\)/,
    );
  });

  it('delete_restricted — product_catalog', async () => {
    // The catalog is an administrator's to curate.
    expectInProcess(
      await inProcess('crm_product', 'delete', { id: row.product }, admin),
      'delete_restricted',
      /Cannot delete product/,
    );
  });

  it('prohibited — task_do_not_call_guard', async () => {
    expectInProcess(
      await inProcess('crm_task', 'insert', {
        subject: 'Call Dee', type: 'call', status: 'not_started', related_to_lead: row.lead,
      }),
      'prohibited',
      /flagged Do Not Call/,
    );
  });

  it('prohibited — event_do_not_call_guard, the twin guard on the other object', async () => {
    expectInProcess(
      await inProcess('crm_event', 'insert', {
        subject: 'Call Dee', type: 'call', status: 'planned', related_to_lead: row.lead,
        start_datetime: '2030-03-01T09:00:00.000Z',
      }),
      'prohibited',
      /flagged Do Not Call/,
    );
  });
});
