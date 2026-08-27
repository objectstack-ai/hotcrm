---
---

Test-only — this PR ships nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents). The diff touches
`test/flow-scheduled-org-partition.test.ts` and this file, and no metadata
under `src/`.

Extend the scheduled-sweep organization guard from `create_record` to
`update_record`. The existing half asks whether the owning organization is
declared on a created row; it never looked at an updated one, and for an update
that is not the question anyway — an `update_record` targets a row that already
has an organization. The question is where the WRITTEN VALUE came from.

Every scheduled sweep runs `runAs: 'system'`, and a system execution context is
the one context the driver's organization predicate does not constrain (the
platform's design, ADR-0049 — unchanged here). So a sweep's reads span every
organization and its writes are accepted against any of them, and an
`update_record` can stamp one tenant's value into another tenant's row: no NULL
partition, no index violation, nothing to notice but a reviewer's eye.

The new half resolves each interpolation token in an `update_record`'s
`config.fields` back to its source, transitively through `assignment`, `loop`
and `get_record` bindings, and requires it to be organization-neutral: a
literal, a template function such as `{NOW()}`, a value taken off the swept row
the node's own `filter.id` names, or a fetch whose filter pins
`organization_id` to an already-proven source — the `{ownerAnyDeal.organization_id}`
precedent inverted, and the only proof mechanism, deliberately not a second one.

Anything else must be argued in a written exemption register that is held from
both sides: an unexplained write fails, and so does an exemption that has
stopped matching anything. `demo_bootstrap`'s exemption is machine-checked
against its absence from the multi-organization composition, so re-registering
that flow revokes the exemption automatically.
