// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { defaultRecordPageObject } from '@objectstack/spec/ui';
import artifact from '../objectstack.config';

type PageLike = { name?: string; type?: string; object?: string; isDefault?: boolean; kind?: string; print?: unknown; slots?: Record<string, unknown> };

// The composed artifact keeps each package's pages on its own manifest; only
// the revenue package declares quote pages, so package order cannot reorder them.
const pages = ((artifact as { packages?: { manifest?: { pages?: PageLike[] } }[] }).packages ?? [])
  .flatMap((pkg) => pkg.manifest?.pages ?? []);
const quotePages = pages.filter((p) => p.type === 'record' && p.object === 'crm_quote');

/**
 * The page a quote opens on, picked the way the console's record route picks
 * it (`usePageAssignment`, `@object-ui/react`): the object's DEFAULT record
 * page, else its FIRST record page in served order. It synthesizes a page only
 * when the object has no record page at all.
 */
const opened = (): PageLike | undefined =>
  quotePages.find((p) => defaultRecordPageObject(p) === 'crm_quote') ?? quotePages[0];

/**
 * A quote opens on its working page, not on its print page (#2312, option B).
 *
 * Measured on 18.2.0 before `quote_detail_page` existed: with
 * `quote_print_page` the quote's only record page, `/crm_quote/record/ID` drew
 * the printable blocks — no status path, no tabs — because the console's
 * fallback is the first record page, not the synthesized one.
 */
describe('the quote record page (#2312)', () => {
  it('declares the print page and a default page beside it', () => {
    expect(quotePages.map((p) => p.name).sort()).toEqual(['quote_detail_page', 'quote_print_page']);
  });

  it('opens a quote on quote_detail_page, which is no print page', () => {
    const page = opened();
    expect(page?.name).toBe('quote_detail_page');
    expect(page?.print).toBeUndefined();
  });

  it('draws the synthesized layout: a slotted page that overrides no slot', () => {
    const page = quotePages.find((p) => p.name === 'quote_detail_page');
    expect(page?.kind).toBe('slotted');
    expect(Object.keys(page?.slots ?? {})).toEqual([]);
  });

  it('keeps the print page off the default', () => {
    expect(quotePages.find((p) => p.name === 'quote_print_page')?.isDefault).not.toBe(true);
  });
});
