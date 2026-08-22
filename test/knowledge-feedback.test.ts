// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import articleFeedbackHooks from '../src/objects/article_feedback.hook';
import { ArticleFeedback } from '../src/objects/article_feedback.object';
import { KnowledgeArticle } from '../src/objects/knowledge_article.object';
import {
  MarkArticleHelpfulAction,
  MarkArticleNotHelpfulAction,
} from '../src/actions/knowledge_article.actions';
import { makeSandboxEngine, runActionBody } from './helpers/action-sandbox';
import { KnowledgeArticleViews } from '../src/views/knowledge_article.view';
import { makeHarness, makeCtx, hookNamed, type Rec } from './helpers/hook-harness';
import { localePacks } from './helpers/metadata-fixtures';

/**
 * The knowledge article's engagement counters have WRITERS (#601), and the one
 * that could not get one is GONE.
 *
 * `view_count`, `helpful_count` and `not_helpful_count` were all
 * `readonly: true` with `defaultValue: 0` and nothing anywhere — platform or
 * app — able to move them, while the article grid summed a "Views" column. The
 * card left the `view_count` fork to the implementer and required only that no
 * counter stay writerless, so this file pins the resolution of BOTH branches:
 *
 *  1. `view_count` is deleted, and stays deleted, everywhere it was read.
 *  2. `helpful_count` / `not_helpful_count` are RECOUNTED from real
 *     `crm_article_feedback` rows — asserted by running the shipped action
 *     bodies and the shipped hook handler, never by checking that they are
 *     registered.
 *
 * The distinction matters because "the field has a writer" is exactly the kind
 * of claim that passes review while being false: `_hook-api.ts`'s header
 * records eight hook-side derived writes that compiled, tested green and threw
 * on every invocation for months (#616). So the counters below are read off a
 * store the shipped code actually wrote to.
 */

const USER = { id: 'user_1' };

const article = (over: Rec = {}): Rec => ({
  id: 'ka1', title: 'Reset your password', status: 'published', audience: 'public',
  helpful_count: 0, not_helpful_count: 0, owner_id: 'author_1', ...over,
});

// ─────────────────────────────────────── 1. the field with no writer is gone ──

describe('view_count is retired rather than faked (#601)', () => {
  it('is not a field on the article any more', () => {
    expect(Object.keys(KnowledgeArticle.fields as Rec)).not.toContain('view_count');
  });

  /**
   * The retirement is only real if every READER went with it. A left-behind
   * column reference does not fail the build — it renders an empty column, or
   * sorts by nothing, which is the quiet half of a half-done removal.
   */
  it('is referenced by no view, no locale pack and no seed', () => {
    const surfaces: Array<[string, unknown]> = [
      ['objects', KnowledgeArticle],
      ['views', KnowledgeArticleViews],
      ['locale packs', localePacks],
    ];
    const offenders = surfaces
      .filter(([, value]) => JSON.stringify(value ?? null).includes('view_count'))
      .map(([label]) => label);
    expect(offenders, `view_count still read by: ${offenders.join(', ')}`).toEqual([]);
  });

  /**
   * The two survivors keep `readonly: true`, and that is now an accurate
   * statement rather than a description of paralysis: they are derived, so
   * nothing should ever type them in.
   */
  it('leaves the surviving counters readonly and derived', () => {
    const fields = KnowledgeArticle.fields as Record<string, Rec>;
    expect(fields.helpful_count.readonly).toBe(true);
    expect(fields.not_helpful_count.readonly).toBe(true);
  });
});

// ───────────────────────────────────────────── 2. the vote actions, executed ──

describe('the feedback actions record a row (they cannot bump a counter)', () => {
  /**
   * Why the actions insert instead of incrementing is argued on
   * `article_feedback.object.ts`; what this asserts is that they DO insert,
   * through the same QuickJS runner the runtime uses — so a body that reached
   * for module scope, or used the `(id, doc)` update spelling, fails here.
   */
  it('inserts the reader’s verdict, owned by the reader', async () => {
    const engine = makeSandboxEngine();
    engine.rows('crm_knowledge_article').push(article());

    await runActionBody(MarkArticleHelpfulAction as never, {
      engine,
      recordId: 'ka1', user: USER,
    });

    const rows = engine.inserted('crm_article_feedback');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      crm_knowledge_article: 'ka1',
      verdict: 'helpful',
      // An action body runs `isSystem`, so NOTHING stamps the ownership anchor
      // for it (#548). A null owner here would collapse every vote onto one
      // row through the unique index — the dedupe depends on this.
      owner_id: 'user_1',
    });
  });

  it('UPDATES the reader’s existing row when they change their mind', async () => {
    const engine = makeSandboxEngine();
    engine.rows('crm_knowledge_article').push(article());
    engine.rows('crm_article_feedback').push({
      id: 'af1', crm_knowledge_article: 'ka1', verdict: 'helpful', owner_id: 'user_1',
    });

    await runActionBody(MarkArticleNotHelpfulAction as never, {
      engine,
      recordId: 'ka1', user: USER,
    });

    // The row moved; a second row would make the counters answer "how many
    // clicks", which is not a number anyone wants beside "Not Helpful".
    expect(engine.inserted('crm_article_feedback')).toHaveLength(0);
    expect(engine.rows('crm_article_feedback')).toHaveLength(1);
    expect(engine.rows('crm_article_feedback')[0].verdict).toBe('not_helpful');
  });

  it('is a no-op when the reader re-votes the same way', async () => {
    const engine = makeSandboxEngine();
    engine.rows('crm_knowledge_article').push(article());
    engine.rows('crm_article_feedback').push({
      id: 'af1', crm_knowledge_article: 'ka1', verdict: 'helpful', owner_id: 'user_1',
    });

    await runActionBody(MarkArticleHelpfulAction as never, {
      engine,
      recordId: 'ka1', user: USER,
    });

    expect(engine.callsFor('crm_article_feedback', 'update')).toHaveLength(0);
    expect(engine.inserted('crm_article_feedback')).toHaveLength(0);
  });

  it('refuses an unauthenticated vote rather than writing an ownerless row', async () => {
    const engine = makeSandboxEngine();
    engine.rows('crm_knowledge_article').push(article());

    await expect(
      runActionBody(MarkArticleHelpfulAction as never, {
        engine,
        recordId: 'ka1', user: {},
      }),
    ).rejects.toThrow(/Sign in to rate an article/);

    expect(engine.inserted('crm_article_feedback')).toHaveLength(0);
  });

  /**
   * `feedbackBody(verdict)` composes both bodies from one string. That is
   * FACTORY composition, which is allowed — the emitted body is self-contained.
   * This asserts the two stay character-identical apart from the verdict, so a
   * fix applied to one cannot silently miss the other (the same discipline
   * #597 imposed on the four copies of the campaign recount block).
   */
  it('ships two bodies that differ only in the verdict', () => {
    const helpful = String((MarkArticleHelpfulAction.body as Rec).source);
    const notHelpful = String((MarkArticleNotHelpfulAction.body as Rec).source);
    expect(helpful.split("'helpful'").join('§')).toBe(notHelpful.split("'not_helpful'").join('§'));
  });
});

// ──────────────────────────────────────────────── 3. the recount, executed ──

describe('article_feedback_metrics_refresh recounts the article’s verdicts', () => {
  const hook = hookNamed(articleFeedbackHooks, 'article_feedback_metrics_refresh');

  const withVotes = (votes: Array<[string, string]>) => {
    const h = makeHarness();
    h.rows('crm_knowledge_article').push(article());
    votes.forEach(([owner, verdict], i) => {
      h.rows('crm_article_feedback').push({
        id: `af${i}`, crm_knowledge_article: 'ka1', verdict, owner_id: owner,
      });
    });
    return h;
  };

  it('writes both counters from the rows that exist', async () => {
    const h = withVotes([['u1', 'helpful'], ['u2', 'helpful'], ['u3', 'not_helpful']]);
    await hook.handler(makeCtx({
      event: 'afterInsert',
      input: { crm_knowledge_article: 'ka1', verdict: 'helpful', owner_id: 'u1' },
      user: USER,
      api: h.api,
    }));

    expect(h.rows('crm_knowledge_article')[0]).toMatchObject({
      helpful_count: 2,
      not_helpful_count: 1,
    });
  });

  /**
   * RECOUNT, not increment — the property that makes this safe to replay, safe
   * under concurrency, and self-healing. A running total cannot pass this: run
   * the same event twice and an incrementing writer reports 4.
   */
  it('is idempotent — running the same event twice does not double the count', async () => {
    const h = withVotes([['u1', 'helpful'], ['u2', 'helpful']]);
    // The stored counter starts WRONG on purpose. A recount converges on 2
    // whatever it finds; an incrementing writer walks 5 → 6 → 7 and never
    // notices. Without this seed both writers report 2 after two runs and the
    // test cannot tell them apart — measured, by reverse-verifying against an
    // increment implementation.
    h.rows('crm_knowledge_article')[0].helpful_count = 5;
    const ctx = () => makeCtx({
      event: 'afterInsert',
      input: { crm_knowledge_article: 'ka1', verdict: 'helpful', owner_id: 'u1' },
      user: USER,
      api: h.api,
    });
    await hook.handler(ctx());
    await hook.handler(ctx());

    expect(h.rows('crm_knowledge_article')[0].helpful_count).toBe(2);
  });

  /**
   * A counter that only ever goes up is a different kind of lie — the lesson
   * the campaign junction paid for in #696.
   */
  it('follows a withdrawn vote back down on afterDelete', async () => {
    const h = withVotes([['u1', 'helpful']]);
    h.rows('crm_knowledge_article')[0].helpful_count = 1;
    h.rows('crm_article_feedback').length = 0;

    await hook.handler(makeCtx({
      event: 'afterDelete',
      input: {},
      previous: { crm_knowledge_article: 'ka1', verdict: 'helpful', owner_id: 'u1' },
      user: USER,
      api: h.api,
    }));

    expect(h.rows('crm_knowledge_article')[0].helpful_count).toBe(0);
  });

  /**
   * Moving a vote between articles has to recount BOTH — the one it left as
   * well as the one it arrived at. Only the arrival side is obvious, which is
   * why the departure side is the one that rots.
   */
  it('recounts both sides when a vote moves between articles', async () => {
    const h = makeHarness();
    h.rows('crm_knowledge_article').push(article({ id: 'ka1', helpful_count: 1 }));
    h.rows('crm_knowledge_article').push(article({ id: 'ka2', helpful_count: 0 }));
    h.rows('crm_article_feedback').push({
      id: 'af1', crm_knowledge_article: 'ka2', verdict: 'helpful', owner_id: 'u1',
    });

    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { crm_knowledge_article: 'ka2', verdict: 'helpful', owner_id: 'u1' },
      previous: { crm_knowledge_article: 'ka1', verdict: 'helpful', owner_id: 'u1' },
      user: USER,
      api: h.api,
    }));

    const byId = Object.fromEntries(
      h.rows('crm_knowledge_article').map((r) => [r.id, r]),
    ) as Record<string, Rec>;
    expect(byId.ka1.helpful_count).toBe(0);
    expect(byId.ka2.helpful_count).toBe(1);
  });

  it('does nothing at all without ctx.api rather than throwing into the vote', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'afterInsert',
        input: { crm_knowledge_article: 'ka1' },
        user: USER,
        api: undefined,
      })),
    ).resolves.toBeUndefined();
  });
});

// ───────────────────────────────────────── 4. the object that carries a vote ──

describe('crm_article_feedback is shaped so the counters can mean “how many people”', () => {
  it('keys one vote per reader per article, at an explicit scope', () => {
    const indexes = (ArticleFeedback.indexes ?? []) as Rec[];
    const unique = indexes.find((i) => i.unique);
    expect(unique?.fields).toEqual(['crm_knowledge_article', 'owner_id']);
    // ADR-0120: bare `true` means GLOBAL (deprecated spelling, rejected at
    // protocol 18). One reader's opinion of one article is not unique across
    // every installation on earth.
    expect(unique?.unique).toBe('organization');
  });

  it('cascades with the article rather than orphaning a verdict', () => {
    const fields = ArticleFeedback.fields as Record<string, Rec>;
    // `Field.lookup`'s default is `set_null`, which is what made every enrolled
    // person permanently undeletable in #696: the cleared row instantly broke
    // the object's own required-reference rule and rolled the delete back.
    expect(fields.crm_knowledge_article.deleteBehavior).toBe('cascade');
    expect(fields.crm_knowledge_article.required).toBe(true);
  });

  it('offers exactly the two verdicts the two counters count', () => {
    const options = ((ArticleFeedback.fields as Rec).verdict as Rec).options as Rec[];
    expect(options.map((o) => o.value)).toEqual(['helpful', 'not_helpful']);
  });
});
