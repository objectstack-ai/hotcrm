---
---

Documentation and test-guard only — this PR releases no metadata or code to
HotCRM users, so the frontmatter above is deliberately empty (the sanctioned
"releases nothing" declaration that `.github/workflows/changeset-check.yml`
documents, on par with the `skip-changeset` label).

Adopts the platform's per-run flow summary (objectstack#4354, shipped in
`@objectstack/service-automation` 17.0.0 and already pinned here at 17.1.0)
rather than building an app-side detector, which stays permanently rejected.

`content/docs/administration/automation.mdx` and its two translations gain the
operator-facing half in the existing "Where to monitor automation" section:
the run's `Records Selected` / `Records Acted On` / `Gate Skips` /
`Uncountable Effects` counters, the alert predicate worth wiring, and the
qualifier that keeps it honest — this app's sweeps re-select the same records
daily and gate on whether each was already handled, so their healthy steady
state trips the run-level predicate exactly as a broken sweep does, and the
per-node fold is what separates them. Prose only: no anchors, no new headings
and no anchored links.

`test/flow-run-summary.test.ts` pins the adoption, because nothing in `src/`
consumes the summary and a platform bump that stopped populating it would
otherwise return this app to having no production signal, silently. No `src/`
metadata changed — no object, field, view, label, hook or flow.
