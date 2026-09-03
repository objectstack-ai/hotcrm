---
'hotcrm': patch
---

Stop `docs/ARCHITECTURE.md` printing machine facts it cannot keep true, and point
each one at the source that already owns it.

Two of the file's hand-copied figures had gone false. The Stack Manifest table
stated `engines.protocol` as `^17.0.0-rc.1` while `objectstack.config.ts`,
`objectstack.manifest.json` and the installed `@objectstack/spec` all declared
`^17.2.0` — a release candidate of the previous minor, on the row a reader
consults to answer which runtime this app loads on. The Security section stated
`9 sharing rules` against the ten the stack registers.

Neither is corrected by writing a fresher number, because the number is the
defect: the protocol row went stale across two platform bumps and the rule count
goes stale on the next sharing rule. So the protocol row is gone and the section
now names where the fact is declared — `objectstack.config.ts`, restated by the
template manifest and the spec dependency range, with all three already pinned to
each other by `test/docs-declared-versions.test.ts`. A fourth copy in prose was
the only copy nothing compared.

The Security section's three counts are likewise gone, replaced by where each
kind of metadata lives and what registers it. That also settles the one figure
that was ambiguous rather than wrong: `6 permission profiles in src/profiles/`
counted registered profiles, which is 6 under both compositions, while pointing
at a directory that holds seven `*.profile.ts` files. The extra file is
`tenant-admin.profile.ts`, registered only under `HOTCRM_COMPOSITION=saas` and in
place of `system_admin`, so no build ever registers seven. The section now states
that composition rule instead of a number that was right for a reason a reader
could not see. `12 positions` was re-measured and was true; it lost its number
only because the list stopped printing counts.
