// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Knowledge article lifecycle hook.
 *
 * On the FIRST publish, stamps `published_at` and `last_reviewed_at`. On a later
 * REVIEW — a re-publish after archiving, or an edit of the article's content
 * while it stays published — refreshes `last_reviewed_at` only, so admin
 * "stale article" reports keep working while the original publish date stays
 * put.
 *
 * ### What is a review, and what is not (#2060 item 10, B-17)
 *
 * The date "reflects real attention" (`content/docs/service/knowledge-base.mdx`).
 * Until #2060 it refreshed on EVERY write of a published article, and two
 * writers that are not attention reached it, both measured on 18.0.0-next.3:
 *
 *   - A reader's Helpful / Not Helpful vote. The action writes a
 *     `crm_article_feedback` row, and `article_feedback_metrics_refresh`
 *     recounts the article by id, submitting `{ id, helpful_count,
 *     not_helpful_count }` and nothing else. Every vote moved the date to
 *     today.
 *   - The seed insert. The three published sample articles author their
 *     review dates (`daysAgo(20)`, `daysAgo(10)`, `daysAgo(220)`), and the
 *     insert stamped the boot instant over all three, so "Legacy SSO Setup",
 *     authored 220 days stale, read as reviewed on its first boot.
 *
 * So a write is a review only when it PUBLISHES (an insert, or a move into
 * `published` from any other status) or CARRIES one of the article's content
 * fields, the keys an author edits. That is an allow-list on purpose: a
 * bookkeeping writer added later (a rollup, an ownership claim, a key the
 * platform stamps) cannot refresh the date by accident, which is the failure
 * measured here. An owner change submits `owner_id` only, so it is not a review
 * either. The console's edit form sends the fields the user changed, or the
 * whole form on a Save with nothing changed: an author confirming the
 * article, which counts.
 *
 * A write that SUPPLIES `last_reviewed_at` keeps it, on insert and update
 * alike, the precedence `published_at` follows below. Only a system write (the
 * seed, an import, a script action body) can supply one: the field is
 * `readonly`, and the engine strips a person's read-only value before
 * `beforeInsert` / `beforeUpdate` run. Measured: a service agent's insert
 * carrying 2024 dates stored today for both, so a person cannot backdate a
 * review. That is what seed doctrine rule 2 (`src/sales/data/_shared.ts`)
 * asks of a hook-owned seeded value: what the seed authors is what this hook
 * stores.
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
 *     that value is what gets stored. Only a SYSTEM write can supply it: the
 *     engine strips a person's read-only value before the hooks run, on insert
 *     and update alike (measured on 18.0.0-next.3, #2060 item 10). So an import
 *     or migration publishing records with their historical dates reaches this
 *     handler with `published_at` set and no `previous`, and stamping over it
 *     rewrites imported history.
 *
 * ⚠️ HISTORY — do not reason from it. #788 measured, on 17.0.0-rc.2, two engine
 * behaviours this handler deliberately did not paper over: `readonly: true` was
 * not enforced on the insert path at all, and on the update path the strip
 * deleted the caller-supplied key together with whatever a hook wrote there.
 * Neither holds on 18.0.0-next.3: a person's value is stripped before the
 * hooks, and a hook's own write survives (`test/hooks-runtime-service.test.ts`,
 * "does not let a person backdate a review").
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
 *     return, and that return reads the ROW. Measured on 17.4.0 on a
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
 * stop a batch insert (the seed load, an import) stamping either date a row
 * does not carry.
 *
 * ⚠️ HISTORY — do not reason from it. Until 17.3.0 the sandbox context carried
 * no per-row signal, so a `ctx.dispatch` guard lowered cleanly, passed every
 * in-process test and was INERT in production; PR #1274 recorded that as the
 * reason this could not be fixed here. That is FALSE from 17.3.0 on:
 * `buildSandboxContext` marshals `dispatch` and an `inputOptions` projection
 * (objectstack#11552), and `test/hooks-runtime-service.test.ts` pins that they
 * cross. `ctx.input.id` is still absent — read `ctx.previous.id`.
 */
const knowledgeArticlePublish: Hook = {
  name: 'knowledge_article_publish_timestamps',
  object: 'crm_knowledge_article',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 300,
  description: 'Stamp published_at on the first publish; refresh last_reviewed_at on a publish or a content edit.',
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
    // A review is a publish, or a write carrying the article's content (see the
    // header): a vote's recount or an owner change carries neither. A date the
    // write supplies is kept, and only a system write can supply one.
    const content = ['title', 'summary', 'body', 'category', 'tags', 'audience', 'language', 'related_to_case'];
    const reviewed = previous?.status !== 'published' || content.some((key) => input[key] !== undefined);
    if (reviewed && !input.last_reviewed_at) input.last_reviewed_at = nowIso;
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
