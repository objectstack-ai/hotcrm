---
'hotcrm': patch
---

Derive the `PLATFORM_OBJECTS` allowlist from the installed packages' own
rosters instead of hand-listing it, and drop the one name nothing registers.

`test/helpers/metadata-fixtures.ts` exported sixteen platform object names
typed out by hand, under the citation "verified against the 16.1.0 bundles in
node_modules" — against a 17.2.0 pin. Both dangling-reference guards
(`test/action-references.test.ts`, `test/metadata-references.test.ts`) spell a
resolvable object as `objectNames.has(n) || PLATFORM_OBJECTS.has(n)`, so a
machine roster kept by hand fails them in both directions once it drifts, and
it had drifted: a registered object missing from the set makes a valid
reference look dangling, and a listed name that nothing registers lets a
genuinely dangling reference pass — a false green in the guard whose whole job
is to catch that.

It had already happened. **Nothing registers `sys_approval`.**
`@objectstack/plugin-approvals` 17.2.0 exports `SysApprovalRequest`,
`SysApprovalAction`, `SysApprovalApprover` and `SysApprovalDelegation`, and no
`SysApproval`; the only occurrence of the bare token in any installed bundle is
a `startsWith('sys_approval')` prefix guard. The allowlist admitted a name
matching nothing at runtime — precisely the class it exists to reject.
`src/apps/crm.app.ts` carried the same stale claim in a comment and now names
the four objects that exist.

The set is now read from six packages, each loaded by something this stack
declares, filtered to values carrying both a `name` and a `fields` map — the
shape of an `ObjectSchema.create(...)` descriptor. The near miss is the
control: seven exported values carry a `name` but no `fields`, and they are
exactly the non-objects (the `account` / `setup` / `studio` apps, three
`sys_*_detail` pages, and the `system_overview` dashboard), all correctly
excluded. The version citation goes away with the copy.

**This widens the set, deliberately: 16 names become 65 — 50 enter and exactly
one leaves.** The old docblock called the set a deliberate subset, but its
stated contract is "a reference to a `sys_*` name outside this set matches
nothing at runtime", and a name the platform really registers *does* resolve —
so withholding it makes the guard wrong in the false-red direction, which is
the more expensive failure. Every arrival is backed by a roster entry read from
an installed package, and no `sys_*` reference in today's app metadata changes
verdict: both guards were green before and after, 46 tests either way.

`sys_audit_log`, `sys_activity` and `sys_comment` stay hand-listed, with the
reason beside them. `@objectstack/plugin-audit` provisions all three from
`provisionSystemTables()` at plugin init and exports no descriptor for any of
them, so they are not derivable from any public surface. That residue is the
small remainder rather than the whole set, and `sys_activity` is live app
metadata, so dropping it would have been a false red rather than a tidy-up.

No new gate: this derives an existing list, and a check that the list matches
the registry belongs to the platform, not here.
