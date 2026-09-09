---
---

Agent-facing governance doc only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing" declaration
that `.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset`
label). No object, dataset, widget, layout, filter, translation or exported symbol
changed: the whole diff is `AGENTS.md` prose.

`AGENTS.md` §How a green PR lands told every seat that a green, non-governed PR lands by
arming auto-merge, and deliberately never named a merge queue — PR #1798's body records
that omission as intentional, on the premise that this repo has no queue. The premise is
false. The section now names the queue as the mechanism arming hands off to.

Re-measured on this branch before the prose was written, on both channels:

- **Configuration.** `GET /repos/objectstack-ai/hotcrm/rulesets` returns one ruleset,
  `main` (id 12187346), `enforcement: active`, whose rules are `deletion`,
  `non_fast_forward`, **`merge_queue`** and `pull_request`.
- **Behaviour.** `added_to_merge_queue` / `removed_from_merge_queue` by
  `github-merge-queue[bot]` on every recently merged PR — #1810, #1811, #1813, #1816.

The gesture a seat performs is unchanged and nothing is rolled back: arming auto-merge
**enqueues**, and every PR that landed this round landed correctly. This is a description
defect, not a broken procedure.

The section deliberately does **not** record `min_entries_to_merge_wait_minutes: 5` as a
wait a seat should expect, because measurement says it is not one. Nine merged PRs
(#1795, #1798, #1799, #1801, #1809, #1810, #1811, #1813, #1816) each took **17–20 seconds**
from `added_to_merge_queue` to `merged`. That parameter caps how long the queue *gathers*
a group before merging a smaller one, and never engages while `min_entries_to_merge` is
`1`. PR #1795's much-cited "5m40s from creation to merge" decomposes as **5m18s sitting
as a draft** while its checks ran, 5s from ready to enqueue, and **17s in the queue** —
so it is not evidence of the queue's wait either. The section warns against re-deriving
the five-minute figure instead of repeating it.
