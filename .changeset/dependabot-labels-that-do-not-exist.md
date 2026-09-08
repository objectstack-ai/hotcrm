---
---

CI configuration only — this PR ships nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, or hook handler logic.

`.github/dependabot.yml` asked for two labels this repository does not have.
The npm block requested `automated` and the GitHub-Actions block requested
`github-actions`; neither is declared in `.github/labels.yml` — "the single
source of truth for this repository's labels" — and neither exists in the repo.
Dependabot cannot create labels, so it failed the whole labelling step and said
so in its first comment on every PR it opened, from #1058 (2026-08-10) onward.

The reason this survived a month is that the failure was **unfalsifiable from
Dependabot's own error message**: the bot reports that *a* label could not be
applied, never *which* one. Deleting `automated` alone — the single name the
filed issue named — would have left the notice repeating with nothing new to
read, and no way to tell whether the fix had worked. Establishing that
`github-actions` was also missing required checking each referenced name against
the repository's actual label set, not reading the notice more carefully.

Both names are dropped rather than created. `dependencies` already marks these
PRs and is enough to filter them, and `.github/labels.yml` governs the taxonomy
by design ("no ad-hoc labels"), so the config is brought to the manifest rather
than the manifest widened to the config. Both blocks now request only
`dependencies` and `skip-changeset`, which do exist, so Dependabot's labelling
step succeeds and its PRs become filterable.
