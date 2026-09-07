---
---

`docs/MAINTENANCE.md` and `docs/RELEASE_STRATEGY.md` only — this PR releases nothing to
HotCRM users, so the frontmatter above is deliberately empty (the sanctioned "releases
nothing" declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). Both files are internal maintainer docs — `docs/RELEASE_STRATEGY.md`
calls them that itself — and no `src/` metadata changed: no object, field, view, label,
flow or hook.

Two instruction sites still told a maintainer to hand-write `CHANGELOG.md`, a file
`changeset version` owns. `AGENTS.md` §⬆️ Platform Upgrades step 4 was corrected for this,
but the correction stopped at that file, so the two docs below went on giving the opposite
instruction — and neither fails loudly. The symptom is an appended `CHANGELOG.md` block
that the next release buries unread.

`docs/MAINTENANCE.md` §3 is the platform-upgrade checklist that `CHANGELOG.md`'s own
17.0.0-rc.1 entry names by that title. Its step 7 said `Note the new platform version in
CHANGELOG.md.` It now carries the wording `AGENTS.md` step 4 landed: the upgrade is
recorded in the PR's changeset, which *is* the upgrade's release-notes entry, and it is the
same entry §2 step 4 already requires of every PR. Kept as step 7 rather than folded away,
so §3.2's "Steps 1-7 cover the app's own metadata" stays true.

`docs/RELEASE_STRATEGY.md` §Release Checklist had six steps for cutting a release and named
none of the command that performs two of them, while naming `pnpm verify` and `pnpm build`
by hand two steps away. Steps 3 (`Update CHANGELOG.md.`) and 4 (version alignment) are now
one step that runs `pnpm changeset:version`; the checklist is five steps. §Version Sources
above it listed the same files as four things to "keep aligned" by hand and now says which
tool writes which.

Measured rather than assumed, and it narrows the correction: `changeset version` writes
**two** of those files, not all three. `@changesets/apply-release-plan` writes exactly
`package.json` and `CHANGELOG.md` (plus `.changeset/pre.json` in pre-release mode) and
contains no reference to `objectstack.config.ts`, whose manifest `version` is a hardcoded
literal at `objectstack.config.ts:94`. So both new sites say the config manifest is matched
by hand and that `pnpm verify` is what catches the drift — `test/docs-declared-versions.test.ts`
asserts `package.json` agrees with the manifest, which is the loud failure the
`CHANGELOG.md` instruction never had. Writing "one tool writes all three" would have put a
fresh confidently-wrong instruction into the same two files this change exists to correct.

No new gate, guard or test: both sites point at enforcement that already exists.
