# REQ-0008: A quote and a contract the customer can receive — a printed PDF, and the signed copy filed back

- **Status**: Triaged
- **Source**: Maintainer (internal) — product direction from the 2026-10-26 module-expansion review, not a customer intake
- **Raised**: 2026-10-26
- **Disposition**: **B standard-enhancement** inside the packages that own the objects — `revenue` for `crm_quote`, the app package for `crm_contract` (after `module-split-plan.md` item 11). No new package.
- **Traceability**: design — this record's *Product response*; cards and changesets — to be filled in per phase.

## Requirement

Set in the module-expansion review of 2026-10-26, which ranked the next modules by six angles
(customer evidence, an unexhibited platform capability, market parity, packaging fit,
community-edition fit, size). The maintainer accepted the first batch, of which this is one item;
in substance:

1. A sales rep must be able to hand a customer the quote, and later the contract, as a document —
   today both exist only as records on a screen.
2. When the customer signs, the signed copy must come back onto the record, and the record's
   status must follow.
3. This is the first exhibit of the platform's print service: HotCRM has never used it.

## Standard product analysis

**What exists.** `crm_quote` (`src/revenue/objects/quote.object.ts`) carries the pricing group,
terms and two addresses, a `draft → in_review → presented → accepted / rejected / expired` state
machine, and has attachments enabled; `crm_quote_line_item` carries the lines. `crm_contract`
(`src/revenue/objects/contract.object.ts` today, `src/sales/objects/` after the move) carries the
term, value, billing fields, `signed_date`, and attachments. Accepting a quote drafts a contract
(`quote_accepted_contract_draft`, `src/revenue/objects/quote.hook.ts`).

**What the platform offers.** `@objectstack/service-print` prints a record's print page to PDF in
headless Chromium as the requesting user and archives the PDF as a file attached to the record;
it mounts `POST /api/v1/print/records`, which a console `type: 'api'` action targets. A print page
is an ordinary page with a `print` declaration (paper, margins, running header and footer, page
numbers, page-break hints) over the printable block subset (`PagePrintSchema`, objectstack#22158,
ruling 「8346 B′」: *a document is a page with a print declaration, no new template type*). The
print service needs a Chromium placement (`OS_PRINT_CHROMIUM_PATH` or a remote browser endpoint).

**The gap.** No print page exists for either object, no action produces a document, and nothing
records that a document went out or came back signed. `presented` is set by hand.

## Disposition & rationale

**B — standard, inside the owning packages.**

- Every B2B seller sends the quote and signs the contract; the document is the thing the customer
  actually receives. In market terms this is the last mile of CPQ.
- It exhibits a platform capability HotCRM has never shown (`service-print`), on the two objects
  where a printed document is the obvious need — the lane charter's first filter.
- It is small: two print pages, two actions, two status transitions, one file field each.

**What is not in scope.** Electronic signature is an external provider's service; HotCRM records
the signed file and the date, it does not collect signatures, verify identity or run a signing
ceremony. A customer wanting a provider integration builds it in its own repository (**C**).
Document templates per customer (letterhead, clauses, languages beyond the four packs) are **C**
too; the standard product ships one print page per object.

## Product response

- **Phase 1 — the printed quote.** A print page for `crm_quote` (`src/revenue/pages/`, a page
  carrying a `print` declaration: header with the seller's name and the quote number, the account
  and contact block, the line-item table, the pricing group, the terms, footer with page numbers);
  a `print_quote` action on the record page targeting `POST /api/v1/print/records`; the printed PDF
  lands in the quote's attachments by the service's own archiving. Sending the file is the existing
  `send_email` action with the attachment. The transition `draft / in_review → presented` is set by
  a hook when a print of the quote is archived — the record says it was presented because a
  document was produced, not because someone remembered to click.
- **Phase 2 — the printed contract.** The same shape on `crm_contract` after
  `module-split-plan.md` item 11 moves it to the app package (`src/sales/pages/`).
- **Phase 3 — the signed copy.** A `signed_copy` file field on `crm_contract`; writing it sets
  `signed_date` when empty and is the gate the activation transition reads (`requiredWhen` on
  `status = activated`, Metadata semantics rule 7: a transition gate, not an invariant). On
  `crm_quote`, uploading a signed copy is what `accepted` requires the same way.
- **Docs** under `content/docs/revenue/` (quote) and `content/docs/sales/` (contract), English
  first, then `.zh-Hans.mdx` and `.zh-Hant.mdx`, under *Documentation discipline*; the four locale
  packs carry the new action, field and page labels.
- **Platform readings before phase 1 starts** (filed upstream if any refuses, ⛔ never worked
  around here): that `service-print` runs in the community edition with a local Chromium; that the
  record page's print action (card ② of objectstack#8346) is in the pinned release; that a
  `related_list` of line items is in the printable block subset, or which block renders a child
  table in print.

## Acceptance

- On `pnpm dev` with a Chromium placement configured: a rep opens a quote with three lines, clicks
  *Print quote*, a PDF appears in the quote's attachments showing the lines and totals, and the
  quote reads `presented`; the same on a contract. Uploading a signed copy to the contract fills
  `signed_date`, and activating a contract without one is refused naming the field.
- `pnpm verify` green; one changeset per PR; the browser pass recorded in each PR.
- This record is closed as **Shipped** when phase 3 is on `main`.
