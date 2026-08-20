// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { ErrorCode } from '@objectstack/spec/api';
import { allHooks } from '../src/hooks';
import { REFUSAL_CODES, REFUSE_HELPER } from '../src/objects/_refusal';
import { hookNamed, makeCtx, makeHarness } from './helpers/hook-harness';
import { extractSandboxBody, makeSandboxEngine, runHookBody } from './helpers/action-sandbox';
import accountHooks from '../src/objects/account.hook';
import contactHooks from '../src/objects/contact.hook';
import opportunityHooks from '../src/objects/opportunity.hook';
import productHooks from '../src/objects/product.hook';
import taskHooks from '../src/objects/task.hook';
import eventHooks from '../src/objects/event.hook';

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
 * original on `innerMessage`. More sharply, the sandbox marshals an allowlist of
 * exactly three properties (`code` as a non-empty string, `status` as a finite
 * number, `fields` as an array) and drops everything else, so an envelope riding
 * a fourth key or on `instanceof` would pass a handler-level test and be
 * silently dead in production. Re-measured on 17.1.0 for this change. Every
 * behavioural assertion below therefore runs the lowered body.
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
  source: extractSandboxBody(h.handler, `hook '${h.name}'`).source,
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
      const m = /function refuse\(message, code, status\) \{[\s\S]*?\n\s*\}/.exec(h.source);
      expect(m, `hook '${h.name}' carries no extractable refuse() helper`).toBeTruthy();
      return { name: h.name, text: flat(m![0]) };
    });
    const unique = [...new Set(copies.map((c) => c.text))];
    expect(unique, `copies drifted: ${copies.map((c) => c.name).join(', ')}`).toHaveLength(1);
    expect(unique[0]).toBe(flat(REFUSE_HELPER));
  });

  it('sets exactly the two properties that cross the sandbox boundary', () => {
    // `hint`, `detail`, `err.name` and `instanceof` are all dropped at the
    // boundary. The helper's own body is the only place this app writes onto a
    // refusal, so pinning it here covers every guard at once.
    const body = flat(REFUSE_HELPER);
    expect(body).toContain('err.code = code');
    expect(body).toContain('err.status = status');
    expect(body.match(/err\.[a-z]+ =/g)).toEqual(['err.code =', 'err.status =']);
  });
});

describe('every refusal names a code the platform will echo (#1075)', () => {
  const sites = LOWERED.flatMap((h) =>
    [...h.source.matchAll(CALL)].map((m) => ({ hook: h.name, code: m[1]!, status: Number(m[2]) })),
  );

  it('found every swept call site', () => {
    expect(sites).toHaveLength(17);
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

  it('leaves exactly one throw bare — the cascade fault, which IS a 500', () => {
    const bare = LOWERED.filter((h) => /throw new Error\(/.test(h.source)).map((h) => h.name);
    // `quote_on_accepted` fires from an afterUpdate cascade when close-won
    // bookkeeping failed for reasons the user neither caused nor can act on.
    // `resolveThrownHttpError` maps a bare Error to 500 / INTERNAL_ERROR, which
    // is the correct answer — an envelope would file a broken cascade as user
    // error.
    expect(bare).toEqual(['quote_on_accepted']);
  });
});

// ───────────────────────────── the shipped path, one case per class (#1167) ──

const accountGuard = hookNamed(accountHooks, 'account_protection');
const contactGuard = hookNamed(contactHooks, 'contact_integrity');
const oppGuard = hookNamed(opportunityHooks, 'opportunity_lifecycle');
const productGuard = hookNamed(productHooks, 'product_catalog');
const taskGuard = hookNamed(taskHooks, 'task_do_not_call_guard');

/** Run a lowered body and return the error it threw, or null if it did not. */
const refusalFrom = async (hook: AnyRec, opts: AnyRec): Promise<AnyRec | null> =>
  runHookBody(hook, opts as never).then(
    () => null,
    (e: AnyRec) => e,
  );

/**
 * The envelope AND the wording, on the body that ships.
 *
 * `code`/`status` are read as a pair on purpose: `resolveThrownHttpError` reads
 * `status` first, so a code without a status still falls through to
 * 500 / INTERNAL_ERROR. Asserting them separately would let half an envelope
 * pass. The wording is asserted against `innerMessage` — the shipped path
 * rewrites `message` to `hook 'NAME' threw: Error: ORIGINAL` and keeps the
 * original there — and the rewrite itself is pinned, since it is what a REST
 * consumer reading `message` would see.
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
};

describe('every refusal class survives the QuickJS boundary (#1167)', () => {
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
      input: { email: 'dup@acme.example.com', organization_id: 'org_1' },
      user: { id: 'usr_1', organizationId: 'org_1' },
      engine: makeSandboxEngine({
        crm_contact: [{ id: 'con_existing', organization_id: 'org_1', email: 'dup@acme.example.com' }],
      }),
    });
    expectEnvelope(err, 'duplicate', 'contact_integrity', /already exists/);
  });

  it('locked — opportunity_lifecycle freezes a closed deal', async () => {
    const err = await refusalFrom(oppGuard, {
      event: 'beforeUpdate',
      input: { id: 'opp_1', amount: 999 },
      previous: { id: 'opp_1', name: 'Big Deal', stage: 'closed_won', amount: 100 },
      user: { id: 'usr_1' },
    });
    expectEnvelope(err, 'locked', 'opportunity_lifecycle', /is closed \(closed_won\)/);
  });

  it('delete_restricted — product_catalog holds a referenced product', async () => {
    const err = await refusalFrom(productGuard, {
      event: 'beforeDelete',
      input: {},
      previous: { id: 'prod_1', name: 'Widget' },
      engine: makeSandboxEngine({
        crm_opportunity_line_item: [{ id: 'oli_1', crm_product: 'prod_1' }],
      }),
    });
    expectEnvelope(err, 'delete_restricted', 'product_catalog', /Cannot delete product/);
  });

  it('prohibited — task_do_not_call_guard refuses a call on a flagged lead', async () => {
    const err = await refusalFrom(taskGuard, {
      event: 'beforeInsert',
      input: { type: 'call', status: 'not_started', related_to_lead: 'lead_dnc' },
      engine: makeSandboxEngine({
        crm_lead: [{ id: 'lead_dnc', do_not_call: true }],
      }),
    });
    expectEnvelope(err, 'prohibited', 'task_do_not_call_guard', /flagged Do Not Call/);
  });
});

// ─────────────────────────────────────── the in-process path, same envelope ──

/**
 * The SAME five classes through the handler closure rather than the sandbox.
 *
 * Not redundant with the block above, for two reasons that pull in opposite
 * directions. The shipped path is what users get, so it is where the envelope
 * has to be true — but it runs inside QuickJS, where the source is a string and
 * v8 coverage cannot see it, so a guard tested only there reads as dead code.
 * The in-process path is the one #1075's original observation was taken on, and
 * it is the path every other runtime test in this repo drives.
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
};

const inProcess = async (hook: AnyRec, opts: AnyRec): Promise<unknown> =>
  hook.handler(makeCtx(opts as never)).then(
    () => null,
    (e: unknown) => e,
  );

describe('the same envelope on the in-process path (#1075)', () => {
  it('invalid_value — account_protection', async () => {
    expectInProcess(
      await inProcess(accountGuard, {
        event: 'beforeInsert',
        input: { name: 'Acme', website: 'ftp://nope.example.com' },
      }),
      'invalid_value',
      /must start with http/,
    );
  });

  it('duplicate — contact_integrity', async () => {
    expectInProcess(
      await inProcess(contactGuard, {
        event: 'beforeInsert',
        input: { email: 'dup@acme.example.com', organization_id: 'org_1' },
        user: { id: 'usr_1', organizationId: 'org_1' },
        api: makeHarness({
          crm_contact: [{ id: 'con_existing', organization_id: 'org_1', email: 'dup@acme.example.com' }],
        }).api,
      }),
      'duplicate',
      /already exists/,
    );
  });

  it('locked — opportunity_lifecycle', async () => {
    expectInProcess(
      await inProcess(oppGuard, {
        event: 'beforeUpdate',
        input: { id: 'opp_1', amount: 999 },
        previous: { id: 'opp_1', name: 'Big Deal', stage: 'closed_won', amount: 100 },
        user: { id: 'usr_1' },
      }),
      'locked',
      /is closed \(closed_won\)/,
    );
  });

  it('delete_restricted — product_catalog', async () => {
    expectInProcess(
      await inProcess(productGuard, {
        event: 'beforeDelete',
        previous: { id: 'prod_1', name: 'Widget' },
        api: makeHarness({
          crm_opportunity_line_item: [{ id: 'oli_1', crm_product: 'prod_1' }],
        }).api,
      }),
      'delete_restricted',
      /Cannot delete product/,
    );
  });

  it('prohibited — task_do_not_call_guard', async () => {
    expectInProcess(
      await inProcess(taskGuard, {
        event: 'beforeInsert',
        input: { type: 'call', status: 'not_started', related_to_lead: 'lead_dnc' },
        api: makeHarness({ crm_lead: [{ id: 'lead_dnc', do_not_call: true }] }).api,
      }),
      'prohibited',
      /flagged Do Not Call/,
    );
  });

  it('prohibited — event_do_not_call_guard, the twin guard on the other object', async () => {
    expectInProcess(
      await inProcess(hookNamed(eventHooks, 'event_do_not_call_guard'), {
        event: 'beforeInsert',
        input: { type: 'call', status: 'planned', related_to_lead: 'lead_dnc' },
        api: makeHarness({ crm_lead: [{ id: 'lead_dnc', do_not_call: true }] }).api,
      }),
      'prohibited',
      /flagged Do Not Call/,
    );
  });
});
