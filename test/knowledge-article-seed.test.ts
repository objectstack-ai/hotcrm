// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { KnowledgeArticle } from '../src/service/objects/knowledge_article.object';
import { KnowledgeArticleViews } from '../src/service/views/knowledge_article.view';
import { knowledgeArticles } from '../src/service/data/service.seed';

type Rec = Record<string, any>;

/**
 * The knowledge base a fresh install shows (#2129).
 *
 * A walk of the demo found one article per category, so the grouped All
 * Articles grid read as a list of headings, and the card's target is "3–4
 * articles per category, with a draft and an archived one, so the Published /
 * My Drafts views are not empty". The categories are read off the object and
 * the tab filters off the views, so a category added to the object, or a tab
 * that changes which statuses it lists, is measured here rather than restated.
 *
 * The date rules per status are the seed doctrine (`src/sales/data/_shared.ts`)
 * applied to `knowledge_article_publish_timestamps`; the reasoning sits beside
 * the dataset in `src/service/data/service.seed.ts`, and
 * `test/hooks-runtime-service.test.ts` pins that a booted published article
 * stores the review date it authors.
 */

const records = knowledgeArticles.records as Rec[];
const categories = (KnowledgeArticle.fields.category as Rec).options.map((o: Rec) => String(o.value));

/** The `status` values a list view's own filter admits. */
const statusesOf = (view: Rec): string[] => {
  const rule = (view.filter as Rec[]).find((f) => f.field === 'status');
  expect(rule, `fixture: ${String(view.name)} filters on status`).toBeDefined();
  return rule!.operator === 'in' ? (rule!.value as string[]) : [String(rule!.value)];
};

const daysAgo = (value: unknown): number => {
  const days = /^daysAgo\((\d+)\)$/.exec(String((value as Rec | undefined)?.source))?.[1];
  return days === undefined ? Number.NaN : Number(days);
};

describe('the seeded knowledge base (#2129)', () => {
  it('holds three or four articles in every category the object declares', () => {
    expect(categories.length, 'fixture: the object declares categories').toBeGreaterThan(0);
    const perCategory = Object.fromEntries(
      categories.map((c: string) => [c, records.filter((r) => r.category === c).length]),
    );
    for (const [category, count] of Object.entries(perCategory)) {
      expect({ category, count, inRange: count >= 3 && count <= 4 }).toEqual({ category, count, inRange: true });
    }
    expect(records.every((r) => categories.includes(r.category)), 'an article names an undeclared category').toBe(true);
    expect(records.length).toBeGreaterThanOrEqual(12);
  });

  it('gives the Published and My Drafts tabs rows of their own, plus an archived article', () => {
    const tabs = KnowledgeArticleViews.listViews as Rec;
    const published = statusesOf(tabs.published_articles);
    const drafts = statusesOf(tabs.my_drafts);
    expect(records.filter((r) => published.includes(r.status)).length, 'Published').toBeGreaterThan(0);
    expect(records.filter((r) => drafts.includes(r.status)).length, 'My Drafts').toBeGreaterThan(0);
    expect(records.some((r) => r.status === 'draft'), 'a draft').toBe(true);
    expect(records.some((r) => r.status === 'archived'), 'an archived article').toBe(true);
  });

  it('keys each article by a title no other article uses', () => {
    expect(knowledgeArticles.externalId).toBe('title');
    const titles = records.map((r) => String(r.title));
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('dates each article as its status implies', () => {
    for (const r of records) {
      const dates = { published_at: daysAgo(r.published_at), last_reviewed_at: daysAgo(r.last_reviewed_at) };
      if (r.status === 'published' || r.status === 'archived') {
        // Both dates authored as `daysAgo(N)`, the review after the publish.
        expect({ title: r.title, ...dates, reviewedAfter: dates.published_at > dates.last_reviewed_at })
          .toEqual({ title: r.title, ...dates, reviewedAfter: true });
      } else {
        // Never published: the hook stamps neither date, so the seed authors neither.
        expect({ title: r.title, published_at: r.published_at, last_reviewed_at: r.last_reviewed_at })
          .toEqual({ title: r.title, published_at: undefined, last_reviewed_at: undefined });
      }
    }
  });
});
