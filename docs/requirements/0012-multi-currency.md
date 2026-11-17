# REQ-0012: Multi-currency — deferred by the maintainer; the design is kept for the restart

- **Status**: Deferred
- **Source**: Maintainer (internal) — the data-model review of 2026-11-16
- **Raised**: 2026-11-16
- **Disposition**: **D defer.** The revisit trigger is the maintainer saying start.
- **Traceability**: recorded by [hotcrm#2562](https://github.com/objectstack-ai/hotcrm/issues/2562);
  supersedes the reason [REQ-0009](0009-price-books.md) and
  [`module-split-plan.md`](../architecture/module-split-plan.md) item 14 gave for waiting (see
  *Decisions recorded (2026-11-16)* there). No card.

## Raw requirement (verbatim)

The maintainer's words, untranslated, all times UTC, in the order she gave them. The second
reverses the first, after she read the risks listed below.

| When | Words |
| --- | --- |
| 2026-11-16 21:51Z | 「多币种。应该启用，平台已经有这个核心能力，不用浪费。」 |
| 2026-11-16 22:45Z | 「多币种先不启动。」 |

## Standard product analysis

Read on hotcrm `main` at `2257cdd`: every amount is a bare number in the tenant's home currency.
There are 45 currency fields (30 of them in the live `sales`, `revenue` and `marketing` packages, the
rest in Order to Cash and PSA), and 21 summary and 18 formula fields in all, each of which a restart must check.

The platform now carries per-record currency, dated rates and a write-time home-currency projection
(objectstack ADR-0144), which is what the 21:51Z words refer to. Its facts here were **read from that
design record and the field definitions, not run on 18.5.0**.

## Disposition & rationale

**D — defer, by the maintainer's 22:45Z ruling.**

**What deferral means.** Every document stays in the home currency and the screens are unchanged.
The cost of waiting is that every object live at restart needs a currency backfill.

**Risks, in order** (what she read before 22:45Z):

1. **Three things cannot be undone.** The home currency locks once it is used. Which currency field
   an amount follows is a breaking change later. A parent's currency locks once its children follow
   it.
2. **A missing rate refuses the save**, which touches usability rule 1 of
   [REQ-0010](0010-sales-order.md) (the daily sales path gains no step).
3. **Every cross-record total must read the home-currency amount**: the forecast, the dashboards,
   the approval thresholds, the account summaries. One missed place either errors or misjudges.
4. **Old records with an empty currency** are unmeasured.
5. **A platform gap:** a same-currency total through a plain lookup (a payment against an invoice) is
   not supported. The platform-side fix she agreed to at 22:28Z (item 2 of 「1 2 我同意」, recorded in
   [REQ-0010](0010-sales-order.md)) is shelved with this record.
6. **A wide regression surface**: the counts above.

## Product response

**D — nothing is built.** The design kept for the restart:

- **One deal, one currency**, chosen once on the top document (default: the home currency) and
  followed downward.
- **Two stages**: the sales side first (opportunity, quote, order, contract and their lines), then
  Order to Cash, PSA and price books.

**Revisit trigger:** the maintainer says start. The first step then is a probe on the pinned
platform, before any product change.

New objects designed meanwhile carry no currency field (the sales order:
[`sales-order-plan.md`](../architecture/sales-order-plan.md); foreign-currency expenses:
[REQ-0011](0011-expense-and-reimbursement.md)).

## Acceptance

None while deferred. On restart, this record is reopened (or superseded by a new one) with the probe's
readings on the pinned platform.
