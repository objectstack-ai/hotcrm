// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack, { type AnyRec, walk } from './helpers/composed-stack';

const objects: AnyRec[] = (stack as AnyRec).objects ?? [];
const pages: AnyRec[] = (stack as AnyRec).pages ?? [];

/**
 * `record:details` sections may only list fields the tab actually renders (#1211).
 *
 * ## The behaviour this guards
 *
 * Measured against the console that ships with this app (`@objectstack/console`
 * 17.1.0, `dist/assets/plugins-views-*.js` → objectui `RecordDetailsRenderer` /
 * `DetailSection`), a record page composes three rules the author never sees:
 *
 *   1. a mounted `record:highlights` registers its field names into
 *      `HighlightFieldsContext`, and `record:details` DROPS every registered
 *      name from its sections so the value is not printed twice;
 *   2. it also drops the record's title field — the first of
 *      `primaryField` → `name` → `full_name` → `title` → `subject` →
 *      `display_name` → `label` that holds a value — because the page `H1`
 *      already shows it;
 *   3. sections then hide their empty fields (`hideEmpty` defaults to true
 *      inside the renderer), and a section whose remaining fields are ALL
 *      empty renders nothing at all — no heading, no empty shell.
 *
 * Nothing warns. An author who lists a highlight field inside a section gets a
 * green `objectstack validate` and a page that silently omits it, and a section
 * assembled mostly out of such fields disappears. That is exactly how the
 * opportunity's Details tab came to author fourteen fields and render two.
 *
 * ## What is asserted
 *
 * Per page: the fields a `record:details` section lists must be disjoint from
 * the fields the same page's `record:highlights` lists, and must not name the
 * record's title field. Fields that are merely EMPTY on some record are not in
 * scope — that is data, not authoring.
 *
 * The check reads the resolved metadata, so it also covers a section that
 * inherits a duplicate through a future page refactor.
 *
 * ## Group-reference sections (#806 ruling C)
 *
 * A section written `{ group: '<key>' }` enumerates nothing: the renderer
 * derives its members from the object's `fieldGroups`, so there is no authored
 * field list to promise a field the tab never shows. Dropping the strip's
 * fields from a derived list is the renderer doing its job — measured on
 * 17.6.0 (#806 R70), the lead page's `assignment` group (`owner_id` only)
 * renders nothing because the owner is in the strip. Such a section is held
 * to the one thing it does author: its `group` must name a group the page's
 * object declares, with at least one visible member.
 */

/** The renderer's title-field resolution, in its order. */
const TITLE_CANDIDATES = ['name', 'full_name', 'title', 'subject', 'display_name', 'label'];

const titleFieldOf = (objectName: string): string | undefined => {
  const obj = objects.find((o) => o.name === objectName);
  if (!obj) return undefined;
  const fields = Object.keys(obj.fields ?? {});
  const candidates = [obj.primaryField, ...TITLE_CANDIDATES].filter(
    (n): n is string => typeof n === 'string' && n.length > 0,
  );
  return candidates.find((n) => fields.includes(n));
};

type DetailPage = {
  page: string;
  object: string;
  highlights: string[];
  sections: { name: string; group?: string; fields: string[] }[];
};

const fieldNames = (list: unknown): string[] =>
  Array.isArray(list)
    ? list
        .map((f) => (typeof f === 'string' ? f : (f as AnyRec)?.name ?? (f as AnyRec)?.field))
        .filter((n): n is string => typeof n === 'string' && n.length > 0)
    : [];

const detailPages: DetailPage[] = pages.flatMap((page) => {
  const components = [...walk(page.regions), ...walk(page.slots)];
  const highlights = components.filter((c) => c.type === 'record:highlights');
  const details = components.filter((c) => c.type === 'record:details');
  if (highlights.length === 0 || details.length === 0) return [];
  return [
    {
      page: page.name as string,
      object: page.object as string,
      highlights: highlights.flatMap((c) => fieldNames(c.properties?.fields)),
      sections: details.flatMap((c) =>
        (c.properties?.sections ?? []).map((s: AnyRec) => ({
          name: (s.name ?? s.group ?? s.label ?? '(unnamed)') as string,
          group: typeof s.group === 'string' ? s.group : undefined,
          fields: fieldNames(s.fields),
        })),
      ),
    },
  ];
});

describe('record:details sections list only fields the tab renders', () => {
  it('finds the record pages that compose highlights and details', () => {
    // A rename that unhooks this suite from the pages it guards would otherwise
    // leave it passing over an empty list.
    expect(detailPages.map((p) => p.page).sort()).toEqual(
      ['case_detail_page', 'lead_detail_page', 'opportunity_detail_page'].sort(),
    );
  });

  it('no section repeats a field the page highlights', () => {
    const offenders: string[] = [];
    for (const { page, highlights, sections } of detailPages) {
      const strip = new Set(highlights);
      for (const section of sections) {
        for (const field of section.fields) {
          if (strip.has(field)) offenders.push(`${page}.${section.name}.${field}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no section names the record title field the page header already shows', () => {
    const offenders: string[] = [];
    for (const { page, object, sections } of detailPages) {
      const title = titleFieldOf(object);
      if (!title) continue;
      for (const section of sections) {
        if (section.fields.includes(title)) offenders.push(`${page}.${section.name}.${title}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every section still carries at least one field', () => {
    // A section trimmed down to nothing should be deleted, not left as a
    // heading the renderer will drop anyway. A group reference carries its
    // members on the object, so it is counted there: the renderer drops a
    // `group` that names no declared group, silently.
    for (const { page, object, sections } of detailPages) {
      const obj = objects.find((o) => o.name === object);
      for (const section of sections) {
        const count = section.group
          ? Object.values((obj?.fields ?? {}) as Record<string, AnyRec>).filter(
              (f) => f?.group === section.group && f?.hidden !== true,
            ).length
          : section.fields.length;
        expect(`${page}.${section.name}:${count}`).not.toMatch(/:0$/);
      }
    }
  });
});
