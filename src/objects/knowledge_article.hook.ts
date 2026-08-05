// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Knowledge article lifecycle hook.
 *
 * On the FIRST publish, stamps `published_at` and `last_reviewed_at`. On every
 * later write that leaves the article published — an ordinary edit, or a
 * re-publish after archiving — refreshes `last_reviewed_at` only, so admin
 * "stale article" reports keep working while the original publish date stays
 * put.
 *
 * "First publish" is decided by whether the record ALREADY CARRIES a
 * `published_at`, not by which status the write arrives from (#780). The old
 * test was `previous.status === 'published'`, which recognises only the
 * published → published edit as a re-publish. But the documented lifecycle is
 * `draft → in_review → published → archived`, so the ordinary re-shelving move
 * `archived → published` arrives with `previous.status === 'archived'`, fell
 * into the first-publish branch, and moved a 2024 publish date to today. The
 * `all_articles` view sorts `published_at desc`, so the re-shelved article
 * jumped to the top of the list as if it had just been written.
 *
 * The date is read as `input.published_at ?? previous?.published_at` — the
 * value this record would end up with if the handler stamped nothing, which is
 * exactly the question "does it already have one". This is precedence between
 * the two halves of one write, not a tolerated alias for one key, and both
 * halves are load-bearing:
 *
 *   - `previous` is the FULL stored row: the engine's `sys_fetch_previous_update`
 *     builtin fetches it with an unprojected `findOne`, so a re-publish sees the
 *     original date there.
 *   - `input` carries the date whenever the write supplies one, and on an INSERT
 *     that value is what gets stored: measured on 17.0.0-rc.2, the engine's
 *     read-only strip runs on the update path only, and hooks run before it in
 *     any case. So an import or migration publishing records with their
 *     historical dates reaches this handler with `published_at` set and no
 *     `previous`, and stamping over it rewrites imported history.
 *
 * Two adjacent engine behaviours this handler deliberately does NOT try to
 * paper over, both measured and filed as #788: `readonly: true` is not enforced
 * on the insert path at all, and on the update path the strip deletes the
 * caller-supplied key together with whatever a hook wrote there — so an update
 * that echoes `published_at` back can land a published article with none. That
 * outcome is identical before and after this change; a lenient consumer here
 * would only hide it.
 *
 * Deliberately unchanged: this is the single-record path. On the bulk path
 * (`multi: true`) there is no `input.id`, so `sys_fetch_previous_update` fetches
 * nothing and `previous` is always absent — tracked separately as #779, and the
 * existence criterion above is the one that degrades most gracefully there
 * (a bulk write supplying its own `published_at` now keeps it).
 */
const knowledgeArticlePublish: Hook = {
  name: 'knowledge_article_publish_timestamps',
  object: 'crm_knowledge_article',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 300,
  description: 'Stamp published_at on the first publish; refresh last_reviewed_at while published.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    const nextStatus = (typeof input.status === 'string' && input.status) || previous?.status;
    if (nextStatus !== 'published') return;

    const nowIso = new Date().toISOString();
    // Publishing, re-publishing and editing while published are all reviews.
    input.last_reviewed_at = nowIso;
    // The emptiness test is spelled out here rather than factored into a
    // module-scope helper: hook handlers lower to a metadata-only body, and a
    // free identifier would push this one into the legacy runtime bundle
    // instead — `test/action-sandbox.test.ts` fails the build on it.
    const existing = input.published_at ?? previous?.published_at;
    if (existing === undefined || existing === null || existing === '') {
      input.published_at = nowIso;
    }
  },
};

export default knowledgeArticlePublish;
