---
---

No user-visible change: this adds a measurement, not behaviour.

`test/parent-derived-reach.test.ts` boots the shipped enforcement stack (ObjectQL
+ `plugin-security` + `plugin-sharing`, over this app's own metadata) and records
what a `controlled_by_parent` child is actually reachable by — the question
[#549](https://github.com/objectstack-ai/hotcrm/issues/549)'s Option 2 turns on.
Measured: a parent-derived child is NOT filtered to parents the caller can read,
so converting `crm_quote` / `crm_contract` to `controlled_by_parent` would widen
them to every holder of object-level read rather than to the account's territory
or team. The OWDs are therefore unchanged and the decision goes back to the
maintainer; the shipped over-reach is filed separately as
[#694](https://github.com/objectstack-ai/hotcrm/issues/694).
