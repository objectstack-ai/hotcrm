---
---

Test-only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No object, profile, permission set, view, dataset,
dashboard, translation or exported symbol changed: the diff is one new file
under `test/` and this note. The app the build produces is byte-identical.

`test/hierarchy-read-depth.test.ts` adds the READ half of the hierarchy-scope
edition boundary — the counterpart of `test/contract-write-depth.test.ts`, which
has pinned the WRITE half since #880.

What it states, measured rather than asserted: on the community edition a
hierarchy-valued `readScope` resolves **owner-only**. The depth is computed
exactly as declared (`getEffectiveScope` returns `own_and_reports`), and then
`SharingService.resolveOwnerScopeIds` fails CLOSED to the caller alone, because
the `hierarchy-scope-resolver` service ships only in
`@objectstack/security-enterprise` and this repo does not depend on it. A
manager whose report's `sys_user.manager_id` really points at them still reads
only their own record.

⛔ No profile gains a `readScope`, and nothing is removed from `requires[]`.
Both are ruled (#1378, 2026-09-08) and both are now asserted by the file: a
hierarchy `readScope` written beside `viewAllRecords: true` — the shape an
earlier ruling named — is short-circuited to `org` one line before the platform
ever reads it, so it would be stored, counted by a capability census as
coverage, and never once consulted. The platform accepting that key with no
diagnostic is filed upstream as objectstack-ai/objectstack#16870 and is not
compensated for here.

The pin is built to be falsifiable, not to restate itself: the grants it reads
through are throwaway permission sets created inside the test, one bit apart
from each other, and an org-wide arm reading every seeded row is the control
that shows narrowing is detectable by the harness. Install
`@objectstack/security-enterprise` and three of its cases go red together —
that reversal was executed against this file, not predicted. The file's own
header says what would make it wrong.
