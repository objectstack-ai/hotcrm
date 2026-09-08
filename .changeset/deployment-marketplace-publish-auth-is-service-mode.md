---
---

`docs/DEPLOYMENT.md` only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).
It is a maintainer-facing deployment note, no `src/` metadata changed, and the root package
is `private: true`.

§Marketplace Deployment told a maintainer to run `objectstack cloud login`, then `pnpm build`,
then `pnpm publish:marketplace` — the same defect `docs/RELEASE_STRATEGY.md` §Marketplace
Publish carried until it was corrected, in a file that points at the same script. Step 1
writes nothing step 3 reads. Re-measured on `scripts/publish-marketplace.mjs` at this commit:
`readFileSync` 0, `homedir` 0, `cloud login` 0, `cloud.json` 0, `OS_TOKEN` 0, against a
control of `process.env` 5 — it opens no credential file of any kind, so no login step could
supply what it wants. The section now names `OS_CLOUD_URL` and `OS_CLOUD_API_KEY` in the same
fenced block as the publish command, marks the dry-run as the credential-free one, and links
`RELEASE_STRATEGY.md` as the single source of truth rather than restating it.

The `cloud login` line is kept only as a ⛔ note. It is deliberately not deleted: the command
is real, and it is the correct first step for the *other* publish path. Measured on this
repo's pinned `@objectstack/cli@17.3.0`: `dist/commands/package/publish.js` imports
`tryReadCloudConfig` from `utils/cloud-config.js`, which resolves
`join(homedir(), '.objectstack', 'cloud.json')` — so `objectstack package publish` really
does consume what `objectstack cloud login` writes. Naming which path each belongs to is the
inoculation; deleting the string would have traded a stale instruction for a differently
wrong one.

This was the one wrong site out of an eleven-occurrence audit. The other ten — `README.md`
and the six `content/docs/marketplace/**` pages across three locales — were each followed to
the command they lead to, all of which is `objectstack package publish`, and were left
untouched. No guard was added, and the publish script was not touched: it is the page that
was wrong.
