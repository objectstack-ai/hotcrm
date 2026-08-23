---
'hotcrm': patch
---

Document the `Unassigned Cases — Triage` sharing rule on both Chinese
Sharing & Security pages. The rule shipped on 2026-08-12 together with its
English table row and never reached
`content/docs/administration/sharing-and-security.zh-Hans.mdx` or
`.zh-Hant.mdx`, so both listed nine of the app's ten built-in sharing rules —
on the app's own security page, where the table is the admin's roster of what
is widened out of the box.

The row that was missing is the app's only grant over records with **no owner
at all**: every holder of the `service_agent` position gets **edit** on open,
unowned cases, which is what makes the pinned *Unassigned — triage* tab
workable. A Chinese-reading admin auditing who can reach unassigned case intake
was shown a complete-looking table that did not contain the answer.

Both new rows are taken from `src/sharing/case.sharing.ts` — object, access
level, position and the criteria that select the records — and follow each
page's existing translation conventions; the rule name stays English, as every
other row on those tables already does. No sharing rule changed: who can reach
an unowned case is exactly what it was before, and is now written down in all
three languages. Refs #1239, #1096.
