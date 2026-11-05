// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import artifact from '../objectstack.config';
import { CrmSeedData } from '../objectstack.composition';
import { knowledgeArticles } from '../src/service/data/service.seed';
import { KnowledgeArticleViews } from '../src/service/views/knowledge_article.view';
import { bootOptions, buildArtifactAgain } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Re-running the seed adds no row, and the knowledge base it seeds is the one a
 * person meets (#2129).
 *
 * The platform re-applies the app's seed on every boot, so "re-seeding changes
 * nothing" is a restart over the same database: the app boots over a database
 * file, the kernel stops, and the app cold-boots over that file a day later
 * (the clock moved forward, `Date` only), as a demo environment's next restart
 * usually does. Relative seed dates then resolve to new values, which is what
 * an insert-once dataset must not write back and a positional one (`forecasts`,
 * `upsert`, #702) re-points; that re-point is the control that the replay ran.
 * `test/seed-replay-user-edits.test.ts` pins that a person's edit survives the
 * same restart; this pins the idle case, over every object the seed writes.
 */

const DAY_MS = 86_400_000;

/** Every object the seed writes, once each, in replay order. */
const OBJECTS = [...new Set((CrmSeedData as Rec[]).map((d) => String(d.object)))];

/**
 * The rows of `object` the seed accounts for. `sys_activity` is the platform's
 * timeline, which other writers fill too; the seed's pointer dataset writes
 * only rows pointing at a `crm_event`, so those are the rows read.
 */
const seedScope = (object: string): Rec | undefined =>
  object === 'sys_activity' ? { source_object: 'crm_event' } : undefined;

/** The `status` values a knowledge list view's own filter admits. */
const tabStatuses = (tab: string): string[] => {
  const rule = ((KnowledgeArticleViews.listViews as Rec)[tab].filter as Rec[]).find((f) => f.field === 'status');
  return rule!.operator === 'in' ? (rule!.value as string[]) : [String(rule!.value)];
};

describe('a restart over a seeded database adds no row (#2129)', () => {
  let dir: string;
  let after: VerifyStack | undefined;
  const countsBefore: Record<string, number> = {};
  let articlesBefore: Rec[] = [];
  // What the dev admin's two knowledge tabs list on the first boot.
  let publishedTab = 0;
  let myDraftsTab = 0;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'seed-restart-idempotence-'));
    const databaseFile = join(dir, 'crm.db');
    const first = await bootStack(artifact, bootOptions({ databaseFile }));

    for (const object of OBJECTS) countsBefore[object] = (await first.rows(object, seedScope(object))).length;
    articlesBefore = await first.rows('crm_knowledge_article');

    // The two tabs, read as the dev admin: My Drafts is the viewer's own
    // drafts, so it lists what the platform's seed-ownership claim handed them.
    const admin = await first.signIn();
    const adminId = String((await first.contextFor(admin)).userId);
    publishedTab = (await first.rows('crm_knowledge_article',
      { status: { $in: tabStatuses('published_articles') } }, { as: admin })).length;
    myDraftsTab = (await first.rows('crm_knowledge_article',
      { status: { $in: tabStatuses('my_drafts') }, owner_id: adminId }, { as: admin })).length;
    await first.stop();

    vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
    vi.setSystemTime(Date.now() + DAY_MS);
    after = await bootStack(await buildArtifactAgain(), bootOptions({ databaseFile }));
  }, 300_000);

  afterAll(async () => {
    await after?.stop();
    vi.useRealTimers();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('control: the restart ran a day later and replayed the seed — the forecast snapshot it re-points reads that day', async () => {
    const [row] = await after!.rows('crm_forecast', { seed_key: 'demo_month_current' });
    expect(String(row?.snapshot_date).slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
  });

  it('the first boot stores every seeded knowledge article', () => {
    const seeded = (knowledgeArticles.records as Rec[]).map((r) => String(r.title)).sort();
    expect(articlesBefore.map((r) => String(r.title)).sort()).toEqual(seeded);
    expect(articlesBefore.length).toBeGreaterThanOrEqual(12);
  });

  it('the dev admin’s Published and My Drafts tabs both list articles', () => {
    expect({ publishedTab: publishedTab > 0, myDraftsTab: myDraftsTab > 0 }).toEqual({ publishedTab: true, myDraftsTab: true });
  });

  it.each(OBJECTS)('%s: the restart adds no row', async (object) => {
    expect(countsBefore[object], `fixture: the first boot seeded ${object}`).toBeGreaterThan(0);
    expect((await after!.rows(object, seedScope(object))).length).toBe(countsBefore[object]);
  });

  it('the restart rewrites no knowledge article', async () => {
    const stored = new Map((await after!.rows('crm_knowledge_article')).map((r) => [String(r.id), r]));
    for (const row of articlesBefore) expect(stored.get(String(row.id)), String(row.title)).toEqual(row);
  });
});
