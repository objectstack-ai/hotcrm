---
---

Authoring-surface hygiene only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents in its own
comment, on par with the `skip-changeset` label; #1778 used exactly this form).
Nothing a user sees moves, and that is measured rather than asserted.

Every `fieldGroups` collapse hint in `src/objects/*.object.ts` now writes the
canonical ADR-0085 key `collapse: 'collapsed'` instead of the deprecated
`defaultExpanded: false` alias — 25 sites across 13 objects, which was every
occurrence of the alias in the repo. No group was added, removed, reordered or
re-labelled, and no group changed whether it starts open or closed.

### Why the rendered output cannot have moved

`deriveFieldGroupLayout` (ADR-0085 §5) is the single place a group's collapse
behaviour is resolved for the form and synthesized-detail renderers, and its
`readGroup` reads the canonical `collapse` first, falling back to
`collapsible`/`collapsed` and then to `defaultExpanded`. `ObjectSchema.parse`
normalizes the same way ahead of the base parse, short-circuiting on
`grp.collapse != null`. So `collapse: 'collapsed'` lands on exactly the value
`defaultExpanded: false` was being folded into.

Measured on the pinned `@objectstack/spec@17.4.0`, two ways:

- the **derived layout** for all 18 objects that declare `fieldGroups` — 83
  sections (81 declared groups plus the two synthesized ungrouped sections on
  `crm_case` and `crm_task`), 25 `collapsed` and 58 `none` — serializes to the
  same SHA-256 before and after;
- the **built metadata artifact** `dist/objectstack.json` differs in exactly 25
  lines, all of them the removal of a now-redundant `"defaultExpanded": false`.
  Every `"collapse"` value is identical on both sides: 25 `collapsed`, 56
  `none`, 0 `expanded`. Nothing else in the 2MB artifact moved.

### Why the key is rewritten and never deleted

`collapse` defaults to `'none'`, not `'expanded'`. A group that declares no
collapse key is always open with no toggle, which is not what `defaultExpanded:
false` means. Dropping the key as a "simplification" would therefore be a real
UX change; every site is rewritten instead.

The alias cannot express `'none'` at all — it is a boolean over a three-value
enum — and the platform describes the aliases as a compatibility path for
metadata that never went through an authoring surface. Hand-authored
`.object.ts` files are the opposite of that case, and under ADR-0049
enforce-or-remove this repo now has zero sites to migrate when the aliases are
retired upstream instead of 25.
