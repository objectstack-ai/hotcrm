---
---

`CONTRIBUTING.md` only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents at lines 33-34 and 66-67, on par with
the `skip-changeset` label). It is a contributor-facing document, no `src/` metadata
changed, and the root package ships no `files` list that could carry it.

§Getting Merged listed "At least one approval required" as the first of four merge
conditions. It described nothing in force. Measured two ways: behaviourally, PR #1795
merged with `get_reviews` returning `[]` — zero reviews of any kind — 5m40s after
creation; and, now readable, by configuration — the active `main` ruleset (id 12187346)
carries a `pull_request` rule whose `required_approving_review_count` is **0**. So the
line was not merely stale relative to practice, it contradicted the repo's own settings.

It is replaced by a pointer to `AGENTS.md` §How a green PR lands, which #1798 landed as
the single place that answers who may land a PR and when. One question, one answer, one
place — the same shape §Publishing already uses for `docs/RELEASE_STRATEGY.md`, and the
reason this bullet links rather than restates: `AGENTS.md` is a governed file, so a copy
of its rule here would drift the moment the original was amended. The CI, no-conflict and
squash bullets are unchanged; all three are still true.

The pointer follows the wording that actually landed in `AGENTS.md` rather than the
paraphrase the ruling wrote before that section existed: "a PR whose checks have all
finished with none failed" rather than "green", because that section is explicit that a
`skipped` check (`Check Changeset` under `skip-changeset`) and a check that never ran
(`link-check` on a diff carrying no Markdown) are not failures.

⛔ No branch-protection change, and none is implied: the ruling refused that option
rather than deferring it. This edit makes the document agree with the settings; it does
not touch them.
