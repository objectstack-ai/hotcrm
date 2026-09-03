---
---

Internal design documentation only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).
No metadata under `src/` changes by one byte, no object is renamed, and the built artifact is
identical.

`docs/architecture/module-split-plan.md` records where HotCRM's module boundaries would fall
under ADR-0130 — one release artifact carrying several packages that share the `crm`
namespace, so the product can be split into modules with **zero object renames**. It proposes
one `type: 'app'` package holding the consumer surface and six `type: 'module'` packages
(core, sales, cpq, service, marketing, activity), and it judges every cross-module dependency
by one of the four cross-package rules the platform has actually measured on 17.2.0
(objectstack#14122 §4) rather than by a fifth one invented downstream.

The result is 73 cross-module edges: 54 allowed, 19 refused. The 17 refused ones are all the
same shape — an app may only navigate to objects its own package defines, so every
`type: 'object'` node in the app's navigation converts to a `navigationContributions` entry
declared by the module that owns the object, which is the rule the platform accepts. The other
2 are hooks in `campaign.hook.ts` attached to `crm_opportunity` and `crm_lead`; the split has
to follow hook ownership, and that one is written up as a choice for the maintainer because
it moves campaign-metric arithmetic into the sales module. First cut recommended: **CPQ &
Contracts** — nothing in the tree references its five objects, it owns no hook on a foreign
object, and it is the module ADR-0130 names as needing a sellable unit.

Two measurements are worth keeping even if the plan changes. The per-module token estimates
are produced by importing `scripts/check-source-token-ratchet.mjs`'s own exported counting
functions, so they partition exactly the surface the gate measures and reconcile with its
whole-tree reading. And the split's real budget risk is not the manifests — those live outside
the ratchet's scope — but shared TypeScript source: six files are imported across module
boundaries, and copying each into every consuming package would cost 5,692 tokens, 98% of the
headroom under the authored-total ceiling.

The companion `docs/architecture/module-split-inventory.json` is the machine-readable half:
file → module, every edge with its rule and verdict, and the item classes the four rules never
covered. It is generated from the compiled artifact and stamped with the commit it was
measured at; regenerate it rather than editing it. The generator is deliberately not committed
— a one-off analysis script is not a gate, and gates belong to the platform.

Nothing here authorises the split. It is blocked on the upstream multi-package compile path,
Studio's writable verdict, and a platform release this repository can pin; the plan's
"上游缺口 / Upstream gaps" section lists those three alongside four gaps this analysis found —
chief among them that the measured accept/refuse matrix covers two item classes while the
split needs it for nine.
