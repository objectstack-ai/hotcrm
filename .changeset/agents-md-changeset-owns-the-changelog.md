---
'hotcrm': patch
---

`AGENTS.md` §⬆️ Platform Upgrades step 4 stops telling an upgrader to hand-write
`CHANGELOG.md`, and the stranded `[Unreleased]` block is relabelled as the closed
history it is.

Step 4 was written when `CHANGELOG.md` was hand-maintained. The 3.0.0 release
consumed the pending changesets into a generated section that is now the top of
the file, so the step pointed an upgrader at a file the release process owns —
and it does not fail loudly. The last upgrade to follow it (the 17.1.0 bump,
`9e832d2d`, 2026-08-20) appended six lines under `## [Unreleased]`; three days
later `162ad562` cut 3.0.0 and buried them. Step 4 now says what the repo
already practises everywhere else: the upgrade's release-notes entry **is** the
PR's changeset, carrying the same content the step always asked for (what
changed on the platform, what metadata was migrated and why), and `CHANGELOG.md`
is not hand-edited.

The `[Unreleased]` heading is renamed to `Pre-3.0.0 hand-written history (closed
— not a live section)` and its one-line body, which claimed the entries under it
were "Not yet versioned or published", now says they shipped in 3.0.0. Measured,
not assumed: the block sits at `CHANGELOG.md:9009`, directly **above**
`## [2.2.2] — 2026-07-21` and directly below the file's own Keep a Changelog
preamble — precisely where a *live* Unreleased section belongs — so an upgrader
who scrolled past the generated section found it in the position that says
"write here". Relabelling is safe because `changeset version` never reads the
block: `@changesets/apply-release-plan` splices each release in after the first
line of the file and re-emits everything below it unchanged. A real
`changeset version` run on this tree moved the block from `:9009` to `:11800`
and left it byte-identical.

No `src/` metadata changed: no object, field, view, label, flow or hook. The
frontmatter is a `patch` rather than the sanctioned empty "releases nothing"
declaration because `CHANGELOG.md` is itself the published release-notes
artifact, and this PR edits a heading in it that a reader of that file sees.
