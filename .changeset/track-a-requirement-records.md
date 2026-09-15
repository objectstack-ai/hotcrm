---
---

Maintainer documentation only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).
No object, view, flow, dataset, widget, translation or exported symbol changed: the whole diff
is under `docs/requirements/` plus this file. Same class, and the same declaration, as the
changeset that shipped REQ-0002 itself.

REQ-0002's *Product response* mandates that its Track A (the sales-module half, steps 1–14 of
the customer's 40-step process) be "filed as REQ-0003 onward, one record per object, each
carrying its own standard-versus-overlay split". This PR files those four records:

- `docs/requirements/0003-account-registration-category-and-approval.md` — `crm_account`
  (steps 1 · 3 · 4 · 5): a country-neutral registration identifier, a category that *gates*
  what the account may do rather than merely classifying it, the business-profile block, and
  account approval. Attachments are already supported and are recorded as no gap.
- `docs/requirements/0004-contact-buying-centre-map.md` — `crm_contact` (step 2): role in the
  purchase decision, attitude toward us, relationship strength.
- `docs/requirements/0005-lead-need-type-value-and-approval.md` — `crm_lead` (steps 6 · 7):
  need type, estimated value, and a configurable approval gate before conversion.
- `docs/requirements/0006-opportunity-qualification-and-status-approval.md` —
  `crm_opportunity` (steps 8 … 14): the qualification block, customer-side milestone dates,
  subcontracting, the deal narrative block, and approval on *status change* rather than on
  amount alone.

Each record carries its own B / C split and its own acceptance criteria; the C and D verdicts
REQ-0002 already gave (the signing-entity list, the revenue-recognition vocabulary, the US EAR
flag, the 铁三角 role model) are quoted rather than re-decided. REQ-0002's *Product response*
and `docs/requirements/README.md`'s index gain their links in the same change.
