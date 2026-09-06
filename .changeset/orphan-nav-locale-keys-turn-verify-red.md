---
---

Make a single orphaned `apps.*.navigation` locale key turn `pnpm verify` red.
Test-only — this PR releases nothing to HotCRM users, so the frontmatter above
is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed and no gate script is
touched; `test/i18n-references.test.ts` gains one guard and its anti-vacuity
half.

The near miss: #1259 cut four navigation entries, and PR #1261 removed their
`nav_pipeline` / `nav_all_tasks` / `nav_event_calendar` / `nav_event_history`
keys — plus `group_approvals` — from `zh-CN`, `es-ES` and `ja-JP` by hand. Had
that author not remembered, `pnpm verify` would have stayed fully green
carrying 15 dead keys. An orphan is worse than a missing translation: grepping
`nav_pipeline` afterwards returns three confident-looking hits in three
locales, which reads as "this entry exists and is translated".

**The card's premise was measured and is half wrong, which is why this is a
test and not a new checker.** Orphans are not invisible. Planting a
`nav_ablation_orphan` key in all four bundles and running the real
`objectstack lint --json` on this tree reports the platform rule
`translation-target-unknown` once per locale, naming the id and printing the
remedy — for the `apps.*.navigation` keyspace this card is about, not only for
the `objects.*` keyspace where it was first seen. What is true is that nothing
fails on it: the finding is a `warning`, `objectstack lint` exits 0 on
warnings, and `scripts/check-lint-i18n-gate.mjs` gates the `i18n/missing-*`
family, which is the forward direction. Measured on the branch with one orphan
planted, that gate printed `0 i18n/missing-* issues (14 total lint issue(s)
reported, unaffected by this gate)` and stayed green while the new assertion
was the only thing red.

Gating the platform rule instead was considered and rejected on measurement,
not on preference. Its rule id carries no `i18n/` namespace at all, so it is
outside the gate's world rather than merely unlisted in it, and a prefix gate
cannot express it without becoming an exact-id allowlist for a family that
spans every keyspace at once — objects, fields, views, sections, tabs,
validations, actions, dashboards and flows — which is a far wider decision than
this card. It also runs against this repo's standing direction, recorded when
eleven local assertions were retired because `objectstack lint` already exits 1
on their defects: the test is retired when the platform **errors**, and kept
when it does not. This rule does not.

Scope stops at `apps.*.navigation`: the keyspace is flat and the nav tree is
beside it. `objects.*`, `actions.*` and the rest generalise from this shape once
it is agreed. The forward direction for navigation already gates as
`i18n/missing-navigation` and is deliberately not restated.
