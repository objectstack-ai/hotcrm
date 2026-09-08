---
---

`docs/RELEASE_STRATEGY.md` only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing" declaration
that `.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). It is a maintainer-facing runbook, no `src/` metadata changed,
and the root package is `private: true` with no `files` list that could carry it. The
empty changeset is preferred over the label here because it is committed evidence that
travels with the PR, and it leaves both steps of the gate running instead of skipping
the job outright.

§Marketplace Publish told a releaser to `objectstack cloud login` and then
`pnpm publish:marketplace`. Step 1 writes nothing step 2 reads.
`scripts/publish-marketplace.mjs` authenticates in service mode: `OS_CLOUD_URL` and
`OS_CLOUD_API_KEY` come from the process environment and from nowhere else, and it
exits before doing any work if either is missing. Measured on the script: `readFileSync`
0, `homedir` 0, `cloud login` 0, against a control of `process.env` 5 — it opens no
credential file of any kind, so no login step could supply what it wants.

That made this the worse of the two failure shapes. `objectstack cloud login` is a real
command — it is in this repo's own pinned `@objectstack/cli`, and it succeeds — so the
releaser believes they are authenticated, and the publish then dies with
`OS_CLOUD_URL is required`, which reads as a broken script rather than as a step the
page never mentioned. The section now names the two variables, calls the key what the
script's docblock calls it (a per-env, org-level secret), and carries them in the same
fenced block as the publish command so the block is copy-paste complete. The
`cloud login` line is kept only as a ⛔ note, because the trap is worth inoculating
against by name.

§Release Checklist step 5 names the same two commands and needed the same decision, so
it is answered rather than left as the twin. Its note is deliberately *asymmetric*: the
dry-run really does run without credentials — `DRY_RUN` short-circuits the credential
check, so `pnpm publish:marketplace:dry-run` reaches the artifact step with no
environment set at all — and only the real publish needs them.

No guard was added, and the script was not touched: it is the page that was wrong.
