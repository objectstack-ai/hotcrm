// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';

/**
 * `fieldGroups` coverage and integrity (#575 A3).
 *
 * `fieldGroups` is what turns a detail page from one flat grid of every column
 * into the sectioned layout the rest of the app uses. It is pure metadata, so
 * `os validate` is happy either way: an object with no groups renders, it just
 * renders badly, and an object whose fields point at a group key that was
 * renamed renders *those fields* into nothing at all. Both fail silently.
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

  it('every field-level group resolves to a declared group key', () => {
    // The silent failure this catches: a renamed group key leaves the fields
    // that referenced it pointing at nothing, and they vanish from the layout.
    const bad: string[] = [];
    let checked = 0;
    for (const obj of objects) {
      const declared = new Set(((obj.fieldGroups ?? []) as AnyRec[]).map((g) => g.key));
      for (const [fieldName, field] of Object.entries((obj.fields ?? {}) as Record<string, AnyRec>)) {
        const group = field?.group;
        if (group == null) continue;
        checked++;
        if (!declared.has(group)) {
          bad.push(`${obj.name}.${fieldName}: group "${group}" is not declared in fieldGroups`);
        }
      }
    }
    expect(checked, 'no grouped fields found — the walker stopped matching').toBeGreaterThan(100);
    expect(bad, `fields pointing at undeclared groups:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * The third way a group can be declared and still never reach a reader, and
   * the only one of the three that is invisible on forms (#715).
   *
   * A synthesized detail page hoists the record title and the leading
   * `highlightFields` into the header strip and drops them from the body, so a
   * group whose every field is hoisted keeps its heading on forms and renders
   * nowhere on detail pages. `crm_task` reached that state with a one-field
   * `assignment` group (#582); `crm_campaign_member` reached it with all four
   * fields of `basic` (member_number as the title, campaign/lead/contact in the
   * strip).
   *
   * `objectstack lint` reports this as `field-group-shadowed`, but lint exits 0
   * on warnings, so nothing in `pnpm verify` fails when it comes back — the same
   * reason the two checks above are duplicated here. The hoisting model mirrors
   * the platform rule: title + the first FOUR non-title highlight entries.
   */
  it('no declared group is entirely hoisted into the detail highlight strip', () => {
    const TITLE_FALLBACKS = ['name', 'full_name', 'title', 'subject', 'display_name'];
    const bad: string[] = [];
    let checked = 0;

    for (const obj of objects) {
      const fields = (obj.fields ?? {}) as Record<string, AnyRec>;
      const declared = ((obj.fieldGroups ?? []) as AnyRec[]).map((g) => g.key).filter(Boolean);
      const highlights: string[] = (
        Array.isArray(obj.highlightFields)
          ? obj.highlightFields
          : Array.isArray(obj.compactLayout)
            ? obj.compactLayout
            : []
      ).filter((h: unknown): h is string => typeof h === 'string' && h.length > 0);
      if (declared.length === 0 || highlights.length === 0) continue;

      const titleField =
        [obj.nameField, obj.primaryField, obj.displayNameField].find(
          (v) => typeof v === 'string' && v.length > 0 && v in fields,
        ) ?? TITLE_FALLBACKS.find((c) => c in fields);

      const hiddenFromBody = new Set(highlights.filter((h) => h !== titleField).slice(0, 4));
      if (titleField) hiddenFromBody.add(titleField as string);

      for (const key of declared) {
        const members = Object.entries(fields)
          .filter(([, f]) => f?.group === key && f?.hidden !== true)
          .map(([fieldName]) => fieldName);
        if (members.length === 0) continue;
        checked++;
        if (members.every((m) => hiddenFromBody.has(m))) {
          bad.push(
            `${obj.name}: group "${key}" (${members.join(', ')}) is entirely title-or-strip — ` +
              'it renders on forms and never on detail pages',
          );
        }
      }
    }

    // Guard the guard: an object walk that stopped resolving groups or
    // highlightFields would report nothing and pass.
    expect(checked, 'no grouped fields on any object with highlightFields — the walker is broken')
      .toBeGreaterThan(20);
    expect(bad, `groups shadowed by the highlight strip:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('no declared group is left with no fields in it', () => {
    // An empty group renders as an empty section header — visible, and always
    // the residue of a rename or a deleted field.
    const bad: string[] = [];
    for (const obj of objects) {
      const declared = ((obj.fieldGroups ?? []) as AnyRec[]).map((g) => g.key);
      if (declared.length === 0) continue;
      const used = new Set(
        Object.values((obj.fields ?? {}) as Record<string, AnyRec>)
          .map((f) => f?.group)
          .filter((g): g is string => typeof g === 'string'),
      );
      for (const key of declared) {
        if (!used.has(key)) bad.push(`${obj.name}: group "${key}" has no fields`);
      }
    }
    expect(bad, `empty fieldGroups:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});
