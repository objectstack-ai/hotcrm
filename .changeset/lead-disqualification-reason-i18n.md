---
'hotcrm': patch
---

Translate `crm_lead.disqualification_reason` in all four locales, and guard the
class with a test. The field had no entry in any bundle, so a `required` field
sitting on eight lead forms rendered its seven raw stored values — `not_a_fit`,
`no_budget`, `wrong_persona`, `unreachable`, `duplicate`, `competitor`, `other` —
inside an otherwise fully translated form. `en` looked correct only by accident:
a missing entry falls back to the English `label` in code, which is why the one
locale a reviewer is most likely to open is the one where the bug cannot be seen.

Adds a `select fields are translated in every locale` block to
`test/metadata-references.test.ts`, extending the action-label coverage guard
(#494) to select fields: every select field needs a label and a label for every
option value, in every locale pack. The 34 select fields that were already
incomplete when this landed are listed in a shrink-only `PENDING_SELECT_LABELS`
ledger — a field added or extended from here on has nothing to hide behind, and
the ledger cannot rot, because an entry that has since been translated fails as
stale and an entry naming a field or locale that does not exist fails as a ghost.
Fixes #631.
