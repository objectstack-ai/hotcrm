---
---

Test-guard only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata and no `content/docs/` prose
changed: the whole diff is `test/docs-view-rosters.test.ts` and this file.

**The list-view roster's name-exactness rule now runs on the Chinese faces too.**
It was English-only for a stated reason: while two spellings were lawful on
those pages — the `zh-CN` pack wording on some, the English label on others —
there was no single string a name column could be checked against, so the
translated faces were held to structure alone (same section, same number of
roster entries). #1329's ruling of 2026-08-31 ended that split, PR #1548
executed it, and item 3 of that ruling declares this guard's extension
unlocked. This is the extension.

**The two translated faces are not symmetric, and are not built the same way.**

- **zh-Hans is DERIVED, live.** `src/translations/zh-CN.ts` carries a `_views`
  entry for every view a documented object ships — 55 of 55, measured — and the
  Chinese console resolves a view's `label` through it, which is what makes the
  pack wording the string a reader can search the UI with. So the allowed set
  is read off the pack at run time, keyed by the same view key `src/views/**`
  registers, exactly as the English rule reads the shipped `label`. Rename a
  view in the pack and the rule goes red. A companion rule fails first, and
  more usefully, when a shipped view has no pack entry at all: that gap makes
  the console print English in a Chinese session, and blaming the page for it
  would point at the wrong file.
- **zh-Hant is PINNED, by hand, and says so.** `i18n.supportedLocales` is
  en / zh-CN / ja-JP / es-ES. This app ships no Traditional pack, nothing in
  the repo produces those strings, and nothing but this rule reads them. The
  new `ZH_HANT_VIEW_NAMES` table opens by saying that in as many words, states
  what it cannot buy (a rename that happens only upstream will never move it),
  and is audited one-to-one against the shipped views so a view arriving or
  leaving fails here until a human writes its Traditional name.

⛔ **The zh-Hant side is deliberately not derived from the zh-CN one.** #1329's
dev measured that the convention this corpus follows substitutes words, not
glyphs; a third case turned up writing this rule. On today's tree, counted with
`grep -ro <term> content/docs | wc -l`: `合同` → **合約** (308); `营销` →
**行銷** (230), where the strict-glyph 營銷 appears **0** times; `联系人` →
**聯絡人** (270), where the strict-glyph 聯繫人 appears **0** times. A derived
rule would be wrong on all three, across four pages, the day it was written.

`revenue/approvals` is outside these rules structurally, not by exemption: it
names five views owned by the approval plugin's `sys_approval_request`, and it
heads those tables *Where to find pending approvals* rather than with a roster
heading, so `rosterOf` returns null for it on all three faces and it never
enters `PAGE_OBJECT`. Whether those names should be checked, and against what,
is open on #1552 — nothing here answers or forecloses it.

The English path is not rewritten. Parsing a name column is now one code path
shared by the three faces (`nameColumns`), and so is the pair of vacuity checks
every face answers the same way (`expectNameColumnIsReadable` — read a name
column out of every mapped page at all, and every cell opens with a bold run).
What each rule ALLOWS in that column, and what its failure means, stays in the
rule with its own message, because those are three different facts.
