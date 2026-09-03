---
'hotcrm': patch
---

Replace the hand-copied `crm_*` object roster on the published API reference with a
pointer at its source of truth, in all three locales. `content/docs/customization/
api-reference.mdx` and its `.zh-Hans` / `.zh-Hant` siblings each tabulated fifteen
object names while `src/objects/*.object.ts` registers eighteen —
`crm_article_feedback`, `crm_event` and `crm_event_attendee` had zero hits in all
three files, with no phantom entries in the other direction. This is the
customer-facing documentation site, so a developer reading it to learn what HotCRM
models was told three of its objects do not exist, in three languages.

The same page also pointed readers at `docs/developers/api_reference.md` for "the
current object and field inventory" — a fourth hand-copied transcript of the same
roster, carrying the same fifteen names, reached by a relative link out of the
content root that does not resolve on the built site. Both statements are replaced by
one pointer at `src/objects/*.object.ts`.

The list is not completed. A completed transcription drifts again next quarter, which
is 2026-08-31 ruling item 5 and the case law behind it (#610, #965, #977, #1228); this
roster had already drifted in four separate files from one original. The pointer
carries the wording PR #1438 landed in `AGENTS.md` and PR #1476 reused in
`docs/ARCHITECTURE.md`, unchanged, because these are copies of one original. The
supersession note those two internal-tree sites carry is deliberately not reproduced
here: `Supersedes` has zero occurrences anywhere under `content/docs`, and a dated
ruling reference is maintainer bookkeeping rather than something a customer can act
on. It is recorded in this changeset instead.

The enumeration was measured to be decorative rather than load-bearing on this page.
The table listed bare object names grouped by business domain — byte-identical in
content to the domain table PR #1476 removed from `docs/ARCHITECTURE.md` — while the
page states two paragraphs above that route shape varies by runtime version and that
readers should prefer their own runtime's API explorer. `content/docs/guides/
integrations.mdx` sends readers here "for the object inventory" in all three locales,
and that promise is now kept more accurately than the stale table kept it.

No guard is added, and none is retired: 2026-08-31 ruling item 3 keeps gate-type
mechanisms on the platform.
