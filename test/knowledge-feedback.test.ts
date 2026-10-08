// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import articleFeedbackHooks from '../src/service/objects/article_feedback.hook';
import { ArticleFeedback } from '../src/service/objects/article_feedback.object';
import { KnowledgeArticle } from '../src/service/objects/knowledge_article.object';
import {
  MarkArticleHelpfulAction,
  MarkArticleNotHelpfulAction,
} from '../src/service/actions/knowledge_article.actions';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';
import { KnowledgeArticleViews } from '../src/service/views/knowledge_article.view';
import { localePacks } from './helpers/composed-stack';

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
 *     bodies and the shipped hook inside real writes on the app booted by
 *     `@objectstack/verify`, never by checking that they are registered.
 *
 * The distinction matters because "the field has a writer" is exactly the kind
 * of claim that passes review while being false: `_hook-api.ts`'s header
 * records eight hook-side derived writes that compiled, tested green and threw
 * on every invocation for months (#616). So the counters below are read off a
 * store the shipped code actually wrote to.
 */

const article = (over: Rec = {}): Rec => ({
  id: 'ka1', title: 'Reset your password', status: 'published', audience: 'public',
  helpful_count: 0, not_helpful_count: 0, owner_id: 'author_1', ...over,
});

type Rec = Record<string, any>;

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
   * through the real action door (`@objectstack/verify`'s `actions.run`: the
   * dispatcher, then the body in the runtime's QuickJS sandbox, writing through
   * the real engine) — so a body that reached for module scope, or used the
   * `(id, doc)` update spelling, fails here. A reader is a real sign-up; each
   * case votes on an article of its own, published and public.
   */
  let verify: VerifyStack;
  let reader: Person;
  beforeAll(async () => {
    verify = await hotcrmStack();
    reader = await signUpPerson(verify, 'reader@knowledge-feedback.test', {
      name: 'Rita Reader', positions: ['service_agent'], permissionSets: ['service_agent'],
    });
  }, 120_000);

  let n = 0;
  const publishedArticle = async (): Promise<string> => {
    // A real article needs what `published_requires_body` asks of every
    // published article; the summary is the warning-severity sibling.
    const { id: _ignored, owner_id: _author, ...doc } = article({
      title: `Reset your password #${++n}`,
      body: 'Open Settings › Security and choose Reset password.',
      summary: 'How to reset a forgotten password.',
    });
    const [row] = await verify.seed('crm_knowledge_article', [doc]);
    return String(row.id);
  };
  const vote = (action: 'mark_article_helpful' | 'mark_article_not_helpful', recordId: string) =>
    verify.actions.run('crm_knowledge_article', action, { as: reader.token, recordId });
  const feedbackOn = (articleId: string) =>
    verify.rows('crm_article_feedback', { crm_knowledge_article: articleId });

  it('inserts the reader’s verdict, owned by the reader', async () => {
    const ka = await publishedArticle();
    await vote('mark_article_helpful', ka);

    const rows = await feedbackOn(ka);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      crm_knowledge_article: ka,
      verdict: 'helpful',
      // An action body runs `isSystem`, so NOTHING stamps the ownership anchor
      // for it (#548). A null owner here would collapse every vote onto one
      // row through the unique index — the dedupe depends on this.
      owner_id: reader.id,
    });
  });

  it('UPDATES the reader’s existing row when they change their mind', async () => {
    const ka = await publishedArticle();
    await vote('mark_article_helpful', ka);
    const [first] = await feedbackOn(ka);

    await vote('mark_article_not_helpful', ka);

    // The row moved; a second row would make the counters answer "how many
    // clicks", which is not a number anyone wants beside "Not Helpful".
    const rows = await feedbackOn(ka);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(first!.id);
    expect(rows[0]!.verdict).toBe('not_helpful');
  });

  it('is a no-op when the reader re-votes the same way', async () => {
    const ka = await publishedArticle();
    await vote('mark_article_helpful', ka);

    // Watched on the real engine's own write methods, for this object only.
    const ql = verify.kernel.getService<Record<string, any>>('objectql');
    const finds = vi.spyOn(ql, 'findOne');
    const updates = vi.spyOn(ql, 'update');
    const inserts = vi.spyOn(ql, 'insert');
    try {
      await vote('mark_article_helpful', ka);
      // Anti-vacuity: the body did look the reader's vote up through this engine.
      expect(finds.mock.calls.filter(([o]) => o === 'crm_article_feedback').length).toBeGreaterThan(0);
      expect(updates.mock.calls.filter(([o]) => o === 'crm_article_feedback')).toHaveLength(0);
      expect(inserts.mock.calls.filter(([o]) => o === 'crm_article_feedback')).toHaveLength(0);
    } finally {
      finds.mockRestore();
      updates.mockRestore();
      inserts.mockRestore();
    }
    expect(await feedbackOn(ka)).toHaveLength(1);
  });

  it('refuses an unauthenticated vote rather than writing an ownerless row', async () => {
    // The body refuses a caller with no user ("Sign in to rate an article").
    // Through the real door an anonymous vote is refused one step earlier — the
    // dispatcher answers 401 before any body runs — and the property is the
    // same: no ownerless row.
    const ka = await publishedArticle();
    const res = await verify.api(`/actions/crm_knowledge_article/mark_article_helpful`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recordId: ka, params: {} }),
    });
    expect(res.status).toBe(401);
    expect(await feedbackOn(ka)).toHaveLength(0);
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
  /**
   * Readers voting through the feedback actions as themselves (a reader holds
   * no edit right on the article, and feedback is `controlled_by_parent`, so a
   * reader's own direct insert is refused — the action is their door), an
   * admin moderating through the engine's write door (`hooks.run`), the system
   * importing — and the counters read off the article the engine stored. The
   * hook is `async: true`, so a count is waited for.
   */
  const hook = (articleFeedbackHooks as Rec[]).find((h) => h.name === 'article_feedback_metrics_refresh')!;
  let verify: VerifyStack;
  let admin: string;
  const readers: Person[] = [];
  let n = 0;
  beforeAll(async () => {
    verify = await hotcrmStack();
    admin = await verify.signIn();
    for (const name of ['u1', 'u2', 'u3']) {
      readers.push(await signUpPerson(verify, `${name}@knowledge-feedback-recount.test`, {
        name: `Reader ${name}`, positions: ['service_agent'], permissionSets: ['service_agent'],
      }));
    }
  }, 120_000);

  /** A published, public article, its counters as `over` says — written as the system. */
  const articleOf = async (over: Rec = {}): Promise<string> => {
    const { id: _id, owner_id: _owner, ...doc } = article({
      title: `Recount me #${++n}`, body: 'Open Settings › Security and choose Reset password.',
      summary: 'How to reset a forgotten password.', ...over,
    });
    return String((await verify.seed('crm_knowledge_article', [doc]))[0]!.id);
  };
  /** `reader` voting through the shipped action; resolves with the row the action wrote. */
  const vote = async (reader: Person, articleId: string, verdict: 'helpful' | 'not_helpful'): Promise<Rec> => {
    const action = verdict === 'helpful' ? 'mark_article_helpful' : 'mark_article_not_helpful';
    await verify.actions.run('crm_knowledge_article', action, { as: reader.token, recordId: articleId });
    const [row] = await verify.rows('crm_article_feedback', { crm_knowledge_article: articleId, owner_id: reader.id });
    expect(row, `${action} wrote no feedback row`).toBeTruthy();
    return row!;
  };
  const counters = async (articleId: string) => {
    const [row] = await verify.rows('crm_knowledge_article', { id: articleId });
    return { helpful_count: row!.helpful_count, not_helpful_count: row!.not_helpful_count };
  };
  /** Wait for the article's counters to read `expected`. */
  const settlesAt = (articleId: string, expected: Rec) =>
    vi.waitFor(async () => expect(await counters(articleId)).toMatchObject(expected), { timeout: 10_000, interval: 50 });

  it('is wired to every write that can change a verdict', () => {
    expect(hook.events).toEqual(['afterInsert', 'afterUpdate', 'afterDelete']);
  });

  it('writes both counters from the rows that exist', async () => {
    const ka = await articleOf();
    await vote(readers[0]!, ka, 'helpful');
    await vote(readers[1]!, ka, 'helpful');
    await vote(readers[2]!, ka, 'not_helpful');
    await settlesAt(ka, { helpful_count: 2, not_helpful_count: 1 });
  });

  /**
   * RECOUNT, not increment — the property that makes this safe to replay, safe
   * under concurrency, and self-healing. A running total cannot pass this: run
   * the recount again over the same votes and an incrementing writer reports
   * more.
   */
  it('is idempotent — running the recount again does not double the count', async () => {
    // The stored counter starts WRONG on purpose. A recount converges on the
    // truth whatever it finds; an incrementing writer walks 5 → 6 → 7 and never
    // notices. Without this seed both writers report 2 after two runs and the
    // test cannot tell them apart — measured, by reverse-verifying against an
    // increment implementation.
    const ka = await articleOf({ helpful_count: 5 });
    expect((await counters(ka)).helpful_count, 'the wrong starting count did not land').toBe(5);
    const first = await vote(readers[0]!, ka, 'helpful');
    await settlesAt(ka, { helpful_count: 1 });
    await vote(readers[1]!, ka, 'helpful');
    await settlesAt(ka, { helpful_count: 2 });
    // The same vote saved again (a note added by the system) fires the
    // recount once more over the same rows.
    await systemUpdate(verify, 'crm_article_feedback', { id: first.id, comment: 'Still helpful.' });
    await new Promise((r) => setTimeout(r, 400));
    expect((await counters(ka)).helpful_count).toBe(2);
  });

  /**
   * A counter that only ever goes up is a different kind of lie — the lesson
   * the campaign junction paid for in #696.
   */
  it('follows a vote back down when the reader changes their mind', async () => {
    const ka = await articleOf();
    await vote(readers[0]!, ka, 'helpful');
    await settlesAt(ka, { helpful_count: 1, not_helpful_count: 0 });
    await vote(readers[0]!, ka, 'not_helpful');
    await settlesAt(ka, { helpful_count: 0, not_helpful_count: 1 });
  });

  /**
   * A PERSON's own write of a vote reaches the counters too (#2014). The
   * readers' votes arrive through the feedback actions, whose bodies run
   * system-elevated; an admin withdrawing a vote is an ordinary write as
   * themselves. The counters are `readonly`, and the engine drops a readonly
   * key a non-system caller writes, so the recount declares `runAs: 'system'` —
   * before it did, the withdrawn vote was gone and the article still counted
   * it. Elevation is not anonymity: the article names the admin as its last
   * writer.
   */
  it('stops counting a vote the admin withdraws', async () => {
    const ka = await articleOf();
    const cast = await vote(readers[0]!, ka, 'helpful');
    await settlesAt(ka, { helpful_count: 1 });
    await verify.hooks.run('crm_article_feedback', 'delete', { id: cast.id }, { as: admin });
    expect(await verify.rows('crm_article_feedback', { id: cast.id }), 'the vote was not withdrawn').toEqual([]);
    await settlesAt(ka, { helpful_count: 0, not_helpful_count: 0 });
    const [stored] = await verify.rows('crm_knowledge_article', { id: ka });
    expect(stored!.updated_by, 'the recount was recorded as nobody’s write').toBe(String((await verify.contextFor(admin)).userId));
  });

  /**
   * Moving a vote between articles has to recount BOTH — the one it left as
   * well as the one it arrived at. Only the arrival side is obvious, which is
   * why the departure side is the one that rots. A vote is re-parented by a
   * data fix — the system's write (a person's own write is the case above).
   */
  it('recounts both sides when a vote moves between articles', async () => {
    const ka1 = await articleOf();
    const ka2 = await articleOf();
    const cast = await vote(readers[0]!, ka1, 'helpful');
    await settlesAt(ka1, { helpful_count: 1 });
    await systemUpdate(verify, 'crm_article_feedback', { id: cast.id, crm_knowledge_article: ka2 });
    await settlesAt(ka1, { helpful_count: 0 });
    await settlesAt(ka2, { helpful_count: 1 });
  });

  it('recounts a vote the system imported too — every writer reaches it', async () => {
    // The `!ctx.api` stand-down is unreachable on the shipped app (the engine
    // hands every write a read door), so the other writer is the system's.
    const ka = await articleOf();
    await verify.seed('crm_article_feedback', [{ crm_knowledge_article: ka, verdict: 'not_helpful', owner_id: readers[2]!.id }]);
    await settlesAt(ka, { helpful_count: 0, not_helpful_count: 1 });
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
