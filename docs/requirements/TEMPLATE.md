# REQ-NNNN: <short title>

- **Status**: Intake | Triaged | In progress | Shipped | Declined | Deferred
- **Source**: <customer name / market segment / internal>
- **Raised**: YYYY-MM-DD
- **Disposition**: A standard-config | B standard-enhancement | C customer-overlay | D decline/defer
- **Traceability**: <changeset / PR / overlay package — fill in when built>

## Raw requirement (verbatim)

> Capture the customer's original words, in their original language. Do not
> pre-interpret or normalise. This is the source of truth for what was asked.

## Standard product analysis

What does the standard product do today? Where exactly is the gap? Which existing
objects / views / flows are relevant?

## Disposition & rationale

Which bucket (A / B / C / D) and **why**.

- If **B** (enters core): why is this broadly valuable to most customers, not just
  this one?
- If **C** (overlay): name the overlay / extension package, and state why it must
  NOT enter HotCRM core.

## Product response

The concrete answer:

- **A** — configuration steps the customer/admin follows (+ link to the user doc).
- **B** — the standard metadata to add/change under `src/{type}/` (+ changeset id).
- **C** — the overlay/extension to author on top of HotCRM (package, files).
- **D** — rationale + the trigger that would make us revisit.

## Acceptance

How we know the requirement is satisfied — demo path, `pnpm validate`, a test,
or a Console screenshot.
