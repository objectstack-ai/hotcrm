// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from './helpers/composed-stack';

/**
 * `fieldGroups` coverage and integrity (#575 A3).
 *
 * Where `fieldGroups` is actually read — measured, not inferred (#1674).
 * Derivation lives in the console's page SYNTHESIZER, the path that
 * fabricates a record page for an object that has NONE authored. The
 * `record:details` RENDERER that draws an authored page reads neither
 * `fieldGroups` nor `highlightFields`: it forwards `sections`/`fields`, and
 * the detail view guards each with `.length > 0` and no else branch. An
 * authored page opts out of the synthesizer, and out of the derivation with
 * it.
 *
 * ⛔ Two sentences stood here before and both were wrong. "`fieldGroups` is
 * what turns a detail page into the sectioned layout" holds only on the
 * synthesized path — `crm_lead` was the standing counter-example, its
 * record page authoring six enumerated sections while the object declared ten
 * groups the detail renderer never consulted (#806). And "an object with no groups renders, it just renders badly"
 * understated the failure in the one direction that mattered: an authored
 * `record:details` that omits `sections` renders 0 sections and 0 field rows
 * — an empty body, not an ugly one. ⭐ Understating a failure until it reads
 * as harmless is how #806's ruling came to be written on a mechanism that
 * does not exist.
 *
 * ⚠️ Provenance, with its expiry stated: the 0/0 is R28's browser measurement
 * on #806 — headless Chromium against a wiped DB, `@objectstack/console`
 * 17.2.0, negative control included, 6 sections / 20 field rows collapsing to
 * 0/0 once `sections` was deleted. #1521 corroborated the mechanism
 * statically on the installed 17.3.0 bundle. ⛔ Neither #1521 nor this card
 * re-ran the browser, so treat it as a 17.2.0 reading corroborated at 17.3.0
 * rather than a standing fact, and re-measure before quoting it for a later
 * pin. `src/views/case.view.ts` states the same split for forms. ⛔ Do not write a
 * fourth account of this mechanism without measuring it first.
 *
 * ⚠️ ⛔ Do not over-read the correction. `fieldGroups` DOES reach an authored
 * `record:details`, one way: a section may name `group:` in place of
 * `fields:` and inherit that group's members and presentation
 * (`deriveFieldGroupLayout`, ADR-0085 §5 — verified on the installed 17.3.0
 * spec, which makes the two keys mutually exclusive). That is a per-section
 * opt-in, not a page-level fallback — and since #806 it is the form all three
 * authored record pages (lead, opportunity, case) use, rendered on 17.6.0
 * (#806 R70, browser, with a control leg).
 *
 * ⇒ So these assertions still stand: `fieldGroups` is load-bearing for every
 * FORM and every SYNTHESIZED detail page, where a field pointing at a group
 * key that was renamed still renders into nothing at all. It is pure metadata
 * on both paths — `os validate` is happy either way, and both failures are
 * silent at runtime; `pnpm lint` is what fails on them (see the end of this
 * file).
 *
 * `crm_campaign` and `crm_task` were the two business objects with a full
 * detail page and zero groups. The two line-item objects are deliberately
 * exempt: they are edited inline in their parent's grid and never get a
 * sectioned detail page of their own.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];

/**
 * Objects that render as a record with a detail page, and so must group their
 * fields. Line items are edited inline inside their parent's grid — they have
 * no detail page to section, so they are out of scope rather than exceptions.
 */
const INLINE_ONLY = new Set(['crm_opportunity_line_item', 'crm_quote_line_item']);

const businessObjects = objects.filter((o) => String(o.name).startsWith('crm_'));
const detailPageObjects = businessObjects.filter((o) => !INLINE_ONLY.has(o.name));

describe('every detail-page object groups its fields', () => {
  it('the object set is non-empty and covers the line-item exemptions', () => {
    // Guard the guard: a filter that stopped matching would make the coverage
    // assertion below pass by asserting nothing, and a renamed line-item object
    // would silently turn an exemption into a no-op.
    expect(detailPageObjects.length).toBeGreaterThan(10);
    const names = new Set(businessObjects.map((o) => o.name));
    for (const exempt of INLINE_ONLY) {
      expect(names.has(exempt), `exempt object "${exempt}" no longer exists — drop it`).toBe(true);
    }
  });

  it.each(detailPageObjects.map((o) => o.name))('%s declares fieldGroups', (name) => {
    const groups = (objects.find((o) => o.name === name)?.fieldGroups ?? []) as AnyRec[];
    expect(groups.length, `${name} declares no fieldGroups`).toBeGreaterThan(0);
  });
});

describe('fieldGroups are internally consistent', () => {
  it('group keys are unique within each object', () => {
    const bad: string[] = [];
    for (const obj of objects) {
      const keys = ((obj.fieldGroups ?? []) as AnyRec[]).map((g) => g.key);
      const seen = new Set<string>();
      for (const key of keys) {
        if (seen.has(key)) bad.push(`${obj.name}: duplicate group key "${key}"`);
        seen.add(key);
      }
    }
    expect(bad, `duplicate fieldGroup keys:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every group carries a key and a human label', () => {
    const bad: string[] = [];
    for (const obj of objects) {
      for (const group of (obj.fieldGroups ?? []) as AnyRec[]) {
        if (!group.key) bad.push(`${obj.name}: a fieldGroup has no key`);
        if (!group.label) bad.push(`${obj.name}.${group.key}: no label`);
      }
    }
    expect(bad, `malformed fieldGroups:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  // ⚰️ RETIRED (#1583): "every field-level group resolves to a declared group
  // key", "no declared group is entirely hoisted into the detail highlight
  // strip" and "no declared group is left with no fields in it".
  // `objectstack lint --strict` reports them as `field-group-undeclared`,
  // `field-group-shadowed` and `field-group-empty`, and `pnpm lint` fails on
  // each.
});
