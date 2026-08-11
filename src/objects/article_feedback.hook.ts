// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * The writer behind the knowledge article's engagement counters (#601).
 *
 * `crm_knowledge_article.helpful_count` and `not_helpful_count` were declared
 * `readonly: true` with a `defaultValue: 0` and NO writer anywhere — on the
 * platform or in this app — so they were structurally pinned at zero while the
 * article grid showed a "Helpful Votes" column and summed it. That is the same
 * defect `crm_campaign_member`'s engagement lifecycle was retired for (#597),
 * and ADR-0049's enforce-or-remove leaves exactly two honest endings: give the
 * field a writer, or delete it. Feedback on a knowledge article has a real
 * consumer — the review queue an author works from — so these two get a
 * writer. `view_count`, which has none available, was deleted; the reasoning
 * is on `crm_knowledge_article` itself.
 *
 * ### Recount, never increment
 *
 * Every event recomputes both counters from `crm_article_feedback` rather than
 * adding one to what is there. That makes the write idempotent (a replayed
 * hook cannot double-count), self-healing (an admin deleting a bogus vote row
 * is reflected on the next event, and a full recount fixes any historical
 * drift in one pass), and safe under concurrency (two simultaneous votes both
 * converge on the true count, where two read-modify-writes lose one). The
 * counters therefore cannot drift from their own evidence — which is what makes
 * `readonly: true` an honest declaration again rather than a description of
 * paralysis.
 *
 * `afterDelete` is in the event set for the same reason: the campaign junction
 * learned the hard way (#696) that a junction row's disappearance is a metric
 * change, and a counter that only ever goes up is a different kind of lie.
 *
 * `async: true` + `onError: 'log'` mirrors `campaign_member_metrics_refresh`:
 * the reader's vote is the user's action and must not fail because the article
 * row is momentarily locked. A missed refresh is corrected by the next vote;
 * a rejected write loses the vote itself.
 *
 * No loop: this writes `crm_knowledge_article`, whose own hook
 * (`knowledge_article_publish_timestamps`) fires on `before*` and returns
 * immediately unless the record is published — and either way it issues no
 * write against `crm_article_feedback`, so nothing re-enters here.
 *
 * ⚠️ The recount block is written out INLINE and is not shared with
 * `campaign_member.hook.ts`'s structurally similar block. A hook handler lowers
 * to a metadata-only, body-only script: a reference to module scope — an
 * import, a top-level const, a shared factory's parameter — is a
 * `ReferenceError` at runtime, not a closure, and a handler that reaches for
 * one silently stops lowering (`test/action-sandbox.test.ts` fails the build on
 * it). Hooks may be composed by a FACTORY (`_case-assignment.ts` does exactly
 * that); the logic inside a body may not be imported.
 */
const articleFeedbackMetricsRefresh: Hook = {
  name: 'article_feedback_metrics_refresh',
  object: 'crm_article_feedback',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  priority: 800,
  async: true,
  onError: 'log',
  description: 'Recount an article’s helpful / not-helpful votes from crm_article_feedback.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const { input } = ctx;
    const previous = ctx.previous;
    // Both sides on update: moving a vote between articles has to recount the
    // article it LEFT as well as the one it arrived at.
    const articleIds = Array.from(new Set([
      typeof input?.crm_knowledge_article === 'string' ? input.crm_knowledge_article : '',
      typeof previous?.crm_knowledge_article === 'string'
        ? (previous.crm_knowledge_article as string)
        : '',
    ].filter(Boolean)));

    for (const id of articleIds) {
      const helpful = await api.object('crm_article_feedback').count({
        where: { crm_knowledge_article: id, verdict: 'helpful' },
      });
      const notHelpful = await api.object('crm_article_feedback').count({
        where: { crm_knowledge_article: id, verdict: 'not_helpful' },
      });
      await api.object('crm_knowledge_article').update({
        id,
        helpful_count: helpful,
        not_helpful_count: notHelpful,
      }, { where: { id } });
    }
  },
};

export default [articleFeedbackMetricsRefresh];
