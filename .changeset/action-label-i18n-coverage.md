---
'hotcrm': patch
---

Translate every action label in all four locales, and guard the class with a
test. Three actions (`enroll_leads`, `schedule_followup`, `generate_quote`) had
no label entry in any locale pack, so they rendered their English code label in
zh-CN / ja-JP / es-ES; `log_meeting`'s zh-CN translation sat in a dead top-level
`globalActions` block instead of under `crm_case._actions`, where the action's
`objectName` puts it. Adds two assertions to
`test/metadata-references.test.ts` — every action needs a label in every locale,
and `confirmText` / `successMessage` must be translated wherever the action
declares them — so this class fails in CI instead of in a demo. Refs #494.
