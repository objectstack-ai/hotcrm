# HotCRM sales order — the order is the spine of a deal; the contract is optional

> **Status**: design only. Nothing in `src/` moves on the strength of this document; every card
> below lands through its own PR, `pnpm verify` and changeset. Once
> [hotcrm#2555](https://github.com/objectstack-ai/hotcrm/issues/2555) lands, `src/` is the source of
> truth for the model and this document records intent (AGENTS.md *Documentation discipline*
> rule 5).
> **Measured against**: `origin/main` at `2257cdd`, `@objectstack/*` **18.5.0** (the pin). Written
> from the code; no prototype was run (see *Not measured*).
> **Companions**: [`../requirements/0010-sales-order.md`](../requirements/0010-sales-order.md) — the
> requirement and the maintainer's words; [`order-to-cash-module-plan.md`](./order-to-cash-module-plan.md)
> — the module whose rows move under the account; [`module-split-plan.md`](./module-split-plan.md)
> — item 11 (the contract is the app package's), and *Decisions recorded (2026-11-16)*.

## Premise

The order is the spine of a deal, and the contract is optional.

- The **order** records what the customer bought this time.
- The **contract** records what the two parties agreed.

Deal performance counts orders, never contract amounts, and the two are never added together.

Every change below keeps the four usability rules recorded in
[REQ-0010](../requirements/0010-sales-order.md) (the decision thread's drafting carrying the
maintainer's 21:24Z and 21:42Z worries): the daily sales path gains no step; no existing form gains
a required field; a new object does not appear in front of people who do not need it; no accounting
words on screen.

## Order and contract

| | Order | Contract |
| --- | --- | --- |
| When | Every deal has one | Optional: a subscription, project services, a framework agreement, an NDA, an MSA |
| Lines | Yes; total = sum of the lines | No lines |
| Amount | The sum of its lines | An agreed amount, or a framework ceiling |
| Dates | Order date, shipped date | Start, end, term, renewal |
| Statuses | `draft` · `confirmed` · `completed` · `cancelled` | Its existing statuses |
| Other | Customer PO number, fulfilment status | — |

An order belongs to at most one contract; a contract may have many orders, or none.

## Rules

1. An accepted quote creates a draft order, with the header and the lines copied. The rep does
   nothing extra.
2. The contract is no longer drafted automatically. An action on the order drafts it, with the
   content today's automatic draft has.
3. Both automations are packaged flows an administrator can switch. Switching the contract draft
   back on restores today's behaviour.
4. Plan steps, invoices and payments may cite an order. A plan step cites an order or a contract.
5. The order page shows invoiced and received, as the contract page does.
6. An order can be created without a quote.

**One deal's collection plan hangs in one place:** on the order when there is one, and on the
contract only when there is no order.

## Sample scenarios

| Scenario | Records |
| --- | --- |
| Product sale | Quote, then order; no contract. A yearly framework contract may hold many orders. |
| Project services | Quote, then order; the service agreement is drafted from the order. The project and its collection plan cite the order. |
| Subscription | Quote, then order; the subscription contract is drafted from the order. A renewal is another order under the same contract. |
| NDA, MSA | A contract with no order. |

## Data model (intent)

`src/` is the source of truth once [hotcrm#2555](https://github.com/objectstack-ai/hotcrm/issues/2555)
lands; this section states the intended model and is not kept in step with it.

- **`crm_sales_order`**, under the account like the quote and the contract. The header mirrors the
  quote header, plus: an optional contract; a customer PO number; a nullable unique external
  reference (the match key for a later ERP import); a fulfilment status and a shipped date, typed or
  imported, for reading only. No currency field while multi-currency is deferred
  ([REQ-0012](../requirements/0012-multi-currency.md)).
- **`crm_sales_order_line`**, under the order, with the same ten fields as the quote line
  (`crm_quote_line_item`; read the list there, not here — AGENTS.md *Documentation discipline*
  rule 5).
- **Placement: the app package**, for the reason the contract moved there (module-split item 11):
  the quote package writes to it and Order to Cash cites it, and add-ons do not depend on each other.

**Fields other packages contribute** (they leave with their module when it is disabled):

- the quote package adds the source quote;
- Order to Cash adds invoiced and received.

## Order to Cash rows belong to the account

The adopted 00:12Z option (「立阶段0和1,含改动一」; "改动一" is this section).

- **Today**, `crm_billing_milestone`, `crm_invoice` and `crm_payment` each require a contract
  (master-detail of `crm_contract`). So an invoice against an order, one invoice for several orders,
  and an advance payment before any contract do not fit.
- **After [hotcrm#2557](https://github.com/objectstack-ai/hotcrm/issues/2557)**, the account is
  required, and the contract (and, after [hotcrm#2560](https://github.com/objectstack-ai/hotcrm/issues/2560),
  the order) are optional sources.
- **Who can see and edit does not change**, because the contract itself derives from the account.
- **No data moves**: existing rows already carry both the contract and the account.

## Two limits accepted for the first version

1. With the quote-and-product module disabled, the product picker on an order line is empty; the
   name and the price are typed.
2. A hand-added order line does not take the price-book price.

## Phasing

| Stage | Cards |
| --- | --- |
| 1 | [hotcrm#2555](https://github.com/objectstack-ai/hotcrm/issues/2555) the order and its lines; [hotcrm#2557](https://github.com/objectstack-ai/hotcrm/issues/2557) Order to Cash rows under the account |
| 2 | [hotcrm#2558](https://github.com/objectstack-ai/hotcrm/issues/2558) an accepted quote creates an order, the contract is drafted on demand (rules 1–3); [hotcrm#2560](https://github.com/objectstack-ai/hotcrm/issues/2560) Order to Cash rows may cite an order, the order page shows invoiced and received (rules 4–5); [hotcrm#2561](https://github.com/objectstack-ai/hotcrm/issues/2561) a project may name its source order |

A release follows stage 2.

## Decisions recorded (2026-11-16 and 2026-11-17)

The maintainer's words, verbatim and untranslated, all times UTC:

| When | Words |
| --- | --- |
| 2026-11-16 | 「数据模型设计应该一步到位。功能可以逐步迭代。」 |
| 2026-11-16 21:24Z | 「按照这个设计我担心把原来简单的 hotcrm 应用作的太复杂了」 |
| 2026-11-16 21:42Z | 「我还有一个担心，你按照 erp 的复杂架构改完之后，会导致原来简单的应用变得不好用。更像复杂的财务软件。」 |
| 2026-11-16 21:50Z | 「销售订单和订单行 我觉得还是现在应该定清楚。是基本能力，我们要考虑通用需求而不是软件公司」 |
| 2026-11-16 21:51Z | 「多币种。应该启用，平台已经有这个核心能力，不用浪费。」 |
| 2026-11-16 22:21Z | 「全仓还是保留现有的 crm_ 前缀是吗」 |
| 2026-11-16 22:28Z | 「需要我定的，1 2 我同意，订单与回款、项目交付这两个还没上线的模块，要不要趁上线前换成自己的前缀。 这个如果要改，给我一个具体的清单」 |
| 2026-11-16 22:37Z | 「我建议报销一起设计。同意不改前缀。」 |
| 2026-11-16 22:45Z | 「多币种先不启动。」 |
| 2026-11-17 00:12Z | card option adopted: 「立阶段0和1,含改动一」 on 「定一下现在开卡开到哪一步」 |
| 2026-11-17 00:13Z | 「阶段2 也立卡」 |

What they settle for this design:

1. **The order and its lines are designed now** (21:50Z, and the data-model sentence).
2. **"1 2 我同意" (22:28Z):** item 1 is rules 1–3 above (an accepted quote creates an order; the
   contract is drafted on demand; both are switchable automations). Item 2, a platform-side
   same-currency roll-up, was shelved with multi-currency at 22:45Z.
3. **Multi-currency is not started** (22:45Z reverses 21:51Z): the order has no currency field
   ([REQ-0012](../requirements/0012-multi-currency.md)).
4. **The prefix stays `crm_`** (22:21Z, 22:37Z): `crm_sales_order`, `crm_sales_order_line`.
5. **Stage 0 and 1 are filed, with change one** (00:12Z, a card option adopted rather than typed:
   Order to Cash rows belong to the account), and **stage 2 is filed too** (00:13Z).

## Not measured

- The design was written from the code, with no prototype.
- Changing the master of the three Order to Cash objects on an existing environment was measured
  inside [hotcrm#2557](https://github.com/objectstack-ai/hotcrm/issues/2557) on 2026-11-17, from a
  6.5.0 database: no row, account, contract or total changed; the contract column stays NOT NULL
  until an administrator runs `os migrate apply` and confirms the three `relax_not_null` changes.
