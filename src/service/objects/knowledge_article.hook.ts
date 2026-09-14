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
 *   - `previous` is the FULL stored row: `update()` reads it and binds it BEFORE
 *     dispatching `beforeUpdate` (ADR-0058 Addendum II), so a re-publish sees
 *     the original date there. The `sys_fetch_previous_update` builtin that used
 *     to issue that `findOne` is retired.
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
 * On the bulk path (`multi: true`) this handler now runs ONCE PER ROW, with
 * `input.id` bound to the row and `previous` its pre-image (ADR-0058 Addendum
 * II, D1/D2); past 10000 matched rows the whole write is refused with
 * `ERR_BULK_PER_ROW_HOOK_LIMIT`. The rc.2-era account — no `input.id`, no
 * `previous`, nothing stamped (#779, closed) — is HISTORY. Do not reason from
 * it; it is recorded here only because this file's own argument once did.
 *
 * ⚠️ A PREDICATE UPDATE DERIVES NOTHING HERE — ADR-0058 Addendum II D3, and
 * the stand-down at the top of the handler is the idiom every row-conditioned
 * hook in this app carries. The full account and its measurements live in
 * `forecast.hook.ts`; the short version is that `update(obj, payload,
 * { multi: true, where })` sends ONE `SET` clause for all N matched rows and
 * hands every row's `beforeUpdate` THAT payload rather than a per-row copy, so
 * a write whose if-guard reads `ctx.previous` does not scope itself to the row
 * it was decided on.
 *
 * Both writes below are gated on the row, so both diverge — and this hook is
 * key-presence divergence (the loud kind) in BOTH limbs. There is no silent
 * limb, because neither write takes its VALUE from the row: both store
 * `nowIso`, a clock read. The row only ever decides WHETHER a key is written.
 *
 *   - `last_reviewed_at` sits behind the `nextStatus !== 'published'` early
 *     return, and that return reads the ROW. Measured on the pinned 17.4.0 on a
 *     fresh `pnpm dev`: the platform's own seed-ownership claim (one payload of
 *     `{ owner_id }`, `where: { owner_id: null }`) matched all 4 seeded
 *     articles; the 3 published ones stamped `last_reviewed_at`, the 1 draft
 *     returned early and stamped nothing, and the engine refused the batch —
 *     `Refusing a multi-record update on 'crm_knowledge_article': its
 *     'beforeUpdate' handlers wrote 'last_reviewed_at' for some of the 4
 *     matched records and not for others`. Nothing was written, all 4 articles
 *     stayed ownerless, and `my_drafts` (filtered `owner_id =
 *     {current_user_id}`) was EMPTY until the `demo_bootstrap` sweep repaired
 *     them by id ten minutes later.
 *   - `published_at`'s existence criterion is the same shape one key over:
 *     #1888 measured it refused over 3 rows with
 *     `MULTI_UPDATE_HOOK_KEY_DIVERGENCE`. That limb is what #1265 was filed
 *     for, back when the engine widened in silence instead of refusing.
 *
 * ⚠️ The `ctx.event` half of the guard is load-bearing, not ceremony: a batch
 * INSERT also reports `dispatch.mode === 'per-row'`, and there each row carries
 * its OWN payload. This hook is `beforeInsert` too, so dropping that half would
 * stop the seed load stamping `published_at` / `last_reviewed_at` at all.
 *
 * ⚠️ HISTORY — do not reason from it. Until 17.3.0 the sandbox context carried
 * no per-row signal, so a `ctx.dispatch` guard lowered cleanly, passed every
 * in-process test and was INERT in production; PR #1274 recorded that as the
 * reason this could not be fixed here. That is FALSE on the pinned 17.4.0:
 * `buildSandboxContext` marshals `dispatch` and an `inputOptions` projection
 * (objectstack#11552), and `test/hooks-runtime-service.test.ts` pins that they
 * cross. `ctx.input.id` is still absent — read `ctx.previous.id`.
 */
const knowledgeArticlePublish: Hook = {
  name: 'knowledge_article_publish_timestamps',
  object: 'crm_knowledge_article',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 300,
  description: 'Stamp published_at on the first publish; refresh last_reviewed_at while published.',
  handler: async (ctx: HookContext) => {
    // D3 stand-down (see the header). Every write below is decided against this
    // row's `previous`, and this handler makes no refusal, so the whole body
    // stands down on the predicate path; deriving still happens per record.
    if (ctx.event === 'beforeUpdate' && ctx.dispatch?.mode === 'per-row') return;

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
