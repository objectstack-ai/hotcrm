// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import { LeadConversionFlow } from '../src/flows/lead-conversion.flow';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';
import { type AnyRec, objects, pages } from './helpers/metadata-fixtures';
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
 * | `lead_conversion` edges `e21`/`e22` | flow condition, server CEL | RUN FAILS |
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

describe('lead record page — the suspected-duplicate banner', () => {
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
    //    different question from the one above, not a restatement of it.
    expect(evaluate(source, { duplicate_status: null }))
      .toEqual({ ok: true, value: false });

    // 3. The lead the card is about.
    expect(evaluate(source, { duplicate_status: 'suspected' }))
      .toEqual({ ok: true, value: true });

    // 4. The boundary this card deliberately does NOT cross: a human's
    //    `confirmed` verdict is a different state with a different next step
    //    (disqualify as a duplicate, which the `crm_lead` validation already
    //    requires a survivor for). It is surfaced by the `duplicates` section
    //    below — which renders on ANY duplicate state — not by this banner.
    //    Widening the banner to `confirmed` is a product call, not a defect
    //    repair; this line is here so the widening is a deliberate edit.
    expect(evaluate(source, { duplicate_status: 'confirmed' }))
      .toEqual({ ok: true, value: false });
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

  it('a confirmed duplicate is out of the warning\'s scope, deliberately', async () => {
    // Same boundary as the banner, stated once more where the other half of it
    // lives. `confirmed` is a human's verdict, and what follows it is
    // disqualification, not conversion. Widening either surface to it is a
    // product call (reported to the PM, not decided here) — so this pin exists
    // to make that widening a deliberate edit rather than a side effect.
    const { screen } = await startConversion(seedLead({
      duplicate_of_type: 'crm_lead',
      duplicate_of_lead: SURVIVOR_LEAD_ID,
      duplicate_status: 'confirmed',
    }));
    expect(screen!.description).toBeUndefined();
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
