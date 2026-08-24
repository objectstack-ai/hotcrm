---
---

Repo tooling only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Same route as the two previous changes in this
neighbourhood, `.changeset/script-entry-point-guard.md` and
`.changeset/scan-fields-sites-rejects-unknown-names.md`.

`test/script-main-guard.test.ts` spawns every guarded script through a symlink
and asserts it speaks, with a green leg and a red leg each. `scan-field-consumers.ts`
was the one entry with `red: null`, because its only non-zero exit at the time —
`✗ no field reference resolved anywhere` — fires only when the registered stack
resolves nothing, and staging that means standing up a broken copy of
`objectstack.config`: a fixture about the stack, not about the entry-point guard
this file holds. The `--sites` refusal added for #1255 is a second non-zero exit
that needs no fixture at all, so the leg is now real: `--sites` with an
unresolvable name, exit 1, on the symlinked path.

The rationale comment was replaced rather than trimmed — it asserted "its only
non-zero exit is …", which names one of two.

The leg is asserted to go red for the right REASON, not merely to exit non-zero:
the refusal lives inside `main()`, so with the entry-point guard neutered the
spawn prints zero bytes and exits 0, and both assertions fail. Verified by
neutering rather than assumed, in both directions the guard can break — the
helper answering `false`, and the pre-#1252 hand-rolled comparison the symlink
defeats.

The spawn budget in this file is now stated (`SPAWN_TIMEOUT_MS`) rather than
left at vitest's 5000ms default, matching `test/field-consumer-scan.test.ts`.
Each case still makes exactly one spawn; the `.ts` entry measures 1281–1379ms
locally and CI runs the same import work ~1.7x slower.

No `src/` metadata changed; the app bundle is byte-identical.
