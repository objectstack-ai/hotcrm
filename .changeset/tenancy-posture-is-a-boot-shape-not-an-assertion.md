---
---

Tests only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset`
label). No `src/` metadata changed: no object, field, view, label, flow or hook.

Make a suite's tenancy posture part of how it BOOTS rather than a property of
what it happens to assert. From 17.2.0 `SharingServicePlugin` seeds declared
sharing rules per organization once the posture encloses a wall, and an
unresolvable posture reports `isolated` under the ADR-0105 fail-closed rule —
so a reduced harness that never mounts `plugin-auth` seeds zero rules where the
shipped app seeds ten. Re-measured on the 17.2.0 pin: absent posture 0 rows,
`single` 10 rows with `organization_id: null`, `isolated` 0 rows.

Three suites — `contract-write-depth`, `guest-submission-sanitisation` and
`case-guest-branch-leftovers` — mounted the plugin and stated no posture. They
were green because none of them reads a rule the seeder was supposed to create,
which is exactly the trap: the first assertion someone adds about reach through
a sharing rule gets an empty catalogue and a failure that points at the rule.
They now mount `tenancyProbe('single')` ahead of the plugin, and no assertion in
any of them changed outcome.

`test/sharing-posture-declaration.test.ts` is the part that also covers the
suite nobody has written yet: every test file that mounts `SharingServicePlugin`
must declare a posture *before* mounting it, since the posture is read during
that plugin's own boot. The predicate reads import and mount statements rather
than grepping the identifier — `test/sharing-seeding.test.ts` names the plugin
in a quoted boot log, boots it nowhere, and is correctly out of scope without
needing an exemption.
