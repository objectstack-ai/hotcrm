---
---

Maintainer documentation only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).
Nothing under `src/` or `content/docs/` moves, so the built artifact and the published
documentation site are byte-identical to `main`.

`docs/requirements/0002-it-services-project-delivery-and-cost.md` cited three `src/` paths
that the ADR-0130 layout move had already removed **before the record was written**, so they
never named anything. They now resolve against the real package tree:

- `src/objects/` → `src/sales/objects/` — the four objects the sales half is judged against
  (`crm_account`, `crm_contact`, `crm_lead`, `crm_opportunity`) are the sales package's.
- `src/flows/opportunity-approval.flow.ts` → `src/sales/flows/opportunity-approval.flow.ts`.
- `src/flows/billing-handoff.flow.ts` → **both** successors. The move split that flow in two
  by trigger, and the 2026-08-02 ruling the record cites it for — HotCRM models no orders,
  invoices or payments — is carried by each half, so the record names each half:
  `src/sales/flows/billing-handoff-closed-won.flow.ts` (an opportunity enters `closed_won`)
  and `src/revenue/flows/billing-handoff-contract-activated.flow.ts` (a contract enters
  `activated`). There is no same-named successor to point at.

This corrects one ruling in #1924 / PR #1932, which froze these three as a requirements
record. The record's own commit is a descendant of the move commit, so the paths were stale
the day they were written — a typo, not a true-when-written record. `docs/requirements/README.md`
calls a record "the spec an agent starts from", read "before writing any `*.object.ts`", so
a stale path in one is an authoring input, not a historical note. The policy half, and `docs/architecture/**`, are untouched: those
documents describe the pre-move tree on purpose and wait on the maintainer's ruling.
