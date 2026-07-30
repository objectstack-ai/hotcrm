---
'hotcrm': patch
---

Docs/metadata drift fixes (#496, tiers 1–2): rewrite the stale `[Unreleased]`
CHANGELOG section to reflect what actually shipped after 2.2.2, correct
STATUS/README/CONTRIBUTING claims and tutorial references, align the changeset
config note with the marketplace-only distribution model, fix comments that
contradicted the code they sat on, and remove dead module-level hook code that
was never registered.
