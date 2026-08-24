---
---

Test tooling only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label).

Both test harnesses stored a write verbatim, so a hook or action body could put
`false`, a number or an object into a lookup column and every test built on them
stayed green. That is the discount #714 shipped under: `quote_on_accepted` wrote
a boolean into `crm_contract.crm_contact` for a long time while its own test case
— the "quote with no contact" path — passed throughout, and the real refusal only
surfaced in a release-candidate acceptance run as a 400 that aborted the handler.
Both harness files already carried the rule in prose ("a fake replacement that
accepts inputs the real thing rejects cannot prove anything"); value shape was
the dimension neither of them enforced.

`makeHarness` and `makeSandboxEngine` now refuse a reference-column value the
engine would refuse, on every write path (`insert` / `update` / `upsert`). The
boundary is the engine's measured one, not a stricter ideal — `null`,
`undefined` and `''` are accepted, a `multiple: true` lookup takes an array whose
elements are not checked, and `system` / `readonly` columns are not validated at
all (which on this app means every `owner_id`). The field set is derived from the
app's own `src/objects` metadata via the platform's `REFERENCE_VALUE_TYPES`, so a
new lookup column is covered the day it lands with no list to update.

`test/harness-lookup-shape.test.ts` pins each verdict against a real `ObjectQL`,
field definition by field definition, so the harness cannot drift from the engine
without going red. No `src/` metadata changed; the app bundle is byte-identical.
