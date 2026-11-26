# REQ-0010: A sales order as the spine of every deal — the contract becomes optional

- **Status**: Triaged
- **Source**: Maintainer (internal) — product direction from the data-model review of 2026-11-16, not a customer intake
- **Raised**: 2026-11-16
- **Disposition**: **B standard-enhancement**, in the app package (`app.objectstack.hotcrm`). It
  **supersedes two premises of [REQ-0007](0007-order-to-cash-module.md)**: "the core packages still
  model no orders" and "for a software vendor the signed contract is the order". REQ-0007's principle
  "a window, never a book" stands.
- **Traceability**: design — [`../architecture/sales-order-plan.md`](../architecture/sales-order-plan.md);
  cards — stage 1: [hotcrm#2555](https://github.com/objectstack-ai/hotcrm/issues/2555) (the order and
  its lines), [hotcrm#2557](https://github.com/objectstack-ai/hotcrm/issues/2557) (Order to Cash rows
  under the account); stage 2: [hotcrm#2558](https://github.com/objectstack-ai/hotcrm/issues/2558)
  (quote → order, contract on demand), [hotcrm#2560](https://github.com/objectstack-ai/hotcrm/issues/2560)
  (Order to Cash rows cite the order), [hotcrm#2561](https://github.com/objectstack-ai/hotcrm/issues/2561)
  (a project names its source order); recorded by
  [hotcrm#2562](https://github.com/objectstack-ai/hotcrm/issues/2562). Changesets / PRs — stage 1: `.changeset/2555-sales-order.md` (the order and its lines, hotcrm#2555), `.changeset/2557-o2c-rows-under-account.md` (Order to Cash rows under the account, hotcrm#2557); stage 2: `.changeset/2558-quote-creates-order.md` (an accepted quote creates its order, the contract is drafted from the order, both automations switchable, hotcrm#2558), `.changeset/2560-o2c-rows-cite-order.md` (plan steps, invoices and payments may cite an order, the order page shows planned, invoiced and received, hotcrm#2560), `.changeset/2561-project-source-order.md` (a project names its order, hotcrm#2561). Stage 2 is complete.

## Raw requirement (verbatim)

The maintainer's words, untranslated, all times UTC. Two of them are worries rather than rulings,
and they bound every change below.

| When | Words |
| --- | --- |
| 2026-11-16 | 「数据模型设计应该一步到位。功能可以逐步迭代。」 |
| 2026-11-16 21:24Z | 「按照这个设计我担心把原来简单的 hotcrm 应用作的太复杂了」 |
| 2026-11-16 21:42Z | 「我还有一个担心，你按照 erp 的复杂架构改完之后，会导致原来简单的应用变得不好用。更像复杂的财务软件。」 |
| 2026-11-16 21:50Z | 「销售订单和订单行 我觉得还是现在应该定清楚。是基本能力，我们要考虑通用需求而不是软件公司」 |
| 2026-11-16 22:28Z | 「需要我定的，1 2 我同意，订单与回款、项目交付这两个还没上线的模块，要不要趁上线前换成自己的前缀。 这个如果要改，给我一个具体的清单」 |
| 2026-11-17 00:12Z | card option adopted: 「立阶段0和1,含改动一」 on 「定一下现在开卡开到哪一步」 |
| 2026-11-26 08:17Z | 「所有需要拍板的都做」, adopting every decision in the discussion notes on how contracts, orders, invoices and payments relate (*Note (2026-11-26)* below) |

**How to read two of them.**

- "1 2" at 22:28Z answered two questions put to her. Item 1 is this record's: an accepted quote
  creates an order, and the contract is drafted on demand, both as automations an administrator can
  switch. Item 2 (a platform-side same-currency roll-up) belongs to multi-currency and was shelved by
  the 22:45Z ruling ([REQ-0012](0012-multi-currency.md)). The prefix question in the same sentence
  is answered in [`module-split-plan.md`](../architecture/module-split-plan.md), *Decisions recorded
  (2026-11-16)*.
- The 00:12Z ruling is a card option she tapped, recorded **as adopted rather than as typed** (the
  precedent in [`README.md`](README.md)). The option text was drafted by the decision thread.
  "改动一" in it is: collection-plan steps, invoices and payments belong to the account, and the
  contract becomes an optional source.

**Four usability rules**, drawn by the decision thread from her 21:24Z and 21:42Z worries. They are
the thread's drafting carrying her concern, not her typed words, and they apply to every change this
record and its plan make:

1. The daily sales path (lead, opportunity, quote, contract) gains no step.
2. No existing form gains a required field.
3. A new object does not appear in front of people who do not need it.
4. No accounting words on screen (ledger account, posting, reconciliation, tax code).

## Standard product analysis

Read on hotcrm `main` at `2257cdd`.

**What exists.** The chain is the quote and its lines (`crm_quote`, `crm_quote_line_item` in
`src/revenue/objects/`). An accepted quote drafts a contract automatically
(`quote_accepted_contract_draft`, `src/revenue/objects/quote.hook.ts`). Order to Cash then hangs the
collection-plan steps, invoices and payments under the contract (`crm_billing_milestone`,
`crm_invoice`, `crm_payment`, each a master-detail of `crm_contract`, `src/o2c/objects/`).

**The gap.** A product sale does not fit this chain. The drafted contract is a 12-month
subscription with one amount, and nothing records what was ordered, what was shipped, or what was
invoiced line by line. REQ-0007's reading, "for a software vendor the contract is the order", holds
for one kind of seller; the maintainer's 21:50Z words ask for the general case.

## Disposition & rationale

**B — standard, in the app package.** An order with lines is basic capability for every seller of
goods, services or subscriptions, which is the maintainer's own reason (21:50Z: 「是基本能力，我们要考虑通用需求而不是软件公司」).
It belongs to the app package for the reason the contract moved there (module-split item 11): the
quote package writes to it and Order to Cash cites it, and add-on packages do not depend on each
other.

## Product response

The design is [`sales-order-plan.md`](../architecture/sales-order-plan.md). In short:

- `crm_sales_order` and `crm_sales_order_line` in the app package
  ([hotcrm#2555](https://github.com/objectstack-ai/hotcrm/issues/2555)).
- An accepted quote creates a draft order with its lines, and the rep does nothing extra; the
  contract is no longer drafted automatically, an action on the order drafts it; both automations
  are packaged flows an administrator can switch
  ([hotcrm#2558](https://github.com/objectstack-ai/hotcrm/issues/2558)).
- Order to Cash rows (plan steps, invoices, payments) belong to the account, with the contract as an
  optional source ([hotcrm#2557](https://github.com/objectstack-ai/hotcrm/issues/2557)); they may
  also cite an order, and the order page shows invoiced and received, as the contract page does
  ([hotcrm#2560](https://github.com/objectstack-ai/hotcrm/issues/2560)).
- A project may name its source order, and the order page lists its projects
  ([hotcrm#2561](https://github.com/objectstack-ai/hotcrm/issues/2561)).
- A contract has a **form** — order contract, framework contract or other — and an order
  contract's amount is its order's; an active contract's amount and term change only through a
  Change action (*Note (2026-11-26)* below;
  [hotcrm#2804](https://github.com/objectstack-ai/hotcrm/issues/2804)).

**Not added, each with the trigger that would bring it in:**

| Not added | Trigger |
| --- | --- |
| A payment-terms object | A customer needs instalment templates that generate the collection plan |
| Tax codes and line tax | Two tax rates on one document, or invoicing inside HotCRM |
| An address object | Several ship-to addresses chosen at order time |
| Unit of measure and product type | Inventory or purchasing |
| Delivery notes and stock | Inventory |
| Invoice lines | Invoicing inside HotCRM |
| A payment allocation object | One receipt split across invoices inside HotCRM rather than at the source (REQ-0007: "a window, never a book") |

## Acceptance

- Stage 1 and stage 2 cards above are merged with `pnpm verify` green and a browser pass each.
- On `pnpm dev`: an accepted quote creates a draft order with the quote's lines and no extra step for
  the rep; no contract is drafted unless someone runs the action on the order (or an administrator
  switches the automatic draft back on); an invoice and a payment can be recorded against the order
  with no contract; the order page shows invoiced and received.
- This record is closed as **Shipped** when stage 2 is on `main`.

## Note (2026-11-26) — the contract's form, its amount, and Change

The maintainer's 2026-11-26 08:17Z words, 「所有需要拍板的都做」, adopted every decision in the
discussion notes on how contracts, orders, invoices and payments relate (recorded as adopted
rather than as typed; the decisions are listed on the tracking card,
[hotcrm#2803](https://github.com/objectstack-ai/hotcrm/issues/2803)). For this record:

- **A contract form** with three values: *order contract*, *framework contract*, and *other* (no
  amount, for example an NDA).
- **An order contract is generated from its order, and its amount is the order amount.** It cannot
  be edited by hand; to change it, change the order first.
- **A framework contract** is created by hand, can carry many orders, and its amount is a ceiling.
- **On an active contract, amount and term change only through a Change action**, with a reason
  and a signed amendment attached.

The order stays the spine; the contract stays optional. This is the requirement as decided; the
code follows with [hotcrm#2804](https://github.com/objectstack-ai/hotcrm/issues/2804), and a
framework contract's quota roll-up and over-limit warning with
[hotcrm#2807](https://github.com/objectstack-ai/hotcrm/issues/2807); a formal change order and its
approval are a proposal in [hotcrm#2809](https://github.com/objectstack-ai/hotcrm/issues/2809). The same ruling's invoice and
payment decisions are recorded on [REQ-0007](0007-order-to-cash-module.md), *Note (2026-11-26)*.
