---
---

Repo tooling only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No metadata changes: `crm_product.tax_rate` and every
other field are untouched here.

The field-consumer scanner is retired outright — `scripts/scan-field-consumers.ts`,
`test/field-consumer-scan.test.ts` and the `pnpm scan:fields` script. "Does a
declared field have any consumer" is a property of every metadata app, not a
HotCRM business fact, and `AGENTS.md` § "Scope — a pure metadata application"
rule 3 puts lint, validation, gates and diagnostics on the platform: *"A
drift-class or validation-class gap you find is a platform problem and goes
upstream … ⛔ Do not grow a gate farm."* The scanner (2026-08-17) predates that
2026-08-31 ruling and was never reconciled with it. Maintainer ruling of
2026-09-05 on #1543, option F. The detection moves upstream as objectstack#15922.

Two rosters name the deleted files and are reconciled with them:
`test/script-main-guard.test.ts` drops its `scan-field-consumers.ts` entry (its
coverage assertion compares `GUARDED` against the guarded scripts found on disk,
so the entry cannot outlive the file), and `test/verify-log-decoy-pin.test.ts`
drops `test/field-consumer-scan.test.ts` from `KNOWN_SPAWNING_FILES`. Both
measured: with the files deleted and the rosters untouched the two suites go red
in four places, which is what makes this an edit and not a formality. The dated
`✗`-line table in the decoy pin keeps its measured figures — it records a run on
`ec4c5ac6` and its total still reconciles — and gains a tombstone instead.
