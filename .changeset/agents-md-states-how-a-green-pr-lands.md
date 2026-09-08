---
---

`AGENTS.md` only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents at lines 33-34 and 66-67, on par with
the `skip-changeset` label). No `src/` metadata changed: no object, field, view, label,
flow or hook.

§✅ Verifying changes gains **How a green PR lands**, the posture this repo practised but
never wrote down: a seat may take a PR out of draft and arm auto-merge once every check
has finished with none failed, unless the diff touches a governed path (`AGENTS.md`,
`CLAUDE.md`, `.claude/**`, `.github/instructions/**`), in which case the PR stays a draft
and the maintainer merges it. Maintainer ruling on #1742, decision batch #81, chosen over
"every PR waits for the maintainer".

Measured before writing, because the card turns on a zero: the filer's six terms
(`auto-merge`, `automerge`, `merge queue`, `merge-queue`, `squash`, `ready-for-review`)
across `AGENTS.md`, `CONTRIBUTING.md`, `docs/**` and `.github/**` return one hit, not
zero — `CONTRIBUTING.md:210` "Branch will be squash-merged", under §Getting Merged, which
states merge *mechanics* for a human contributor and never says who may perform the
merge. So the authorisation gap the card describes is real; the "zero hits" figure it
cites is off by one on a line that does not close it.

"Every check green" is stated as *finished and none failed* rather than literally green,
because two checks in this repo are routinely neither green nor red: `Check Changeset`
concludes `skipped` under the `skip-changeset` label
(`.github/workflows/changeset-check.yml:14`), and `link-check` never runs at all on a
diff carrying no `.md` (`link-check.yml` `pull_request.paths`). Both were read off real
PRs — #1058 shows the skip and the absence, #1795 shows `link-check` present when the
diff does carry Markdown. No required-checks list is invented, because none was ruled.
