---
---

Maintainer documentation only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).
No object, view, flow, dataset, widget, translation or exported symbol changed: the whole
diff is under `docs/`.

Two records land:

- `docs/requirements/0002-it-services-project-delivery-and-cost.md` — the first real entry
  in the requirements log: an IT-services customer's 40-step CRM-to-delivery process,
  captured verbatim in its original language, triaged into a sales-module track (steps 1–14,
  to be filed per object) and a PSA track (steps 15–40), with the customer-overlay and
  declined items named against the rulings they rest on.
- `docs/architecture/psa-module-plan.md` — the standard-product design of that PSA track as
  `app.objectstack.hotcrm.psa`, the first `type: module` package under ADR-0130 inside the
  HotCRM artifact. It records that the compile and load path the module split was blocked
  on is carried by the 17.4.0 pin, applies the four measured edge rules and the 2026-09-02
  decisions of `module-split-plan.md` without re-deciding them, designs the eight v1
  objects and their approvals, and names the maintainer decisions Phase 0 waits on — the
  token-gate partition first among them.

Both indexes (`docs/README.md`, `docs/requirements/README.md`) gain their row in the same
change, as `docs/README.md` requires.
