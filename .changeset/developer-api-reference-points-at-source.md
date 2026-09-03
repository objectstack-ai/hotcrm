---
'hotcrm': patch
---

Replace the last hand-copied `crm_*` transcript left in the tree with pointers at its
source of truth. `docs/developers/api_reference.md` listed fifteen object names while
`src/objects/*.object.ts` registers eighteen — `crm_article_feedback`, `crm_event` and
`crm_event_attendee` had zero hits, with no phantom entries in the other direction. That
is the same original already replaced in `AGENTS.md` (PR #1438), `docs/ARCHITECTURE.md`
(PR #1476) and the three published `api-reference` pages (PR #1489); this was the fourth
and last copy of it.

The fifteen `Key fields:` lists went with the roster, measured rather than assumed. They
transcribed 274 field names against the 302 those same fifteen objects declare on disk.
Fifteen of the 274 match no field at all: `owner` in eleven sections, plus `competitors`
on `crm_opportunity`, `view_count` on `crm_knowledge_article`, and `first_opened_date` /
`first_clicked_date` on `crm_campaign_member`, which #597 removed because no email
engine in the installed platform can write them. Forty-three declared fields were absent.
Twelve of the fifteen sections named at least one field that does not exist and thirteen
were incomplete; two were correct. The `owner` entries are the sharpest of these: the
declared field is `owner_id`, and the note above it in `account.object.ts` reads "⛔ Never
author a SECOND `owner` lookup beside it" — so the page taught eleven times over the one
field name that file exists to forbid.

Neither list is completed. A completed transcription drifts again next quarter — 2026-08-31
ruling item 5, whose text names an object's fields beside the roster itself, and the case
law behind it (#610, #965, #977, #1228). The roster pointer carries the wording PR #1438
landed and PR #1476 and PR #1489 reused, unchanged, because these are copies of one
original. The field pointer says where fields are declared and what a name-only transcript
drops, and restates no count.

No guard is added or retired: 2026-08-31 ruling item 3 keeps gate-type mechanisms on the
platform, and deletion needs no coverage. `test/docs-src-tree-paths.test.ts` lists this
file in `TREE_DOCS`; the guard is untouched and green either side of this change, and the
page still names `src/objects/` inline, so its membership there has not gone vacuous.
