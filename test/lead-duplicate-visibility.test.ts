// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { AutomationEngine } from '@objectstack/service-automation';
import { LeadConversionFlow } from '../src/sales/flows/lead-conversion.flow';
import stack, { type AnyRec } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

const objects: AnyRec[] = (stack as AnyRec).objects ?? [];
const pages: AnyRec[] = (stack as AnyRec).pages ?? [];

/**
 * The suspected-duplicate flag reaches the two surfaces that can act on it (#1207).
 *
 * `lead_duplicate_check` (`src/sales/objects/lead.hook.ts`, job 2) detects a
 * re-captured email at intake, writes `duplicate_status: 'suspected'` and links
 * the record the lead repeats. Both halves worked. Neither reached a rep: the
 * record page never mentioned the flag, and `Convert Lead` asked one question
 * ("create an opportunity?") without ever looking at it — so a flagged lead
 * converted into a SECOND account, contact and opportunity, two reps worked the
 * same buyer, and the pipeline counted the deal twice.
 *
 * The `suspected_duplicates` queue view is not the answer to that and is not
 * touched here: it is the reviewer's slow path. This file pins the fast path —
 * the rep who has the record open, and the rep who is one click from converting
 * it.
 *
 * ## The two surfaces
 *
 * | surface | carries |
 * | ------- | ------- |
 * | the lead's record page: the Duplicate Management section, open on arrival | Duplicate Status and the record it repeats |
 * | `lead_conversion` edges `e21`/`e22`/`e25` | the warning on Suspected, the refusal on Confirmed |
 *
 * Until 2026-11-25 the record page also carried two banners, one per verdict
 * (#1628), in the `alerts` slot of an authored lead page. The maintainer
 * deleted that page with them (#2740, 「2A+ 删甘特图」) and, in the same ruling,
 * had the Duplicate Management section open expanded. It was then the last of
 * ten sections, below the fold at 1440 px (measured 2026-11-25), so the
 * maintainer moved it to second place, right after Identity (「挪到第 2 位」,
 * 2026-11-26): the verdict is on the first screen without a click or a
 * scroll. The control did not move: the conversion screen warns
 * on a suspected duplicate and refuses a confirmed one, pinned below on the
 * real engines.
 */

describe('lead record page — the duplicate verdict in an expanded section', () => {
  it('the lead authors no record page: its Details body is the default page\'s (#2740)', () => {
    expect(pages.filter((p) => p.object === 'crm_lead').map((p) => p.name)).toEqual([]);
  });

  it('the Duplicate Management section is second and opens expanded, so the verdict is on the first screen (#2740)', () => {
    // `collapse: 'expanded'` is the spec's "collapsible, starts open"
    // (ADR-0085). It was `collapsed` while a banner announced the verdict above
    // the fields; with the banner gone, a folded section would hide it. The
    // default page draws the groups in declaration order, so index 1 puts it
    // right under Identity (maintainer, 2026-11-26: 「挪到第 2 位」).
    const lead = objects.find((o) => o.name === 'crm_lead') ?? {};
    const keys = ((lead.fieldGroups ?? []) as AnyRec[]).map((g) => g.key);
    expect(keys.slice(0, 2), 'Duplicate Management is no longer right after Identity').toEqual(['identity', 'duplicates']);
    const group = ((lead.fieldGroups ?? []) as AnyRec[]).find((g) => g.key === 'duplicates');
    expect(group, 'crm_lead declares no `duplicates` field group').toBeDefined();
    expect(group!.collapse).toBe('expanded');
    expect(lead.fields?.duplicate_status?.group).toBe('duplicates');
  });

  it('names the record it repeats, through the fields that carry the link', () => {
    // This section is what the rep reads, and opens to compare. The Details
    // body is the default page's, drawn from crm_lead's `fieldGroups`: every
    // declared group is a section, in declaration order, so the verdict and
    // the link are the `duplicates` GROUP. A section whose fields are all
    // empty renders nothing, so it hides itself on a clean lead.
    const lead = objects.find((o) => o.name === 'crm_lead') ?? {};
    const groups = ((lead.fieldGroups ?? []) as AnyRec[]).map((g) => g.key);
    expect(groups, 'crm_lead declares no `duplicates` field group').toContain('duplicates');
    const members = Object.entries((lead.fields ?? {}) as Record<string, AnyRec>)
      .filter(([, f]) => f?.group === 'duplicates' && f?.hidden !== true)
      .map(([name]) => name);

    // BOTH survivor lookups, not just `duplicate_of_lead`: the intake hook
    // matches CONTACTS first and only then open leads, so a suspected lead's
    // survivor is a `crm_contact` at least as often as a `crm_lead`.
    expect(members).toEqual(
      expect.arrayContaining([
        'duplicate_status', 'duplicate_of_type', 'duplicate_of_lead', 'duplicate_of_contact',
      ]),
    );

    // The default page leaves every field of the highlight strip (the object's
    // `highlightFields`) out of the body, so a field in both places renders
    // only in the strip — and a duplicates group emptied that way would drop
    // the link entirely. Keep them disjoint.
    const strip: string[] = lead.highlightFields ?? [];
    expect(strip.filter((f) => members.includes(f))).toEqual([]);
  });
});

/**
 * The conversion half, run through the REAL automation engine.
 *
 * The assertions are about the `ScreenSpec` the server puts on the wire, which
 * is exactly what the console renders: `FlowRunner.tsx` draws
 * `{screen.description && <DialogDescription>{screen.description}</DialogDescription>}`.
 * The executor interpolates `config.description` before sending it, and maps a
 * null result to `undefined` — which is how one authored line can be present on
 * a flagged lead and absent (not blank) on a clean one.
 */
/*
 * On the shipped app booted by `@objectstack/verify`: the converter starts the
 * screen flow on a lead (`flows.run`) and submits the screen it stops on
 * (`flows.resume`), and what the conversion wrote is read back off the engine.
 * The converter is a sales MANAGER: a sales rep's conversion into a NEW
 * account is refused on 17.7.0 (the flow writes `annual_revenue`, which
 * `sales_rep` may not edit) — see `test/flow-conversion.test.ts`. The survivor
 * records are real rows; every lead is a fixture of its own, with its own
 * company and email, written as the system with the duplicate verdict a
 * reviewer (or `lead_duplicate_check`) would have left on it.
 */
let verify: VerifyStack;
let converter: Person;
let survivorLeadId: string;
let survivorContactId: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  converter = await signUpPerson(verify, 'manager@lead-duplicate-visibility.test', {
    name: 'Converting Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
  });
  const [survivorLead] = await verify.seed('crm_lead', [{
    first_name: 'Theo', last_name: 'Park', company: 'Skyline Media Survivor', email: 'survivor@skylinemedia.example.com',
    status: 'contacted', owner_id: converter.id,
  }]);
  const [account] = await verify.seed('crm_account', [{ name: 'Skyline Media Customer', owner_id: converter.id }]);
  const [survivorContact] = await verify.seed('crm_contact', [{
    first_name: 'Theo', last_name: 'Park', email: 'survivor.contact@skylinemedia.example.com',
    crm_account: account!.id, owner_id: converter.id,
  }]);
  survivorLeadId = String(survivorLead!.id);
  survivorContactId = String(survivorContact!.id);
}, 120_000);

/**
 * A qualified lead with `over` applied — its own company and email, so what
 * its conversion creates is read over this lead alone. The duplicate keys are
 * written only when a case adds them.
 */
const seedLead = async (over: Rec = {}): Promise<Rec> => {
  const n = ++k;
  const [lead] = await verify.seed('crm_lead', [{
    first_name: 'Wei', last_name: 'Zhang',
    company: `Skyline Media ${n}`,
    email: `theo.park.${n}@skylinemedia.example.com`,
    phone: '555-0100', title: 'Buyer', lead_source: 'web',
    status: 'qualified', need_type: 'new_implementation', estimated_amount: 40_000, is_converted: false, owner_id: converter.id,
    ...over,
  }]);
  const [stored] = await verify.rows('crm_lead', { id: lead!.id });
  for (const key of ['duplicate_status', 'duplicate_of_type', 'duplicate_of_lead', 'duplicate_of_contact']) {
    if (key in over) expect(stored![key] ?? null, `the fixture lost ${key}`).toBe(over[key] ?? null);
  }
  return stored!;
};

async function startConversion(lead: Rec) {
  const started: AnyRec = await verify.flows.run('lead_conversion', { recordId: lead.id }, { as: converter.token });
  const screen: AnyRec | null = started.screen ?? started.output?.screen ?? null;
  return { started, screen };
}

/**
 * What the console posts for a field it prefilled.
 *
 * The runner seeds its value state from EVERY field carrying a `defaultValue`
 * — visible or not — and submits that bag whole; `visibleWhen` gates only the
 * required-completeness check. So reading the value back off the descriptor is
 * what these fixtures would post for real, and it keeps them from restating
 * the conversion's +90-day literal, which the flow authors in exactly one
 * place on purpose (#1155's rule, applied to `closeDate` by #1708). A prefill
 * that stopped arriving comes back here as an absent key, and the screen's own
 * `required` then fails the resume — which is the point.
 */
const prefillOf = (screen: AnyRec | null, name: string): unknown =>
  ((screen?.fields ?? []) as AnyRec[]).find((f) => f.name === name)?.defaultValue;

/**
 * Everything the conversion of `lead` WROTE, counted off the engine.
 *
 * The three states of #1288 differ in exactly this, so every pin below reads
 * the same numbers rather than asserting on the shape of a screen: "the dialog
 * said no" and "nothing was created" are two different claims, and only the
 * second one is the refusal.
 */
const productsOf = async (lead: Rec) => {
  const accounts = await verify.rows('crm_account', { name: lead.company });
  const ids = accounts.map((a) => a.id);
  const [after] = await verify.rows('crm_lead', { id: lead.id });
  return {
    accounts: accounts.length,
    contacts: ids.length ? (await verify.rows('crm_contact', { crm_account: { $in: ids } })).length : 0,
    opportunities: ids.length ? (await verify.rows('crm_opportunity', { crm_account: { $in: ids } })).length : 0,
    isConverted: Boolean(after!.is_converted),
    leadStatus: after!.status,
  };
};

/** Nothing at all — the shape a refused conversion leaves behind. */
const NOTHING_CONVERTED = {
  accounts: 0, contacts: 0, opportunities: 0, isConverted: false, leadStatus: 'qualified',
};
/** One of each, lead stamped — the shape an allowed conversion leaves behind. */
const FULLY_CONVERTED = {
  accounts: 1, contacts: 1, opportunities: 1, isConverted: true, leadStatus: 'converted',
};

/**
 * Start the conversion AND submit the screen it stops on, whichever that is.
 *
 * The resume is what makes an "it refused" pin mean something: a run that has
 * merely paused has not created anything YET on any branch, so a test that
 * stopped at the pause would pass identically on a flow with no refusal in it.
 * Submitting the refusal dialog is also the rep's most likely next click, and
 * the state after it is the claim — the refusal branch reaches `end` without
 * passing a single create/update node.
 */
async function convert(lead: Rec) {
  const { started, screen } = await startConversion(lead);
  expect(started.error ?? null, 'the run failed before it reached a screen').toBeNull();
  expect(started.status, 'the conversion never suspended on a screen').toBe('paused');
  const done: AnyRec = await verify.flows.resume(started as never, {
    createOpportunity: true, opportunityName: `Skyline Deal ${lead.company}`, opportunityAmount: 50_000,
    closeDate: prefillOf(screen, 'closeDate'),
  }, { as: converter.token });
  return { screen, done, products: await productsOf(lead) };
}

describe('lead_conversion — the warning at the moment of conversion', () => {
  it('warns on a suspected duplicate, and says what this conversion will actually do (#2571)', async () => {
    const lead = await seedLead({
      duplicate_of_type: 'crm_lead',
      duplicate_of_lead: survivorLeadId,
      duplicate_status: 'suspected',
    });
    const { screen } = await startConversion(lead);

    expect(screen, 'the conversion screen never suspended').toBeTruthy();
    const description = String(screen!.description ?? '');
    expect(description, 'the conversion screen says nothing about the duplicate')
      .toContain('Suspected duplicate');
    // The warning is the pack's own sentence now (#2571), so it cannot carry
    // the email; it points the rep at the linked record on the lead page. It
    // no longer claims a "second account, contact and opportunity": the next
    // two sentences say which account and contact THIS run ends on, and here
    // no account or contact the converter can see matches, so both are new.
    expect(description).toContain('Compare the linked record on the lead page');
    expect(description).not.toContain('second account, contact and opportunity');
    expect(description).toContain(`converting creates a new account named ${lead.company}.`);
    expect(description).toContain('so converting creates a new contact named');

    // #1243's house rule: a sentence a user reads names a record the way the UI
    // names it. The id belongs in `duplicate_of_lead` — the relationship field
    // that exists to carry it — and on the page, where it is a link.
    expect(description, 'a raw record id reached a human-readable warning')
      .not.toContain(survivorLeadId);
  });

  it('warns just the same when the survivor is a CONTACT', async () => {
    // The commoner half of the flagged population, and the half the card's own
    // suggested route (a `duplicate_of_lead` link) would have missed:
    // `lead_duplicate_check` scans `crm_contact` FIRST and only falls through
    // to open leads. A warning gated on the lead lookup would be silent here.
    const { screen } = await startConversion(await seedLead({
      duplicate_of_type: 'crm_contact',
      duplicate_of_contact: survivorContactId,
      duplicate_status: 'suspected',
    }));

    const description = String(screen!.description ?? '');
    expect(description).toContain('Suspected duplicate');
    expect(description).not.toContain(survivorContactId);
  });

  it('says NOTHING on a clean lead, and still converts it', async () => {
    // Two claims in one run, and the second is the important one: the edge
    // conditions are interpreted CEL on every run, so an unguarded
    // `vars.leadRecord.duplicate_status` read would abort HERE — on the record
    // shape that omits the column — and take the whole conversion with it. A
    // green "no warning" assertion alone would not have noticed, because a
    // failed run has no screen at all.
    const lead = await seedLead();
    const { started, screen } = await startConversion(lead);

    expect(started.error ?? null, 'the run failed before it could show the screen').toBeNull();
    expect(started.status).toBe('paused');
    expect(screen, 'the conversion screen never suspended').toBeTruthy();
    // The body text carries the account notice on every conversion since
    // #2073 item 8, so "says nothing" is read as the warning's absence.
    expect(String(screen!.description ?? ''), 'a clean lead was warned about being a duplicate')
      .not.toContain('Suspected duplicate');

    const done: AnyRec = await verify.flows.resume(started as never, {
      createOpportunity: true, opportunityName: `Skyline Deal ${lead.company}`, opportunityAmount: 50_000,
      closeDate: prefillOf(screen, 'closeDate'),
    }, { as: converter.token });
    expect(done.error ?? null, 'the clean lead could no longer be converted').toBeNull();
    const products = await productsOf(lead);
    expect(products.accounts).toBe(1);
    expect(products.isConverted).toBe(true);
  });

  it('still collects the conversion inputs it always did', async () => {
    // Anti-regression on the reorder: `get_lead` now runs BEFORE the screen, so
    // the screen's own contract is worth re-stating here — a screen that lost
    // its fields would still pass every assertion above.
    //
    // ## Why this list grew by one (#1708), on purpose
    //
    // `closeDate` is the widening this pin exists to catch, and catching it is
    // what made the decision explicit rather than incidental: the flow used to
    // stamp `crm_opportunity.close_date` at `TODAY() + 90` inside
    // `create_opportunity`, where no rep ever saw it, and `close_date` is what
    // files a deal into a forecast PERIOD. Surfacing it moves a number out of
    // the flow body and onto a screen, which is exactly the kind of change a
    // conversion screen should not be able to make quietly — so the list is
    // still EXACT and still ordered. It is not `toContain`, not a length
    // check, and not a subset: the next field added here has to be argued the
    // same way this one was.
    const { screen } = await startConversion(await seedLead());
    const fields = (screen!.fields ?? []) as AnyRec[];
    expect(fields.map((f) => f.name)).toEqual([
      'createOpportunity', 'opportunityName', 'opportunityAmount', 'closeDate',
    ]);
    expect(fields[0].defaultValue, 'the declared default no longer reaches the client')
      .toBe(false);
  });
});

/**
 * The refusal, and the three states it partitions the flag into (#1288).
 *
 * Ruled 2026-08-31: interception stands on a PERSON's judgement. A lead a
 * reviewer marked `confirmed` is refused conversion, with copy naming the
 * verdict and the surviving record; the machine's `suspected` guess keeps
 * #1207's warn-and-allow, because `lead_duplicate_check` matches on email
 * EQUALITY and shared inboxes make false positives certain — blocking on a
 * guess would need an override flag, and an override flag is the shape this
 * exhibit must not demonstrate.
 *
 * ## Why these pins read the outcome AND the store
 *
 * The refusal is a refusing `end` (`outcome: 'refused'`): the run ends there,
 * `refused` and never resumable, so there is no dialog to submit. Each case
 * reads that outcome and counts what the store holds in ONE object — the
 * refusal is the outcome and the four zeroes together, not the dialog. Until
 * #2060 item 2c it was a message-only screen whose Submit completed the run,
 * and the console toasted "Lead converted successfully!" over it.
 *
 * ## The before-picture these replace
 *
 * Measured on the parent commit of #1288, on the flow harness of the time: a `confirmed` lead
 * suspended on `screen_1` with NO description (the #1207 warning is gated on
 * `suspected`) and then converted — one account, one contact, one opportunity,
 * `is_converted: true`. All three of `crm_lead` / `crm_contact` / `erased`
 * survivors did. That is the behaviour the changeset announces changing.
 */
describe('lead_conversion — a confirmed duplicate is refused (#1288)', () => {
  const CONFIRMED_SURVIVORS: Array<[string, () => Rec]> = [
    ['a still-open lead', () => ({ duplicate_of_type: 'crm_lead', duplicate_of_lead: survivorLeadId })],
    ['a contact the prospect already became', () => ({ duplicate_of_type: 'crm_contact', duplicate_of_contact: survivorContactId })],
    // `erased` is not an exotic third case, it is the state `lead.hook.ts`
    // (job 1c) leaves behind when the survivor is deleted: the pointer goes,
    // the VERDICT stays `confirmed` on purpose. So the refusal has to hold for
    // a lead whose survivor no longer exists — and the copy has to stay true
    // for it, which is why it names the section rather than a record.
    ['a survivor that has since been erased', () => ({ duplicate_of_type: 'erased' })],
  ];

  /** Start the conversion of `lead`; the run's outcome, its refusal and the store. */
  const refusalOf = async (lead: Rec) => {
    const { started } = await startConversion(lead);
    return {
      outcome: { success: started.success, status: started.status, runId: started.runId, screen: started.screen },
      message: String(started.refusalMessage ?? ''),
      products: await productsOf(lead),
    };
  };

  it.each(CONFIRMED_SURVIVORS)('refuses, and creates nothing — %s', async (_label, link) => {
    const { outcome, message, products } = await refusalOf(await seedLead({ ...link(), duplicate_status: 'confirmed' }));

    expect({ ...outcome, ...products }, 'the run did not end refused, or a confirmed duplicate was converted anyway').toEqual({
      success: true, status: 'refused', runId: undefined, screen: undefined, ...NOTHING_CONVERTED,
    });
    expect(message, 'the rep is not told why').not.toBe('');
  });

  it('says why, naming the verdict and where the surviving record is', async () => {
    const lead = await seedLead({
      duplicate_of_type: 'crm_lead', duplicate_of_lead: survivorLeadId,
      duplicate_status: 'confirmed',
    });
    const { message: description } = await refusalOf(lead);
    expect(description, 'the refusal does not say the conversion was refused').toContain('refused');

    // The ruling's item 1, both halves. The VERDICT, in the vocabulary the
    // record itself publishes: `duplicate_status`'s label is "Duplicate Status"
    // and its `confirmed` option's label is "Confirmed" in every locale pack,
    // so the sentence is readable against the field the rep can see.
    expect(description, 'the refusal never says which verdict stopped it')
      .toContain('Duplicate Status is Confirmed');
    expect(description, 'the refusal does not say a person recorded the verdict')
      .toMatch(/reviewer/);

    // The SURVIVOR, named through the fields that carry it. `duplicate_of_lead`
    // / `duplicate_of_contact` hold ids, and #1243's house rule keeps an id out
    // of any sentence a user reads — so the copy names the `duplicates` field
    // group by its shipped label and sends the rep to the links themselves.
    const groupLabel = ((objects.find((o) => o.name === 'crm_lead') as AnyRec)
      ?.fieldGroups as AnyRec[] | undefined)?.find((g) => g.key === 'duplicates')?.label;
    expect(groupLabel, 'crm_lead no longer declares a `duplicates` field group').toBeTruthy();
    expect(description, 'the refusal does not point at the surviving record')
      .toContain(String(groupLabel));
    expect(description).toContain('surviving record');

    // …and no id reached it, on either lookup.
    expect(description).not.toContain(survivorLeadId);
    expect(description).not.toContain(survivorContactId);
    expect(description).not.toContain(lead.id);

    // ⛔ No override hatch is offered — AGENTS.md metadata rule 8. The way out
    // is revising the verdict itself, which is a reviewer's edit on a field
    // that carries `trackHistory: true`, not a flag on this dialog.
    expect(description.toLowerCase()).not.toMatch(/convert anyway|override|ignore this|proceed anyway/);
  });

  it('leaves the machine\'s guess alone: suspected still warns AND converts', async () => {
    // The other half of the ruling, and the half a careless widening would
    // take with it. The warning's wording is pinned above; what this adds is
    // that the run still finishes.
    const { screen, done, products } = await convert(await seedLead({
      duplicate_of_type: 'crm_lead', duplicate_of_lead: survivorLeadId,
      duplicate_status: 'suspected',
    }));

    expect(screen!.nodeId, 'a suspected duplicate was routed to the refusal').toBe('screen_1');
    expect(String(screen!.description ?? '')).toContain('Suspected duplicate');
    expect(done.error ?? null, 'a suspected lead could no longer be converted').toBeNull();
    expect(products, 'the warn-and-allow branch stopped converting').toEqual(FULLY_CONVERTED);
  });

  it('clearing the verdict restores conversion, with the link still on the record', async () => {
    // The ruling's third state. `duplicate_status: null` with the survivor
    // pointer LEFT IN PLACE is the sharp version of it: the refusal has to be
    // reading the verdict, not the presence of a duplicate link. (What a
    // reviewer has to write to get here, and the one spelling that does NOT,
    // is measured in `test/lead-duplicate-link-cleanup.test.ts`.)
    const { screen, products } = await convert(await seedLead({
      duplicate_of_type: 'crm_lead', duplicate_of_lead: survivorLeadId,
      duplicate_status: null,
    }));

    expect(screen!.nodeId, 'a lead with no verdict was still refused').toBe('screen_1');
    // The body text carries the account notice on every conversion since
    // #2073 item 8, so "no warning" is read as the warning's absence, not the
    // description's.
    expect(String(screen!.description ?? ''), 'a lead with no verdict was warned about one').not.toContain('Suspected duplicate');
    expect(products, 'clearing the verdict did not restore conversion').toEqual(FULLY_CONVERTED);
  });
});

/**
 * The three branches PARTITION — measured, not read off the source.
 *
 * A `decision` node that declares no `config.conditions` reports no branch, so
 * traversal takes EVERY out-edge whose condition holds, in parallel. Adding
 * `e25` to a `decision_duplicate` whose "Clean" edge still said
 * `!= "suspected"` would therefore have refused a confirmed lead AND converted
 * it in the same run — a green refusal pin sitting on top of a conversion that
 * still happened. So the exclusivity is pinned separately from the behaviour,
 * on the real evaluator, across every record shape a driver can produce.
 */
describe('the duplicate decision answers with exactly one branch', () => {
  const silent: AnyRec = { info() {}, warn() {}, error() {}, debug() {}, trace() {} };
  silent.child = () => silent;
  const engine = new AutomationEngine(silent as never);

  const evaluate = (source: string, vars: AnyRec) =>
    (engine as unknown as {
      evaluateCondition(e: unknown, v: Map<string, unknown>): boolean;
    }).evaluateCondition({ dialect: 'cel', source }, new Map(Object.entries(vars)));

  const edges = (LeadConversionFlow.edges ?? []) as AnyRec[];
  const outOfDecision = edges.filter((e) => e.source === 'decision_duplicate');

  /** Every shape `get_lead` can bind, including the ones that used to abort. */
  const SHAPES: Array<[string, AnyRec]> = [
    ['leadRecord unbound', {}],
    ['leadRecord null (findOne missed)', { leadRecord: null }],
    ['column absent (driver-memory / driver-mongodb)', { leadRecord: { id: 'lead_1' } }],
    ['column null (driver-sql)', { leadRecord: { duplicate_status: null } }],
    ['suspected', { leadRecord: { duplicate_status: 'suspected' } }],
    ['confirmed', { leadRecord: { duplicate_status: 'confirmed' } }],
    ['a value neither option declares', { leadRecord: { duplicate_status: 'merged' } }],
  ];

  it('routes the three verdicts to three different nodes', () => {
    expect(outOfDecision.map((e) => e.id).sort()).toEqual(['e21', 'e22', 'e25']);
    expect(outOfDecision.map((e) => e.target).sort()).toEqual(
      ['no_duplicate_warning', 'refuse_confirmed_duplicate', 'warn_duplicate'],
    );
    // No `config.conditions` on the node ⇒ the edges are the whole branching
    // model, which is what makes the exclusivity below load-bearing (#4414).
    const decision = (LeadConversionFlow.nodes as AnyRec[]).find((n) => n.id === 'decision_duplicate');
    expect(decision?.config?.conditions ?? null).toBeNull();
  });

  it.each(SHAPES)('answers with exactly one live edge — %s', (_name, vars) => {
    const live = outOfDecision.filter((e) => {
      const source = typeof e.condition === 'string' ? e.condition : String(e.condition?.source ?? '');
      expect(source, `edge ${e.id} carries no condition`).not.toBe('');
      return evaluate(source, vars) === true;
    });
    expect(
      live.map((e) => e.id),
      'two branches of one decision were live at once — the refusal and the conversion ' +
        'would both run, in parallel, on the same lead',
    ).toHaveLength(1);
  });

  it('the narrowing on the Clean edge is what makes that true', () => {
    // Reverse verification, pinned rather than asserted: the PREVIOUS spelling
    // of `e22` — the one that shipped with #1207 — is rebuilt from the shipped
    // one by deleting the `confirmed` term, and it really does double-fire.
    const clean = outOfDecision.find((e) => e.id === 'e22')!;
    const shipped = String((clean.condition as AnyRec).source);
    const previous = shipped.replace(
      ' && vars.leadRecord.duplicate_status != "confirmed"', '',
    ).replace('(', '').replace(')', '');
    expect(previous, 'the shipped Clean edge no longer contains the term this removes')
      .not.toBe(shipped);

    const confirmed = { leadRecord: { duplicate_status: 'confirmed' } };
    expect(evaluate(shipped, confirmed), 'the shipped Clean edge fires on a confirmed lead')
      .toBe(false);
    expect(evaluate(previous, confirmed), 'the pre-#1288 Clean edge no longer double-fires — re-measure this')
      .toBe(true);
  });
});
