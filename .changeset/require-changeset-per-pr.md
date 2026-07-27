---
'hotcrm': patch
---

Require a changeset on every PR, and make `pnpm changeset` actually runnable.

`CONTRIBUTING.md` has always asked for changesets, but nothing enforced it and
nothing installed the tool: `@changesets/cli` was absent from `devDependencies`,
so `pnpm changeset` failed outright, and `.changeset/config.json` still carried
`ignore` and `linked` entries for `@hotcrm/core` / `@hotcrm/server` / `@hotcrm/*`
— none of which resolve now that #502 made this a single-package repo. Changesets
treats an unresolvable entry as a hard validation error, so `changeset status`
could not run at all.

Now: the CLI is installed with `changeset` / `changeset:version` /
`changeset:status` scripts, the stale config entries are gone, and a
`Changeset Check` workflow fails any PR that adds no `.changeset/*.md` file
(diffed against the PR base, so entries already awaiting release can't mask a
missing one). PRs that genuinely ship nothing carry the `skip-changeset` label;
Dependabot applies it automatically.
