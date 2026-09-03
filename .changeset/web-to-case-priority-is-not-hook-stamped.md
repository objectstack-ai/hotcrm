---
---

Prose only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, page or hook — the one `src/` edit is a comment.

`src/views/case.view.ts`'s `web_to_case` doc comment listed `priority defaults`
among the internal fields "stamped by `case.hook.ts` after a guest submission".
That clause was false, and was false before any recent change removed anything:
the hook has never written `priority`. The `if (!input.priority) input.priority =
'medium'` line it referred to could not execute — `crm_case.priority` declares
its `low` option `default: true`, and on the engine's insert path
`applyFieldDefaults` produces the row that becomes the `beforeInsert` hook's
`input.data`, so the slot is already full every time the guest branch runs. The
line was deleted as dead code; `case.hook.ts` now keeps only a comment recording
why it could never fire.

The clause is **replaced rather than deleted**. `priority` really is defaulted,
just not where the comment said, and `web_to_case` puts `priority` on the form
in front of the guest — a reader who found the false clause and then found the
field would be left with no account of where the value comes from. The comment
now states the mechanism: the guest picks it on this form, an unset one takes
the `low` option declared on `crm_case.priority`, field defaults are applied
before `beforeInsert`, and the hook only ever *reads* `priority` (to derive
`priority_rank`).

The `low`/`medium` disagreement is resolved in favour of **`low`** by
measurement, not by paraphrase: `applyFieldDefaults` skips a slot that is
already non-null (so a guest's own selection wins) and otherwise takes the
option marked `default: true`, which on `crm_case.priority` is `low`. `medium`
only ever existed in the dead hook line. The other four items in the list
(`status`, `origin`, `owner_id`, SLA) are genuinely hook-stamped and are
untouched, as is the rest of the paragraph.
