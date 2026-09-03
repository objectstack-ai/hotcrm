---
'hotcrm': patch
---

Stop `docs/ARCHITECTURE.md` presenting two incomplete enumerations as complete, and
give the one that must stay complete a rule a reader can check it against.

The `requires` sentence named seven capabilities and closed with "and"; the stack
declares eight. The member it dropped was `hierarchy-security` — the one
enterprise-edition capability this app declares, and a hard prerequisite for
`sales_manager`'s `own_and_reports` write scope on `crm_contract`, which `defineStack`
refuses to accept without it. That made the paragraph underneath read wrong as well:
it explained why `ai` is deliberately *absent* while the config's own comment draws
that as one half of a contrast with `hierarchy-security`, which is deliberately
*present* and, unlike `ai`, safe on an open-edition boot. The page shipped half a
contrast. The roster is now pointed at where it is declared, and the section states
the two deliberate decisions instead — the part of the section a roster could never
carry.

The Metadata Areas table omitted `mappings`, a real registration key backed by
`src/mappings/` and referenced by name from the import endpoint. That table is a
directory-to-key map whose whole value is completeness, so a pointer would lose the
point and appending the row alone would leave the next registration key to go missing
the same way. It gets the row *and* the rule that makes the row's absence detectable:
every directory under `src/` is either a row or one of the two named beneath the
table, with `src/docs/` and `src/interfaces/` named there and why. The Overview
diagram, which omits three registered areas, stops implying it is a roster and points
at the table.

No new gate — per the 2026-08-31 scope ruling, drift mechanisms belong on the
platform. Naming every `src/` directory on the page instead widens the existing
`test/docs-src-tree-paths.test.ts` grip on this file from 15 directories to all 18,
so its "named implies exists" check now covers the whole tree.
