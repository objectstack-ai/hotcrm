# REQ-0011: Expense reimbursement as a module of its own — usable without projects

- **Status**: Triaged
- **Source**: Maintainer (internal) — product direction from the data-model review of 2026-11-16, not a customer intake
- **Raised**: 2026-11-16
- **Disposition**: **B standard-enhancement — a new standard module**, `app.objectstack.hotcrm.expense`.
  PSA depends on it and adds the project; this is the one add-on → add-on edge the maintainer allowed
  ([`module-split-plan.md`](../architecture/module-split-plan.md), *Decisions recorded (2026-11-16)*).
- **Traceability**: design — [`../architecture/expense-module-plan.md`](../architecture/expense-module-plan.md);
  cards — stage 1: [hotcrm#2556](https://github.com/objectstack-ai/hotcrm/issues/2556) (the expense
  package); stage 2: [hotcrm#2559](https://github.com/objectstack-ai/hotcrm/issues/2559) (the expense
  report, Submit for Reimbursement and Mark as Paid; per-expense approval retires); stage 3: the travel request in four cards,
  [hotcrm#2578](https://github.com/objectstack-ai/hotcrm/issues/2578) (F3a, the request and its approval),
  [hotcrm#2579](https://github.com/objectstack-ai/hotcrm/issues/2579) (F3b, itinerary lines),
  [hotcrm#2580](https://github.com/objectstack-ai/hotcrm/issues/2580) (F3c, the report cites a request) and
  [hotcrm#2581](https://github.com/objectstack-ai/hotcrm/issues/2581) (F3d, the project and its project manager); the expense skill has no card yet;
  recorded by [hotcrm#2562](https://github.com/objectstack-ai/hotcrm/issues/2562). Changesets / PRs —
  stage 1: `.changeset/2556-expense-module.md` (hotcrm#2556; the project-path approval held in the
  expense package until [objectstack#34616](https://github.com/objectstack-ai/objectstack/issues/34616),
  moved back on [hotcrm#2575](https://github.com/objectstack-ai/hotcrm/issues/2575)); stage 3:
  `.changeset/2578-travel-request.md` (hotcrm#2578).

## Raw requirement (verbatim)

The maintainer's words, untranslated, all times UTC:

| When | Words |
| --- | --- |
| 2026-11-16 22:37Z | 「我建议报销一起设计。同意不改前缀。」 |
| 2026-11-16 22:54Z | 「报销 应该是一个单独的软件包吧，很多系统还是单独的产品呢」 |
| 2026-11-16 22:55Z | 「报销需要放到核心包吗」 |
| 2026-11-16 22:56Z | 「如果作报销，是否建议差旅申请一起设计。」 |
| 2026-11-16 23:01Z | card option adopted: 「单独的报销包」 on 「定一下报销放在哪个软件包」 |
| 2026-11-16 23:03Z | 「差旅申请一起设计，并入费用报销模块？」 |
| 2026-11-16 23:04Z | 「现在有了 agent， Concur 很多功能可以借助 agent，我们只需要提供接口。」 |

**How to read two of them.**

- 23:01Z is a card option she tapped, recorded **as adopted rather than as typed** (the precedent in
  [`README.md`](README.md)); the option text was drafted by the decision thread.
- 23:03Z ends in a question mark. The decision thread read it as a direction (design the travel
  request together, inside the expense module); she was asked to correct that reading and has not.
  It is recorded **as read, not as a typed ruling**.

The four usability rules of [REQ-0010](0010-sales-order.md) (the decision thread's drafting carrying
her 21:24Z and 21:42Z worries) apply here too: the daily sales path gains no step, no existing form
gains a required field, a new object does not appear in front of people who do not need it, and no
accounting words on screen.

## Standard product analysis

Read on hotcrm `main` at `2257cdd`.

- **One object, `crm_expense`, in PSA** (`src/psa/objects/expense.object.ts`). The project is
  required, so an expense with no project cannot be recorded.
- **Each expense is approved alone**: the project manager, then the finance controller above the
  threshold in `src/psa/objects/_thresholds.ts` (`submission-approval.flow.ts`).
- **There is no report** that groups expenses for one submission, and **no paid status**: an
  approved expense is the end of the record.

So reimbursement today exists only for project staff, one receipt at a time, and stops at approval.

## Disposition & rationale

**B — a new standard module.**

- **Why standard:** every employee spends money for the company and claims it back, whether or not
  they work on projects. The maintainer's 22:54Z words name the shape the market already has:
  reimbursement is a product of its own in most suites.
- **Why its own module, not the core packages and not PSA:** the 23:01Z adopted option. A tenant that
  does not reimburse through HotCRM disables it; PSA needs it and adds the project.
- **Why lean on automation:** 23:04Z. Receipt reading, policy checks and audit are work an agent does
  through the API; the product supplies records, statuses, approval history, hard rules as
  validations, permissions, and the few fields an agent writes or compares on.

## Product response

The design is [`expense-module-plan.md`](../architecture/expense-module-plan.md). In short:

- **Stage 1** ([hotcrm#2556](https://github.com/objectstack-ai/hotcrm/issues/2556)): the expense
  package, with `crm_expense` moved into it; PSA depends on it and contributes the project field, the
  cost summaries and the project-manager approval flow.
- **Stage 2** ([hotcrm#2559](https://github.com/objectstack-ai/hotcrm/issues/2559)): the expense
  report with its approval (the project manager or the submitter's manager), Submit for
  Reimbursement and Mark as Paid; approving each expense alone retires.
- **Stage 3** (no cards yet): the travel request (`crm_expense_request`, as read at 23:03Z) and an
  expense skill for agents.

**Not now** — each a pure addition later: advances, hard policy limits, per diem and mileage,
corporate card feeds, receipt verification, payout, accounting export, department attribution.
Foreign-currency expenses wait for [REQ-0012](0012-multi-currency.md).

## Acceptance

- On `pnpm dev`, with PSA disabled: an employee records an expense with its receipt and no project,
  submits it in a report, the submitter's manager approves, and finance marks the report paid.
- With PSA on: an expense on a project goes to its project manager, an approved expense counts toward
  project cost as today, and the finance controller approves second above the existing threshold.
- Each card merged with `pnpm verify` green and a browser pass. This record is closed as **Shipped**
  when stage 2 is on `main`; stage 3 reopens it or is a new record.

## Note (2026-11-17): the travel request is dispatched

The maintainer's words, verbatim and untranslated (UTC):

| When | Words |
| --- | --- |
| 2026-11-17 05:15Z | 「出差申请用fable 综合分析，立卡开始开发」 |

This turns the travel request, recorded above as read from 23:03Z, into a dispatched task. The
decision thread wrote the design from it (the plan's *Travel request* section) and filed four
cards: [hotcrm#2578](https://github.com/objectstack-ai/hotcrm/issues/2578) (F3a, the request and the
traveler's manager's approval), [hotcrm#2579](https://github.com/objectstack-ai/hotcrm/issues/2579)
(F3b, itinerary lines without amounts), [hotcrm#2580](https://github.com/objectstack-ai/hotcrm/issues/2580)
(F3c, a report cites a request, planned against reported) and
[hotcrm#2581](https://github.com/objectstack-ai/hotcrm/issues/2581) (F3d, the project and its project
manager's approval). The design's defaults are the decision thread's, reported to her, not her typed
rulings (the plan's *Decisions recorded (2026-11-17)*).
