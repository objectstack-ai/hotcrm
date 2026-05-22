// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Knowledge article lifecycle hook.
 *
 * On status transition to `published`, stamps `published_at` and
 * `last_reviewed_at`. On any subsequent edit while published, refreshes
 * `last_reviewed_at` so admin "stale article" reports work.
 */
const knowledgeArticlePublish: Hook = {
  name: 'knowledge_article_publish_timestamps',
  object: 'knowledge_article',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 300,
  description: 'Stamp published_at / last_reviewed_at on status transitions.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    const nextStatus = (typeof input.status === 'string' && input.status) || previous?.status;
    const wasPublished = previous?.status === 'published';
    const nowIso = new Date().toISOString();

    if (nextStatus === 'published' && !wasPublished) {
      input.published_at = nowIso;
      input.last_reviewed_at = nowIso;
    } else if (nextStatus === 'published' && wasPublished) {
      input.last_reviewed_at = nowIso;
    }
  },
};

export default knowledgeArticlePublish;
