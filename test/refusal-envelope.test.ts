// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { extractHookBody } from '@objectstack/cli/hook-body';
import type { VerifyStack } from '@objectstack/verify';
import { ErrorCode } from '@objectstack/spec/api';
import { allHooks } from '../objectstack.composition';
import { REFUSAL_CODES, REFUSE_HELPER } from '../src/sales/objects/_refusal';
import { hookNamed } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, systemUpdate, runShippedHook, today, type Person } from './helpers/verify-stack';

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
    // `throw Object.assign(refuse(…), { reason, params })` is the catalogued
    // form (#2496): the same envelope, addressed to a declared sentence.
    const callers = LOWERED.filter((h) => /throw (Object\.assign\()?refuse\(/.test(h.source)).map((h) => h.name);
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
    // refusal of an acceptance the deal's approval holds to `quote_workflow`;
    // 23 until #2060 added the settled-quote line freeze to `quote_workflow`;
    // 24 until #2077 added the closed-deal line freeze; 25 until #2191 added
    // the approval-locked deal's line hold beside it; 26 until #2313 added the
    // standard price book's three refusals and the one-entry-per-product one;
    // 30 until #2285 added the conversion-marker refusal to
    // `account_protection`; 31 until #2334 added the large-deal close-won
    // refusal to `opportunity_lifecycle`; 32 until #2344 added
    // `campaign_member_enrollment_gate`'s three (a closed campaign, an
    // opted-out lead, an opted-out contact); 35 until #2366 added
    // `quote_workflow`'s refusal of a quote created at a settled status; 36
    // until #2318 added the price book's five: a quote line whose book has no
    // price for its product (one call in the shared price fill, swept once
    // per line object, so two), `quote_price_book`'s inactive-book and
    // book-change refusals, and `price_book_standard`'s refusal to delete a
    // book quotes price from; 41 until #2315 added `payment_plan_step_stamp`'s
    // refusal of a payment naming another contract's invoice; 42 until
    // #2316 phase 1a added Project Delivery's seven: the staffing row's
    // one-per-person refusal, the timesheet's
    // duplicate-period and approver-only refusals, the expense's approver-only
    // refusal, and the time entry's submitted-sheet freeze, out-of-period
    // date and not-staffed refusals; 49 until #2316 phase 1b added
    // `project_status_guard`'s three (a project created past Draft, Approved or
    // Rejected set by hand, a project sent for approval with no budget) and the
    // locked project's refusal of a submitted timesheet and a submitted expense;
    // 54 until the 1b review added `project_status_guard`'s refusal of an
    // approved budget changed by anyone but a Finance Controller; 55 until
    // #2491 added the timesheet's and the expense's refusal on a Closed or
    // Cancelled project; 57 until #2503 added `quote_total_rollup`'s second
    // look at a quote settled after the line freeze let a line in; 58 until
    // #2545 added the project task's three tree and predecessor refusals and
    // the time entry's refusal of another project's task; 62 until #2546
    // added the weekly entry's missing project and not-staffed refusals and
    // the time entry's refusal of another project than its timesheet's; 65
    // until #2547 swapped `project_status_guard`'s finance-only budget
    // refusal for its budget-not-ready one and added the budget version's
    // seven refusals and its lines' lock; 73 until hotcrm#2556 moved the
    // expense into its own module, whose `expense_decision_guard` keeps the
    // approver-only refusal and drops the two that read the project (a
    // Closed, Cancelled or locked project now turns the expense back in a
    // flow instead); 71 until #2555 added the sales order's line lock (in
    // `sales_order_workflow` and again in `sales_order_total_rollup`) and the
    // typed line's missing price; 74 until hotcrm#2559 retired per-expense
    // approval, so `expense_decision_guard`'s refusal went, and added
    // `expense_line_lock`'s three (an expense on a report in review, rejected
    // or decided) and `expense_report_rules`' six (a person deciding or
    // marking paid, an approved or paid report changed, a sent report
    // deleted, a report submitted with no expenses); 82 until hotcrm#2578
    // added the travel request's `expense_request_decision_guard`; 83 until
    // the #2596 review added `expense_line_lock`'s fourth (an expense's project
    // changed while it is on a report); 84 until hotcrm#2579 added
    // `expense_request_line_lock`, a leg added to, removed from or moved off a
    // submitted travel request; 85 until the seat order of 2026-11-17 added
    // `expense_request_delete_guard`, a sent travel request deleted; 86 until
    // hotcrm#2557 added the Order to Cash row stamp's refusal of a contract of
    // another account (one call in the shared stamp, swept once per object, so
    // three); 89 until hotcrm#2560 added the stamp's three order refusals (an
    // order of another account, a contract other than the order's, an order
    // and a contract of two accounts), each swept once per object, so nine;
    // 98 until hotcrm#2755 added `invoice_plan_step_guard`'s refusal of an
    // invoice naming another account's billing milestone; 99 until hotcrm#2761
    // added `expense_report_rules`' two refusals of deleting an approved or a
    // paid report, administrators included; 101 until hotcrm#2804 moved the
    // contract's end-date refusal out of `contract_validation` (one less) and
    // added `contract_form_and_change`'s eight (an order contract by hand on
    // insert and on update, the form's lock, the activated contract's locked
    // field, an order contract's value, Change on a contract that is not
    // activated, Change without its reason or amendment, a typed value on an
    // order contract); 108 until hotcrm#2826 added `sales_order_workflow`'s
    // two: the header amount of an order past Draft, and a typed Subtotal on
    // an order with lines.
    // The number is hand-maintained on purpose: a new refusal has to be a
    // deliberate edit here, so a guard that quietly stopped being swept cannot
    // hide behind a count that follows it.
    expect(sites).toHaveLength(110);
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
    // The accepted-quote close-won hook fires from an afterUpdate cascade when
    // the close-won failed for reasons the user neither caused nor can act on.
    // (Its sibling, the contract draft, was the third bare throw here until
    // hotcrm#2558 moved it into a packaged flow, whose failure is recorded on
    // its run and never reaches the accepting person either.) `resolveThrownHttpError` maps a bare Error to 500 /
    // INTERNAL_ERROR, which is the correct answer — an envelope would file a
    // broken cascade as user error. `product_title_mirror` (#2086) is the same
    // class: an async afterUpdate cascade whose throw, naming the lines that
    // kept a stale title, reaches only the `onError: 'log'` record, never the
    // person who renamed the product.
    expect(bare).toEqual(['product_title_mirror', 'quote_on_accepted']);
  });
});

// ───────────────────────────── the shipped path, one case per class (#1167) ──

const accountGuard = hookNamed('account_protection');
const contactGuard = hookNamed('contact_integrity');
const oppGuard = hookNamed('opportunity_lifecycle');
const productGuard = hookNamed('product_catalog');
const taskGuard = hookNamed('task_do_not_call_guard');
const leadGuard = hookNamed('lead_automation');
const lineGuard = hookNamed('opportunity_line_item_freeze');
const quoteGuard = hookNamed('quote_workflow');

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
    name: 'Envelope Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
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
  // A deal that closed, for the line-item freeze (#2338 item 15), and a lead
  // the conversion flow would have left behind, for the converted-lead lock
  // (item 14) — the lead written as the system, the way that flow writes it.
  row.closedDeal = await create('crm_opportunity', {
    name: 'Won Deal', crm_account: row.account, stage: 'proposal', amount: 100, close_date: today(),
  });
  await verify.hooks.run('crm_opportunity', 'update', { id: row.closedDeal, stage: 'closed_won', win_reason: 'better_price' }, { as: rep.token });
  const [converted] = await verify.seed('crm_lead', [{
    first_name: 'Ada', last_name: 'Lovelace', company: 'Acme', email: 'ada@acme.example.com', owner_id: rep.id,
    is_converted: true, status: 'converted', converted_date: '2026-01-01',
    converted_account: row.account, converted_contact: row.contact, converted_opportunity: row.opportunity,
  }]);
  row.convertedLead = String(converted!.id);
  // A quote that expired, for its line freeze (#2338 item 16) — settled the
  // way the expiry sweep settles one, as the system.
  const [quote] = await verify.seed('crm_quote', [{
    name: 'Envelope Quote', crm_account: row.account, crm_contact: row.contact, owner_id: rep.id,
    status: 'draft', quote_date: '2026-01-01', expiration_date: '2030-12-31', discount: 0, tax: 0, shipping_handling: 0,
  }]);
  row.expiredQuote = String(quote!.id);
  await systemUpdate(verify, 'crm_quote', { id: row.expiredQuote, status: 'expired' });
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
 * would leave the user-facing outcome unpinned. A site that passes its own
 * `userMessage` (the diagnostic keeps API names, the user sentence uses labels,
 * #2338 item 12) names that sentence as `userWording`, and the pin becomes:
 * the marked channel carries THAT sentence, not the diagnostic.
 */
const expectEnvelope = (
  err: AnyRec | null,
  cls: keyof typeof REFUSAL_CODES,
  hookName: string,
  wording: RegExp,
  userWording?: RegExp,
): void => {
  expect(err, `expected ${hookName} to refuse`).toBeTruthy();
  expect(err!.name, 'the shipped path re-throws as SandboxError').toBe('SandboxError');
  expect([err!.code, err!.status]).toEqual([REFUSAL_CODES[cls].code, REFUSAL_CODES[cls].status]);
  expect(String(err!.innerMessage)).toMatch(wording);
  expect(String(err!.message)).toBe(`hook '${hookName}' threw: Error: ${err!.innerMessage}`);
  if (userWording) {
    expect(String(err!.userMessage), 'the marked channel carries the user sentence').toMatch(userWording);
    expect(err!.userMessage).not.toBe(String(err!.innerMessage));
    return;
  }
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
    expectEnvelope(err, 'locked', 'opportunity_lifecycle', /is closed \(closed_won\)/, /is closed \(Closed Won\); only its Description and Next Steps can still be edited\.$/);
  });

  it('locked — opportunity_lifecycle refuses a large close-won its approval has not granted (#2350)', async () => {
    const err = await refusalFrom(oppGuard, {
      event: 'beforeUpdate',
      input: { id: row.opportunity, stage: 'closed_won', amount: 150000 },
      previous: { id: row.opportunity, name: 'Big Deal', stage: 'proposal', amount: 100, approval_status: 'not_required' },
      as: rep.token,
    });
    expectEnvelope(
      err, 'locked', 'opportunity_lifecycle',
      /moves to closed_won only once approval_status is approved; amount is 150000, approval_status is not_required\.$/,
      /^A deal of 100,000 or more needs Large Deal Approval before it can be Closed Won, and its Approval Status is Not Required\. Save the deal without closing it to send it for approval;/,
    );
  });

  it('locked — lead_automation freezes a converted lead', async () => {
    const err = await refusalFrom(leadGuard, {
      event: 'beforeUpdate',
      input: { id: row.convertedLead, company: 'Globex' },
      previous: { id: row.convertedLead, first_name: 'Ada', last_name: 'Lovelace', company: 'Acme', is_converted: true },
      as: rep.token,
    });
    expectEnvelope(err, 'locked', 'lead_automation', /\(attempted: company\)/, /^Cannot change Company on converted lead Ada Lovelace - Acme;/);
  });

  it('locked — opportunity_line_item_freeze freezes the lines of a closed deal', async () => {
    const err = await refusalFrom(lineGuard, {
      event: 'beforeInsert',
      input: { crm_opportunity: row.closedDeal, crm_product: row.product, quantity: 1, unit_price: 10 },
      as: rep.token,
    });
    expectEnvelope(err, 'locked', 'opportunity_line_item_freeze', /is closed \(closed_won\)/, /is closed \(Closed Won\), so its line items/);
  });

  it('locked — quote_workflow freezes the lines of a settled quote', async () => {
    const err = await refusalFrom(quoteGuard, {
      event: 'beforeInsert',
      object: 'crm_quote_line_item',
      input: { crm_quote: row.expiredQuote, crm_product: row.product, quantity: 1, unit_price: 10 },
      as: rep.token,
    });
    expectEnvelope(err, 'locked', 'quote_workflow', /Quote Envelope Quote is expired, so its line items/, /Quote Envelope Quote is Expired, so its line items/);
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
 *
 * A hook that declares a `refusals` catalogue (#2496) is the exception, by the
 * platform's design: its refusal is answered from the catalogue, re-thrown as
 * `SandboxError` whose `message` keeps the thrown sentence (the developer log)
 * and whose `innerMessage` and `userMessage` carry the declared sentence, in
 * the caller's language. `test/hook-refusal-catalogue.test.ts` holds what the
 * catalogue declares; here the envelope is held the same on both kinds.
 */
const expectInProcess = (
  err: unknown,
  cls: keyof typeof REFUSAL_CODES,
  wording: RegExp,
  userWording?: RegExp,
): void => {
  expect(err, `expected a refusal matching ${wording}`).toBeInstanceOf(Error);
  const e = err as AnyRec;
  if (e.name === 'SandboxError') {
    // A catalogued hook: the declared sentence is what the caller reads.
    expect(e.message).toMatch(/^hook '[a-z0-9_]+' threw: /);
    expect(e.message).toMatch(wording);
    expect([e.code, e.status]).toEqual([REFUSAL_CODES[cls].code, REFUSAL_CODES[cls].status]);
    expect(String(e.userMessage)).toMatch(userWording ?? wording);
    expect(e.userMessage, 'the declared sentence on both channels').toBe(e.innerMessage);
    return;
  }
  expect(e.name, 'in-process the error is NOT re-thrown as SandboxError').toBe('Error');
  expect(e.message).toMatch(wording);
  expect(e.innerMessage, 'only the sandbox adds innerMessage').toBeUndefined();
  expect([e.code, e.status]).toEqual([REFUSAL_CODES[cls].code, REFUSAL_CODES[cls].status]);
  // The mark is written by `refuse()`, so it is identical on both paths — here
  // `message` is unrewritten, so the two are the same string, unless the site
  // passed its own user sentence (see `expectEnvelope`).
  if (userWording) {
    expect(String(e.userMessage)).toMatch(userWording);
    expect(e.userMessage).not.toBe(e.message);
    return;
  }
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
      /is closed \(Closed Won\); only its Description and Next Steps can still be edited\.$/,
    );
  });

  it('locked — the large-deal close-won in opportunity_lifecycle (#2350)', async () => {
    // Seeded over the line: a seed write fires no record flow, so the deal
    // stands at `not_required` with no request — a recall's or an import's state.
    const [opp] = await verify.seed('crm_opportunity', [{
      name: `Large Deal ${++k}`, crm_account: row.account, stage: 'proposal', amount: 150000, close_date: today(), owner_id: rep.id,
    }]);
    expectInProcess(
      await inProcess('crm_opportunity', 'update', { id: opp!.id, stage: 'closed_won', win_reason: 'better_price' }),
      'locked',
      /approval_status is not_required\.$/,
      /and its Approval Status is Not Required\. Save the deal without closing it to send it for approval;/,
    );
  });

  it('locked — the converted-lead lock in lead_automation', async () => {
    expectInProcess(
      await inProcess('crm_lead', 'update', { id: row.convertedLead, company: 'Globex' }),
      'locked',
      /\(attempted: company\)/,
      /^Cannot change Company on converted lead Ada Lovelace - Acme;/,
    );
  });

  it('locked — opportunity_line_item_freeze', async () => {
    expectInProcess(
      await inProcess('crm_opportunity_line_item', 'insert', {
        crm_opportunity: row.closedDeal, crm_product: row.product, quantity: 1, unit_price: 10,
      }),
      'locked',
      /is closed \(closed_won\)/,
      /is closed \(Closed Won\), so its line items/,
    );
  });

  it('locked — the settled-quote line freeze in quote_workflow', async () => {
    expectInProcess(
      await inProcess('crm_quote_line_item', 'insert', {
        crm_quote: row.expiredQuote, crm_product: row.product, quantity: 1, unit_price: 10,
      }),
      'locked',
      /Quote Envelope Quote is expired, so its line items/,
      /Quote Envelope Quote is Expired, so its line items/,
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
