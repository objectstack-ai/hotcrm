// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { AutomationEngine } from '@objectstack/service-automation';
import { ExpressionEngine } from '@objectstack/formula';
import { LeadConversionFlow } from '../src/flows/lead-conversion.flow';
import { makeFlowHarness, type FlowHarness, type Rec } from './helpers/flow-harness';
import { type AnyRec, localePacks, objects, pages } from './helpers/metadata-fixtures';
import stack from '../objectstack.config';

/**
 * The suspected-duplicate flag reaches the two surfaces that can act on it (#1207).
 *
 * `lead_duplicate_check` (`src/objects/lead.hook.ts`, job 2) detects a
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
 * ## Two surfaces, two mechanisms, two different failure modes
 *
 * | surface | carries | unevaluable predicate ⇒ |
 * | ------- | ------- | ----------------------- |
 * | `lead_detail_page` `record:alert` | `properties.visible`, client CEL | FAIL-SOFT: banner SHOWN |
 * | `lead_conversion` edges `e21`/`e22`/`e25` | flow condition, server CEL | RUN FAILS |
 *
 * They fail in opposite directions and both are ugly: a fail-soft banner cries
 * wolf on every clean lead (and a warning nobody believes is worse than no
 * warning), while a failing run makes an ordinary lead unconvertible. One
 * discipline covers both — `has()` guards, so the predicate returns a VERDICT
 * for every record shape a driver can hand it, including the shapes where the
 * column is simply absent (`driver-memory` / `driver-mongodb`; `driver-sql`
 * returns it as null). This file measures that on the real engines rather than
 * asserting the text of the predicates.
 *
 * The same house rule, on its other three surfaces, is stated in
 * `test/object-validation-predicates.test.ts` (object `validations[]`),
 * `test/flow-condition-totality.test.ts` (record-change flow conditions) and
 * `test/view-predicate-dialect.test.ts` (view `visibleWhen`). This is the
 * fourth: a record PAGE component predicate.
 */

const LOCALES = ['en', 'zh-CN', 'ja-JP', 'es-ES'] as const;

/** Every component on a page, at any nesting depth. */
function componentsOf(node: unknown, out: AnyRec[] = []): AnyRec[] {
  if (Array.isArray(node)) {
    for (const item of node) componentsOf(item, out);
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  const rec = node as AnyRec;
  if (typeof rec.type === 'string') out.push(rec);
  for (const value of Object.values(rec)) {
    if (value && typeof value === 'object') componentsOf(value, out);
  }
  return out;
}

const leadPage: AnyRec | undefined = pages.find((p) => p.name === 'lead_detail_page');
const leadPageComponents = componentsOf(leadPage?.regions ?? []);
const duplicateAlert = leadPageComponents.find((c) => c.type === 'record:alert');
const leadFields = Object.keys(
  (objects.find((o) => o.name === 'crm_lead')?.fields ?? {}) as AnyRec,
);

/**
 * Evaluate a predicate the way the CONSOLE does.
 *
 * `record:alert`'s renderer hands `properties.visible` to `useCondition`, whose
 * `{ dialect: 'cel' }` branch routes to `evalFieldPredicate` → this same
 * `ExpressionEngine` (objectui `packages/core/src/evaluator/fieldRules.ts`).
 * The row binds under `record`, exactly as it does here.
 */
const evaluate = (source: string, record: Rec) =>
  ExpressionEngine.evaluate({ dialect: 'cel', source }, { record });

describe('lead record page — the duplicate banner', () => {
  it('ships a warning-severity `record:alert` on the lead detail page', () => {
    expect(leadPage, 'lead_detail_page is not registered').toBeDefined();
    expect(duplicateAlert, 'the lead detail page carries no record:alert').toBeDefined();
    expect(duplicateAlert!.properties?.severity).toBe('warning');
  });

  it('gates the banner with a CEL ENVELOPE, not a bare string', () => {
    // Not a style point. `ExpressionEvaluator.evaluateCondition` routes only an
    // explicit `{ dialect: 'cel' }` envelope to `@objectstack/formula`; a bare
    // string takes the legacy JS path, whose `FormulaFunctions` carries no CEL
    // `has()`. There the guard below would itself be the fault — and this call
    // site is fail-soft, so the banner would show on every lead. `P` from
    // `@objectstack/spec` is what produces the envelope.
    const visible = duplicateAlert!.properties?.visible;
    expect(visible, 'the banner has no visibility predicate — it would show on every lead')
      .toBeTruthy();
    expect(typeof visible).toBe('object');
    expect(visible.dialect).toBe('cel');
    expect(typeof visible.source).toBe('string');
    expect(visible.source.trim()).not.toBe('');
  });

  it('answers with a VERDICT on every record shape a driver can hand it', () => {
    const source: string = duplicateAlert!.properties.visible.source;

    // 1. A brand-new / clean lead on a driver that omits absent columns. This
    //    is the shape that decides whether the banner is trustworthy: an abort
    //    here answers SHOWN, and a duplicate warning on a lead that is not a
    //    duplicate teaches reps to dismiss the banner they need.
    expect(evaluate(source, {}), 'faults on a record with no keys at all')
      .toEqual({ ok: true, value: false });

    // 2. The same lead on `driver-sql`, which returns the column as null.
    //    `has()` is TRUE for a present-but-null key, so this shape is a
    //    different question from the one above, not a restatement of it —
    //    and since #1289 it is the shape that decides how the widening is
    //    SPELLED. `has(record.duplicate_status)` on its own is the obvious
    //    way to write "any value the record actually carries", and it is
    //    wrong: measured on this engine it answers TRUE here, which would put
    //    a duplicate banner on every clean lead `driver-sql` returns — the
    //    fail-soft cry-wolf this whole file exists to prevent, arrived at by
    //    a different road. The comparison beside the guard is what makes
    //    "set" mean set.
    expect(evaluate(source, { duplicate_status: null }))
      .toEqual({ ok: true, value: false });

    // 3. The lead the card is about.
    expect(evaluate(source, { duplicate_status: 'suspected' }))
      .toEqual({ ok: true, value: true });

    // 4. The boundary #1289 MOVED, and the line that was here to make the
    //    move deliberate did its job: this used to read `false`, with a
    //    comment saying widening to `confirmed` was a product call rather
    //    than a defect repair. The product call was taken — a human's
    //    `confirmed` verdict is STRONGER evidence than the machine's guess,
    //    and it was the one duplicate state the banner stayed silent on.
    //    Since #1288 it is also the state on which the app REFUSES to
    //    convert, so a rep who reaches Convert without a banner meets a
    //    refusal dialog with no warning on the record behind it.
    expect(evaluate(source, { duplicate_status: 'confirmed' }))
      .toEqual({ ok: true, value: true });
  });

  it('the guard is load-bearing — the unguarded spelling really does fault', () => {
    // Reverse verification of the premise, pinned rather than assumed: if a
    // future engine starts answering `false` for an absent key, this flips and
    // the next reader is told the premise changed instead of finding a guard
    // that protects nothing. The unguarded text is built from the shipped
    // predicate's own comparison so the two cannot drift apart.
    const source: string = duplicateAlert!.properties.visible.source;
    const unguarded = source.split('&&').pop()!.trim();
    expect(unguarded, 'the shipped predicate no longer ends in the comparison')
      .toContain('record.duplicate_status');

    const faulted = evaluate(unguarded, {});
    expect(faulted.ok, `\`${unguarded}\` answered on a keyless record — the guard is now decorative`)
      .toBe(false);

    // …and it is the ABSENT key that faults it, not the text: the same
    // predicate answers cleanly the moment the column is present.
    expect(evaluate(unguarded, { duplicate_status: 'suspected' })).toEqual({ ok: true, value: true });
  });

  it('carries its copy in all four shipped locales', () => {
    // `record:alert` resolves `title` / `body` through `pickLocalized(…,
    // language)`, so an inline `{ en, 'zh-CN', … }` map is a delivered
    // capability — and for `body` it is the ONLY channel: the i18n extractor's
    // per-component copy keys are title/description/label/placeholder/
    // emptyText/submitLabel, so a plain-string body would ship English to
    // every locale with nothing reporting it.
    const declared = (stack as AnyRec).i18n?.supportedLocales ?? [];
    expect([...declared].sort(), 'the app no longer ships these four locales')
      .toEqual([...LOCALES].sort());

    for (const key of ['title', 'body'] as const) {
      const copy = duplicateAlert!.properties?.[key];
      expect(copy, `the banner has no ${key}`).toBeTruthy();
      expect(typeof copy, `${key} is a bare string — three locales would read English`)
        .toBe('object');
      for (const locale of LOCALES) {
        expect(typeof copy[locale], `${key} has no ${locale} copy`).toBe('string');
        expect(copy[locale].trim().length, `${key}.${locale} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('describes the flag without asserting WHICH verdict it is (#1289)', () => {
    // The half of the widening that is not a predicate. One banner now covers
    // two states that mean different things — a machine's guess and a
    // person's verdict — and it has ONE title and ONE body with no
    // per-state channel: `record:alert` carries a single `visible`, and
    // `pickLocalized` picks by LANGUAGE, not by row. So the copy may not
    // assert either state, and the failure is silent and one-directional:
    // widening the predicate while leaving the old words behind labels every
    // `confirmed` lead "suspected" — telling a rep a reviewer's finished
    // verdict is a machine's guess, which is the one sentence this banner
    // must never say.
    //
    // The forbidden words are READ FROM the locale packs rather than typed
    // here, so this cannot drift from the option labels a rep actually sees
    // on the `duplicate_status` chip below the banner: renaming an option
    // re-aims the assertion instead of quietly retiring it.
    const packs = new Map(localePacks);
    expect([...packs.keys()].sort(), 'the locale packs no longer cover these four')
      .toEqual([...LOCALES].sort());

    for (const locale of LOCALES) {
      const options: AnyRec =
        packs.get(locale)?.objects?.crm_lead?.fields?.duplicate_status?.options ?? {};
      const verdicts = [options.suspected, options.confirmed].filter(
        (w): w is string => typeof w === 'string' && w.trim() !== '',
      );
      expect(verdicts.length, `${locale} has no duplicate_status option labels to check against`)
        .toBe(2);

      const copy = [
        duplicateAlert!.properties?.title?.[locale],
        duplicateAlert!.properties?.body?.[locale],
      ].join(' ');
      for (const verdict of verdicts) {
        expect(
          copy,
          `the ${locale} banner copy says "${verdict}" — it is shown on BOTH verdicts and may name neither`,
        ).not.toContain(verdict);
      }
    }
  });

  it('names the record it repeats, through the fields that carry the link', () => {
    // The banner says a record is repeated; this section is what the rep opens
    // to compare. It hides itself on a clean lead — `record:details` drops
    // empty fields and a section whose fields are ALL empty renders nothing
    // (`test/detail-section-dedup.test.ts` carries that measurement).
    const details = leadPageComponents.filter((c) => c.type === 'record:details');
    const sections: AnyRec[] = details.flatMap((d) => (d.properties?.sections ?? []) as AnyRec[]);
    const duplicates = sections.find((s) => s.name === 'duplicates');
    expect(duplicates, 'the Details tab has no `duplicates` section').toBeDefined();

    // BOTH survivor lookups, not just `duplicate_of_lead`: the intake hook
    // matches CONTACTS first and only then open leads, so a suspected lead's
    // survivor is a `crm_contact` at least as often as a `crm_lead`.
    expect(duplicates!.fields).toEqual(
      expect.arrayContaining([
        'duplicate_status', 'duplicate_of_type', 'duplicate_of_lead', 'duplicate_of_contact',
      ]),
    );
    for (const field of duplicates!.fields as string[]) {
      expect(leadFields, `crm_lead has no field \`${field}\``).toContain(field);
    }

    // The renderer drops any field the highlights strip already registered, so
    // a field listed in both places renders in neither reliably. Keep them
    // disjoint (the standing rule of `test/detail-section-dedup.test.ts`, which
    // exempts this page only for the duplicates it already had).
    const highlights = leadPageComponents.find((c) => c.type === 'record:highlights');
    const strip: string[] = highlights?.properties?.fields ?? [];
    expect(strip.filter((f) => (duplicates!.fields as string[]).includes(f))).toEqual([]);
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
const SURVIVOR_LEAD_ID = 'dfSlnObNu0oXwRk-';
const SURVIVOR_CONTACT_ID = '5B0nItHGRr768EfD';

const fold = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * A lead as the DRIVERS that omit absent columns hand it over — the duplicate
 * keys are genuinely missing unless a test adds them. That is the shape the
 * totality guards exist for, so it is the default here rather than a special
 * case.
 */
const seedLead = (over: Rec = {}): Rec => ({
  id: 'lead_1',
  first_name: 'Wei', last_name: 'Zhang',
  company: 'Skyline Media', company_normalized: fold('Skyline Media'),
  email: 'theo.park@skylinemedia.example.com',
  phone: '555-0100', title: 'Buyer', lead_source: 'web',
  status: 'qualified', is_converted: false,
  ...over,
});

async function startConversion(lead: Rec) {
  const harness = makeFlowHarness({ lead_conversion: LeadConversionFlow }, { crm_lead: [lead] });
  const started: AnyRec = await harness.engine.execute('lead_conversion', {
    params: { recordId: lead.id }, userId: 'user_1', event: 'manual',
  } as never);
  const screen: AnyRec | null = started.screen ?? started.output?.screen ?? null;
  return { harness, started, screen };
}

/**
 * Everything the flow WROTE, counted off the store.
 *
 * The three states of #1288 differ in exactly this, so every pin below reads
 * the same four numbers rather than asserting on the shape of a screen: "the
 * dialog said no" and "nothing was created" are two different claims, and only
 * the second one is the refusal.
 */
const productsOf = (harness: FlowHarness) => ({
  accounts: harness.store.crm_account?.length ?? 0,
  contacts: harness.store.crm_contact?.length ?? 0,
  opportunities: harness.store.crm_opportunity?.length ?? 0,
  isConverted: harness.store.crm_lead[0].is_converted === true,
  leadStatus: harness.store.crm_lead[0].status,
});

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
  const { harness, started, screen } = await startConversion(lead);
  const runId = started.runId ?? started.run?.id;
  expect(started.error ?? null, 'the run failed before it reached a screen').toBeNull();
  expect(started.status, 'the conversion never suspended on a screen').toBe('paused');
  const done: AnyRec = (await harness.resume(runId, {
    createOpportunity: true, opportunityName: 'Skyline Deal', opportunityAmount: 50_000,
  })) as AnyRec;
  return { harness, screen, done, products: productsOf(harness) };
}

describe('lead_conversion — the warning at the moment of conversion', () => {
  it('warns on a suspected duplicate, and names the record by its email', async () => {
    const { screen } = await startConversion(seedLead({
      duplicate_of_type: 'crm_lead',
      duplicate_of_lead: SURVIVOR_LEAD_ID,
      duplicate_status: 'suspected',
    }));

    expect(screen, 'the conversion screen never suspended').toBeTruthy();
    const description = String(screen!.description ?? '');
    expect(description, 'the conversion screen says nothing about the duplicate')
      .toContain('Suspected duplicate');
    expect(description, 'the warning does not name the record it repeats')
      .toContain('theo.park@skylinemedia.example.com');
    expect(description).toContain('second account, contact and opportunity');

    // #1243's house rule: a sentence a user reads names a record the way the UI
    // names it. The id belongs in `duplicate_of_lead` — the relationship field
    // that exists to carry it — and on the page, where it is a link.
    expect(description, 'a raw record id reached a human-readable warning')
      .not.toContain(SURVIVOR_LEAD_ID);
  });

  it('warns just the same when the survivor is a CONTACT', async () => {
    // The commoner half of the flagged population, and the half the card's own
    // suggested route (a `duplicate_of_lead` link) would have missed:
    // `lead_duplicate_check` scans `crm_contact` FIRST and only falls through
    // to open leads. A warning gated on the lead lookup would be silent here.
    const { screen } = await startConversion(seedLead({
      duplicate_of_type: 'crm_contact',
      duplicate_of_contact: SURVIVOR_CONTACT_ID,
      duplicate_status: 'suspected',
    }));

    const description = String(screen!.description ?? '');
    expect(description).toContain('Suspected duplicate');
    expect(description).not.toContain(SURVIVOR_CONTACT_ID);
  });

  it('says NOTHING on a clean lead, and still converts it', async () => {
    // Two claims in one run, and the second is the important one: the edge
    // conditions are interpreted CEL on every run, so an unguarded
    // `vars.leadRecord.duplicate_status` read would abort HERE — on the record
    // shape that omits the column — and take the whole conversion with it. A
    // green "no warning" assertion alone would not have noticed, because a
    // failed run has no screen at all.
    const { harness, started, screen } = await startConversion(seedLead());

    expect(started.error ?? null, 'the run failed before it could show the screen').toBeNull();
    expect(started.status).toBe('paused');
    expect(screen, 'the conversion screen never suspended').toBeTruthy();
    expect(screen!.description, 'a clean lead was warned about being a duplicate')
      .toBeUndefined();

    const runId = started.runId ?? started.run?.id;
    const done: AnyRec = (await harness.resume(runId, {
      createOpportunity: true, opportunityName: 'Skyline Deal', opportunityAmount: 50_000,
    })) as AnyRec;
    expect(done.error ?? null, 'the clean lead could no longer be converted').toBeNull();
    expect(harness.store.crm_account?.length).toBe(1);
    expect(harness.store.crm_lead[0].is_converted).toBe(true);
  });

  it('still collects the conversion inputs it always did', async () => {
    // Anti-regression on the reorder: `get_lead` now runs BEFORE the screen, so
    // the screen's own contract is worth re-stating here — a screen that lost
    // its fields would still pass every assertion above.
    const { screen } = await startConversion(seedLead());
    const fields = (screen!.fields ?? []) as AnyRec[];
    expect(fields.map((f) => f.name)).toEqual([
      'createOpportunity', 'opportunityName', 'opportunityAmount',
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
 * ## Why these pins resume the run instead of reading the screen
 *
 * A paused run has created nothing on ANY branch yet, so a pin that stopped at
 * the pause would be green against a flow with no refusal in it at all. Each
 * case below submits the screen it stopped on and then counts what the store
 * holds — the refusal is the four zeroes, not the dialog.
 *
 * ## The before-picture these replace
 *
 * Measured on the parent commit, through this same harness: a `confirmed` lead
 * suspended on `screen_1` with NO description (the #1207 warning is gated on
 * `suspected`) and then converted — one account, one contact, one opportunity,
 * `is_converted: true`. All three of `crm_lead` / `crm_contact` / `erased`
 * survivors did. That is the behaviour the changeset announces changing.
 */
describe('lead_conversion — a confirmed duplicate is refused (#1288)', () => {
  const CONFIRMED_SURVIVORS: Array<[string, Rec]> = [
    ['a still-open lead', { duplicate_of_type: 'crm_lead', duplicate_of_lead: SURVIVOR_LEAD_ID }],
    ['a contact the prospect already became', { duplicate_of_type: 'crm_contact', duplicate_of_contact: SURVIVOR_CONTACT_ID }],
    // `erased` is not an exotic third case, it is the state `lead.hook.ts`
    // (job 1c) leaves behind when the survivor is deleted: the pointer goes,
    // the VERDICT stays `confirmed` on purpose. So the refusal has to hold for
    // a lead whose survivor no longer exists — and the copy has to stay true
    // for it, which is why it names the section rather than a record.
    ['a survivor that has since been erased', { duplicate_of_type: 'erased' }],
  ];

  it.each(CONFIRMED_SURVIVORS)('refuses, and creates nothing — %s', async (_label, link) => {
    const { screen, products } = await convert(seedLead({ ...link, duplicate_status: 'confirmed' }));

    expect(screen!.nodeId, 'the run did not stop on the refusal screen')
      .toBe('refuse_confirmed_duplicate');
    expect(products, 'a confirmed duplicate was converted anyway').toEqual(NOTHING_CONVERTED);
  });

  it('says why, naming the verdict and where the surviving record is', async () => {
    const { screen } = await convert(seedLead({
      duplicate_of_type: 'crm_lead', duplicate_of_lead: SURVIVOR_LEAD_ID,
      duplicate_status: 'confirmed',
    }));

    const description = String(screen!.description ?? '');
    expect(String(screen!.title ?? ''), 'the refusal dialog has no title of its own')
      .toContain('refused');

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
    expect(description).not.toContain(SURVIVOR_LEAD_ID);
    expect(description).not.toContain(SURVIVOR_CONTACT_ID);
    expect(description).not.toContain('lead_1');

    // ⛔ No override hatch is offered — AGENTS.md metadata rule 8. The way out
    // is revising the verdict itself, which is a reviewer's edit on a field
    // that carries `trackHistory: true`, not a flag on this dialog.
    expect(description.toLowerCase()).not.toMatch(/convert anyway|override|ignore this|proceed anyway/);
  });

  it('leaves the machine\'s guess alone: suspected still warns AND converts', async () => {
    // The other half of the ruling, and the half a careless widening would
    // take with it. The warning's wording is pinned above; what this adds is
    // that the run still finishes.
    const { screen, done, products } = await convert(seedLead({
      duplicate_of_type: 'crm_lead', duplicate_of_lead: SURVIVOR_LEAD_ID,
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
    const { screen, products } = await convert(seedLead({
      duplicate_of_type: 'crm_lead', duplicate_of_lead: SURVIVOR_LEAD_ID,
      duplicate_status: null,
    }));

    expect(screen!.nodeId, 'a lead with no verdict was still refused').toBe('screen_1');
    expect(screen!.description, 'a lead with no verdict was warned about one').toBeUndefined();
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
