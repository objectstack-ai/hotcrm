// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { type AnyRec, objects, pages, walk } from './helpers/metadata-fixtures';

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
 */

/**
 * Pages knowingly left out, with the card that owns them. `lead_detail_page`
 * has the same duplicates (`email` / `phone` in its Contact section, `status` /
 * `rating` / `lead_source` / `owner_id` in its Lead Detail section) but
 * `src/pages/lead_detail.page.ts` is claimed by #1209 and #1207, so #1211 does
 * not touch it. The entry asserts nothing about the page — it only skips it —
 * so it stays green when those cards land and remove the duplicates.
 */
const EXEMPT_PAGES = new Set(['lead_detail_page']);

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
  sections: { name: string; fields: string[] }[];
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
          name: (s.name ?? s.label ?? '(unnamed)') as string,
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

  it('every exempt page still exists', () => {
    for (const name of EXEMPT_PAGES) {
      expect(detailPages.map((p) => p.page)).toContain(name);
    }
  });

  it('no section repeats a field the page highlights', () => {
    const offenders: string[] = [];
    for (const { page, highlights, sections } of detailPages) {
      if (EXEMPT_PAGES.has(page)) continue;
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
      if (EXEMPT_PAGES.has(page)) continue;
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
    // heading the renderer will drop anyway.
    for (const { page, sections } of detailPages) {
      for (const section of sections) {
        expect(`${page}.${section.name}:${section.fields.length}`).not.toMatch(/:0$/);
      }
    }
  });
});
