---
---

Repo tooling only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Same route as the previous `scripts/`-only change to
this file, `.changeset/script-entry-point-guard.md`.

`pnpm scan:fields --sites <object>.<field>` answered a name that does not exist
with `(none — this field is inert)` and exit 0 — the same sentence and the same
exit code it gives a field nothing reads. `--sites` is the only path that takes
a field name from argv; `--json` and the default ledger both enumerate the
declared set, so neither can name a field that does not exist. The lookup now
refuses an unknown object, an undeclared field, and a malformed target, on
stderr and with a non-zero exit, and names the objects that really do declare
the field when any do (a lookup in the map the ledger is already built from, not
fuzzy matching).

That sentence is the one quoted into an enforce-or-remove decision, so a typo
producing it verbatim with a green exit was silent and self-confirming: the same
misspelled command re-derived the same confident answer every time. A declared
field keeps its old output and its exit 0 whatever its verdict — the refusal
keys on the name not existing, never on the verdict.

No `src/` metadata changed; the app bundle is byte-identical.
