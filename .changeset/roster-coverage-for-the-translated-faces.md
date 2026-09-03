---
---

Test-guard only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Nothing under `content/docs/**` or `src/` is touched:
the only file that changes is `test/docs-view-rosters.test.ts`.

`test/docs-view-rosters.test.ts` runs two complementary directions on the
English face — **coverage** (every view the app ships is named in its page's
roster) and **name exactness** (the name column names only views the app
ships) — and the file's own header explains why neither subsumes the other.
#1551 gave the translated faces name exactness, plus a structural rule pinning
each face to the English page's roster row **count**. It did not give them
coverage, and those three rules leave one shape open: a `.zh-Hans.mdx` or
`.zh-Hant.mdx` roster that keeps the row count, names only lawful view names,
but names one view **twice** and omits another.

Measured on the tree #1556 landed, before writing anything: `revenue/
products.zh-Hans` with both rows renamed to **全部产品** — dropping
**产品目录**, two rows in and two rows out — ran **9 passed**. Green over the
defect, on the file whose whole purpose is that defect's class.

This adds the missing direction, one rule per translated face, each against the
source that face already has: the `zh-CN` pack for zh-Hans, the pinned
`ZH_HANT_VIEW_NAMES` table for zh-Hant.

**They read the name column, not the section body, and that is the whole
design.** Pointing the English coverage rule at the translated faces does not
work: it asks `body.includes(label)`, a pure existence question over prose as
well as table, so it is blind to multiplicity by construction and cannot see a
duplicate at all. It is also blind to the omission whenever the prose happens
to mention the dropped name — measured, **9 of the 55 names on each of the
three faces** are echoed in the section body outside their own row. On one of
those nine, `service/cases.zh-Hans` with its **已升级工单** row renamed to
**全部工单**, a body-shaped coverage rule stays **green**. So these rules reuse
the `nameColumns` parse the name rules use and read the first column.

**Coverage, deliberately, and not set equality.** Asserting the name column's
set equals the source set closes this in one line and was rejected: it implies
name exactness, which would make #1551's two rules dead weight, and this file
is deliberate that each rule earns its place. Each face now carries the same
complementary pair the English face has carried since #1326.

The row-count rule is not made redundant either, and the division is exact:
coverage and exactness together pin the **set** of names on a face and say
nothing about multiplicity, so a face growing a third row that repeats a lawful
name passes both and fails only the count rule. This card's shape is the other
way round — with the count pinned, a duplicate forces an omission, and the
omission is what coverage sees.

`revenue/approvals` stays outside these rules structurally, inherited rather
than restated: they read `nameColumns`, which walks `PAGE_OBJECT` and
`rosterOf`, and that page carries no roster heading on any of its three faces
(re-measured — `rosterOf` is null for all three). No exemption list grew and
**#1552** is left as open as it was.

**Nothing on the pages changes**, and nothing needed to: all 55 name cells on
each translated face are distinct and each face names exactly the 55 views its
objects ship. This is a hole in the guard, not a defect in the docs — the same
reason #1326 was worth landing while its pages were already correct.
