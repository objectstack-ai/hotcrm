---
'hotcrm': patch
---

Replace the two hand-copied machine lists left in `docs/` with pointers at their
source of truth. `docs/ARCHITECTURE.md` transcribed a fifteen-name `crm_*` object
table that had drifted three objects behind `src/objects/*.object.ts` —
`crm_article_feedback`, `crm_event` and `crm_event_attendee` were missing, with no
phantom entries in the other direction. `docs/DEPLOYMENT.md` stated `pnpm verify` as
a four-step chain when `package.json` chains eight, omitting `lint`,
`lint:i18n-gate`, `hygiene` and `hygiene:tokens` — so anyone troubleshooting from
that page believed a green local run had covered a shrink-only ratchet and the i18n
gate that it had in fact never run.

Neither list is completed. A completed transcription drifts again next quarter,
which is 2026-08-31 ruling item 5 and the case law behind it (#610, #965, #977,
#1228). Both sites now carry the wording PR #1438 already landed for the same two
transcriptions in `AGENTS.md`, because these were two copies of one original. The
`docs/DEPLOYMENT.md` sentence states no step count at all — the number is itself a
transcription that would drift.

No guard is added: 2026-08-31 ruling item 3 keeps gate-type mechanisms on the
platform, and this repo does not grow a gate farm.
