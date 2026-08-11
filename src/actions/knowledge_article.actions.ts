// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Knowledge article feedback actions (#601).
 *
 * The two buttons that finally make `helpful_count` / `not_helpful_count`
 * move. Neither writes a counter: each records the reader's own
 * `crm_article_feedback` row, and `article_feedback_metrics_refresh` recounts
 * the article from that table. The full reasoning for the indirection — a
 * sandboxed action body cannot UPDATE a sharing-ruled object, the article is
 * write-owned, and there is no atomic increment — is on
 * `src/objects/article_feedback.object.ts`.
 *
 * ### One body, generated twice
 *
 * `feedbackBody(verdict)` composes the source string both actions ship. This is
 * FACTORY composition, which is allowed and is what `_case-assignment.ts` does
 * for hooks: the string it returns is complete and self-contained, so the body
 * that reaches the QuickJS sandbox reaches for no module scope. The forbidden
 * shape is the other one — a body that CALLS a shared function at runtime,
 * which lowers to a `ReferenceError` because the body ships without its module
 * (`test/action-sandbox.test.ts` fails the build on it, and
 * `test/knowledge-feedback.test.ts` pins that these two bodies stay
 * character-identical apart from the verdict).
 *
 * ### Re-voting UPDATES rather than inserting
 *
 * `crm_article_feedback` carries a unique index on
 * (`crm_knowledge_article`, `owner_id`), so a reader who clicks Helpful and
 * then Not Helpful must move their existing row, not add a second one. The
 * body therefore reads first. Without the dedupe the counters would answer
 * "how many clicks", and one enthusiastic reader could out-vote a department.
 *
 * `owner_id` is set EXPLICITLY: an action body runs `isSystem`, so nothing
 * stamps the ownership anchor for it (#548, the same note
 * `clone_opportunity` carries). It is the voter's identity that keys the
 * dedupe, so getting it from `ctx.user` is load-bearing rather than tidy — a
 * null owner would collapse every anonymous-looking vote onto one row.
 */
const feedbackBody = (verdict: 'helpful' | 'not_helpful'): string => `
      const id = ctx.recordId;
      if (!id) throw new Error('submit_article_feedback requires a recordId');
      const userId = ctx.user?.id ?? null;
      if (!userId) throw new Error('Sign in to rate an article.');

      // One row per (article, reader) — the unique index says so, and this
      // read is what keeps a mind-change an UPDATE instead of a duplicate.
      const existing = await ctx.api.object('crm_article_feedback').findOne({
        where: { crm_knowledge_article: id, owner_id: userId },
      });

      if (existing && existing.id) {
        if (existing.verdict === '${verdict}') {
          return { ok: true, id: existing.id, verdict: '${verdict}', changed: false };
        }
        await ctx.api.object('crm_article_feedback').update(
          { id: existing.id, verdict: '${verdict}' },
          { where: { id: existing.id } },
        );
        return { ok: true, id: existing.id, verdict: '${verdict}', changed: true };
      }

      const inserted = await ctx.api.object('crm_article_feedback').insert({
        crm_knowledge_article: id,
        verdict: '${verdict}',
        owner_id: userId,
      });
      return { ok: true, id: inserted?.id ?? null, verdict: '${verdict}', changed: true };
    `;

/**
 * Only PUBLISHED articles collect votes. A draft's counters would describe a
 * version no reader outside the authoring team ever saw, and the review queue
 * reads these numbers as a signal about live content.
 */
const publishedOnly = P`record.status == "published"`;

export const MarkArticleHelpfulAction: Action = {
  name: 'mark_article_helpful',
  label: 'Helpful',
  objectName: 'crm_knowledge_article',
  icon: 'thumbs-up',
  type: 'script',
  body: {
    language: 'js',
    source: feedbackBody('helpful'),
    capabilities: ['api.read', 'api.write'],
    timeoutMs: 5000,
  },
  locations: ['record_header'],
  visible: publishedOnly,
  successMessage: 'Thanks — recorded as helpful.',
  refreshAfter: true,
};

export const MarkArticleNotHelpfulAction: Action = {
  name: 'mark_article_not_helpful',
  label: 'Not Helpful',
  objectName: 'crm_knowledge_article',
  icon: 'thumbs-down',
  type: 'script',
  body: {
    language: 'js',
    source: feedbackBody('not_helpful'),
    capabilities: ['api.read', 'api.write'],
    timeoutMs: 5000,
  },
  locations: ['record_header'],
  visible: publishedOnly,
  successMessage: 'Thanks — recorded as not helpful.',
  refreshAfter: true,
};
