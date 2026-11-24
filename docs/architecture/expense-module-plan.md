# HotCRM expense module — reimbursement for every employee; PSA adds the project

> **Status**: design only. Nothing in `src/` moves on the strength of this document; every card
> below lands through its own PR, `pnpm verify` and changeset. Once
> [hotcrm#2556](https://github.com/objectstack-ai/hotcrm/issues/2556) lands, `src/` is the source of
> truth for the model and this document records intent (AGENTS.md *Documentation discipline*
> rule 5).
> **Measured against**: `origin/main` at `2257cdd`, `@objectstack/*` **18.5.0** (the pin); the
> readings in *Measured on 2026-11-16* were taken in a scratch copy, nothing committed.
> **Companions**: [`../requirements/0011-expense-and-reimbursement.md`](../requirements/0011-expense-and-reimbursement.md)
> — the requirement and the maintainer's words; [`psa-module-plan.md`](./psa-module-plan.md) — the
> module `crm_expense` leaves; [`module-split-plan.md`](./module-split-plan.md) — item 10 and its one
> relaxation, *Decisions recorded (2026-11-16)*.

## Premise

Reimbursement is used by every employee, not only project staff, and it is a product of its own in
most suites. So:

- **The expense package is complete without projects.** PSA depends on it and adds the project.
- **Automation belongs to an agent working through the API** (the maintainer, 23:04Z). The product
  supplies records, statuses, approval history, hard rules as validations, permissions, and the few
  fields an agent writes or compares on.
- ⛔ **No native receipt recognition, policy engine or audit engine.**

The four usability rules of [REQ-0010](../requirements/0010-sales-order.md) apply: reporting a single
expense takes no extra step, and no accounting words appear on screen.

## Objects (intent)

`src/` is the source of truth once the cards land.

**`crm_expense`** (the existing name): one expense. It gains:

- **paid by**: the employee by default, or the company. A company-paid ticket counts as project cost
  and is not reimbursable.
- **merchant** and **receipt number**;
- **source**: `manual` · `agent` · `import`;
- an optional **report**.

**`crm_expense_report`**: groups expenses and carries submission, approval and payment. It holds a
number, a title, the submitter, an optional account, the total, the reimbursable amount (employee-paid
lines only), a status (`draft` · `submitted` · `approved` · `paid` · `rejected`), the approver and the
dates, the payment date and reference, and a notes field where an agent or a rule writes what it
found for the approver.

Finance marks a report paid. The system records it and neither pays nor posts.

## Flow

1. Record an expense with its receipt; the project is optional.
2. Select one or several expenses and submit. Expenses of one project form one report; the rest form
   one report.
3. A report with a project goes to the project manager; a report without one goes to the submitter's
   manager. Above the existing threshold the finance controller approves second.
4. Approved lines count toward project cost exactly as today.

Reporting a single expense takes no extra step.

## Package shape

- A `type: module` package, `app.objectstack.hotcrm.expense`, with its own app, switchable in
  Settings.
- Inside the one suite artifact, not separately installable (module-split item 15).
- PSA declares two dependencies: `app.objectstack.hotcrm` and `app.objectstack.hotcrm.expense`.

## Measured on 2026-11-16

In a scratch copy of `main` at `2257cdd` on `@objectstack/*` 18.5.0, fresh environment, nothing
committed:

- PSA `objectExtensions` adding a `crm_project` lookup to the expense package's `crm_expense` builds,
  and the field appears in the object's metadata.
- Summaries on `crm_project` over `crm_expense` work: approving an expense of 300 moved
  `actual_expense_cost` and `billable_expense_amount` to 300.
- A PSA flow triggered on `crm_expense` builds (with a warning that the stack does not define the
  object) and fires. `pnpm lint --strict` fails on that warning, which this probe did not run; see
  *Decisions recorded (2026-11-17)*. A PSA sharing rule on it builds. The expense package's `navigationContributions`
  into the PSA app builds.
- Refused at build inside PSA once the object is foreign: a hook on `crm_expense` (R4), views of it,
  and the PSA app's own navigation to it (R3).
- **Expense disabled with PSA on:** the platform allows it (there is no dependency protection).
  Projects read, list and edit; the summary fields stay and keep their last value; `crm_expense`
  answers 404 `OBJECT_PACKAGE_DISABLED`; the contributed menu item leaves the PSA app.
- **PSA disabled with expense on:** the project field leaves the object and the records; creating and
  submitting without a project works; stored project values return on re-enable.
- **Project-manager approval needs no hook:** a PSA-owned approval flow reads the project with a
  `get_record` node and names the approver with
  `{ type: 'expression', value: 'vars.projectRecord.project_manager' }`; the request reached the
  staffed manager.

## Consequences for the build

- Views of `crm_expense` live in the expense package.
- The refusals "a locked, Closed or Cancelled project takes no expenses" live in `expense.hook.ts`
  today and cannot move to PSA as a hook (R4). They become a lookup filter on the PSA-contributed
  field plus a rejection in PSA's flow. Since hotcrm#2764 the report's submission is refused
  before the flow, by validation rules PSA contributes to `crm_expense_report` through the same
  object extension (a rule is not a hook, so R4 allows it); the flow's rejection stays as the
  backstop.
- The two approval paths (project manager through PSA, submitter's manager in the expense package)
  must be mutually exclusive.

## Travel request (stage 3)

The intent of [hotcrm#2578](https://github.com/objectstack-ai/hotcrm/issues/2578) to
[hotcrm#2581](https://github.com/objectstack-ai/hotcrm/issues/2581); `src/` is the source of truth
once each lands.

- **`crm_expense_request`**, labelled **Travel Request** (「出差申请」), in the expense package. The
  name is wider than the label: an object name cannot change, and a request before spending may one
  day cover more than trips. Travel only for now; ⛔ no type field.
- **The request** (F3a): purpose, the traveler (the owner), destination, start and end date, days,
  an optional account, **one estimated amount** for the whole trip, itinerary and notes, status, the
  approver, source, and a notes field where an agent or a rule writes what it found for the approver
  (「检查提示」). Required: purpose, destination, the two dates, the estimated amount.
- **Statuses**, all present from the first card: draft · submitted · approved · rejected ·
  cancelled · closed. Approved requests are cancelled before the trip or closed after it; both are
  final. Once approved, the planned values (purpose, destination, dates, estimated amount, and
  with F3d the project) no longer change: a new plan is a new request.
- **Approval** (F3a): one tier, the traveler's manager, with the expense's no-manager fallback;
  ⛔ no finance tier, the money check stays on the report. With Project Delivery on, a request on a
  project goes to its project manager instead (F3d; the flow sat in the expense package with the
  expense's project path until objectstack#34616, and is Project Delivery's since
  [hotcrm#2575](https://github.com/objectstack-ai/hotcrm/issues/2575), *Measured on 2026-11-19*).
- **Itinerary lines** (F3b, `crm_expense_request_line`): optional segments (flight, train, car,
  hotel, other), from, to, dates, requirements and a booking reference an agent writes back after
  booking. ⛔ No amounts, so there are never two totals. As built
  ([hotcrm#2579](https://github.com/objectstack-ai/hotcrm/issues/2579)): a `controlled_by_parent`
  detail entered from the request page's *Itinerary Lines* tab, as order lines are; from Submitted
  on, its planned values carry a `parent`-scoped `readonlyWhen` and a hook refuses a person's change,
  add, removal or move out loud (the edit dialog does not evaluate a `parent` predicate on 18.5.0, so
  the engine's silent drop alone would read as saved); the booking reference stays writable at
  every status.
- **The report cites a request** (F3c): optional, N reports to one request. The request shows the
  estimate, the amount reported, the difference and whether it is over; over only warns. The
  request closes when its last open report is paid.
- **Optional:** a reimbursement never requires a request.
- **Where it appears:** the Expenses app; with F3d, the Project Delivery app too. ⛔ No menu in the
  Sales, Service or Marketing apps and no list on the account page.
- **Agent-first:** the product supplies the records, the statuses, the approval, Submit, Cancel and
  Close, `source`, the approver notes and the booking reference. Estimating, checking, booking and
  reminding are an agent's work through the API, acting as the traveler.
- **Not in these cards**, each a pure addition later: advances (an object of their own citing the
  request and the report), a "request required" switch, a hard overspend limit, per-category
  estimates, booking and travel-desk roles, per diem and policy checks, a trip calendar, foreign
  currency (REQ-0012).

## Agent surface (stage 3)

- Two expense skills in the package; the sending steps opened to the agent, Mark as Paid not
  (F4b, below).
- Measured on 18.5.0 in F4b: an agent attaching a receipt image to an expense, and a skill's action
  run over MCP with its confirmation.

### Expense standards (F4a, [hotcrm#2616](https://github.com/objectstack-ai/hotcrm/issues/2616))

`crm_expense_standard`, labelled Expense Standard (「费用标准」): one row per rule the company states,
with a name, an optional category (the expense's own list; empty is any), an optional limit in the
organization's currency and what it is counted per (night, day, item, trip; asked for once a limit is
written), who and where it applies to in words, details, and Active. `public_read`: every set that
records expenses reads every standard; finance (the sets that mark a report paid) and administrators
keep them. One entry in the Expenses app, nowhere else.

⛔ Nothing in the product reads a standard: no validation, hook, flow or formula compares an expense
with one, and an expense over a standard saves and is submitted as before. An assistant reads the
standards and writes what it found in the expense's **Review Notes** (`crm_expense.review_notes`,
with the report's wording), which the approver reads in the report's expense list; it locks with the
expense's other fields. An index on the expense's receipt number makes a duplicate check one indexed
query. The skills and the actions opened to an assistant are F4b
([hotcrm#2617](https://github.com/objectstack-ai/hotcrm/issues/2617)).

### Expense skills (F4b, [hotcrm#2617](https://github.com/objectstack-ai/hotcrm/issues/2617))

Two skills under `src/expense/skills/`, by reader. **Expense Filing** (`expense_filing`, 「费用代填」)
works for the person who spent: it fills an expense from a receipt with Source = Agent, checks for a
duplicate, attaches the receipt through the platform's upload link, reads the active standards and
writes its findings into the expense's Review Notes before the expense is sent, drafts travel
requests, and submits only after a yes. **Expense Check** (`expense_check`, 「费用检查」) works for
the approver and finance: it reads a report and lists what is over a standard, duplicated, missing a
receipt or over its trip's estimate, tells the reader, and changes nothing.

Opened to an assistant (`ai.exposed`): Submit for Reimbursement, Submit for a Trip, the report's
Submit and Back to Draft, and the travel request's Submit, Cancel Trip and Close; each one that sends
to an approver or cannot be undone carries `requiresConfirmation`. ⛔ Mark as Paid is not opened.

Measured on 18.5.0 over MCP (the PR body has what was sent and what came back): both prompts are
offered; the receipt round trip works with attachments, so no file field; `run_action` refuses a
confirmation-gated action with 428 until `confirm: true`; and **the approver cannot write a report's
Review Notes while its approval is pending** (`RECORD_LOCKED`: the report approvals set
`lockRecord`, and the platform has no per-field exemption). Ruled A on 2026-11-17 by the decision
thread (reported to the maintainer): the lock stays, notes live on each expense before it is sent,
and Expense Check tells the reader instead of writing. Turning the lock off was refused (the lock
keeps a report unchanged while it is judged); no platform card for lock-exempt fields; a
system-write "add review note" action is an idea only. `read_file` and `create_upload_link` stay
unbound in both skills until strict lint resolves the storage tools
([objectstack#34948](https://github.com/objectstack-ai/objectstack/issues/34948)).

## Measured on 2026-11-17 (hotcrm#2559)

Where **one report per project** lives: in the expense package's Submit for Reimbursement action. It
groups the selected expenses by the expense's `crm_project` value, which a record carries only while
PSA contributes the field, and writes it onto the report, where PSA contributes the same field. With
PSA on, two projects and one expense with no project made three reports, each routed to its own
approver; with PSA off, every selection made one report, approved by the manager, with no error in
any flow run (`test/psa-approvals.test.ts`, `test/expense-module.test.ts`). The project-path approval
flow stayed in the expense package with stage 1's until hotcrm#2575 moved both back (*Measured on 2026-11-19*).

## Measured on 2026-11-19 (hotcrm#2575): the project path is Project Delivery's again

On `main` at `a18b9e7` with `@objectstack/*` **18.6.0** (the pin, which carries objectstack#34616's
fix):

- **Where it lives now.** Project Delivery registers the approval of an expense report on a
  project, the approval of a travel request on a project with its insert twin, the report's two
  turn-back notices, and the three flows' labels in the four locale packs. The expense package
  registers only the two no-project approvals; its one remaining spelling of the project field in a
  flow is the no-project half of their entry conditions, which keeps the two paths exclusive. The
  grouping by project inside Submit for Reimbursement stays the action's. `test/expense-module.test.ts`
  pins that the expense package's flows, notices, translations and manual name no project beyond
  that guard.
- **Lint.** `pnpm lint` (`os lint --strict`) is clean with the flows owned by Project Delivery; the
  same flow pointed at an object no package declares still fails with
  `flow-trigger-unknown-object`, so the rule is live and now reads the dependency.
- **Behaviour is unchanged**, read on `@objectstack/verify` and on a real `objectstack dev` boot:
  a project report of 2,500 went to the project manager, then a Finance Controller, and moved the
  project's expense cost by 2,500; a report without a project went down the manager path; a report
  on a locked project went back to Draft with the locked-project notice; travel requests followed
  the same split. With Project Delivery disabled an expense was recorded, submitted and approved on
  the manager path; with the expense package disabled projects read, list, edit and take tasks.
- **Upgrade: a request pending when the flow changes package cannot be decided.** The engine keys a
  paused run by package and flow name, so deciding a request opened before the upgrade answers
  409 `RESUME_TARGET_LOST`, for a report and for a travel request alike, and the record stays
  Submitted. Measured recovery: the submitter recalls the request (200; the record stays
  Submitted, because the flow that would set it back is gone), the record is set back to Draft (by
  the submitter or an administrator, through the API), and the submitter submits it again; the
  project manager, then finance above the threshold, approve it as before. Deciding pending
  requests before upgrading avoids it.

## Why this shape

General products keep the project on each expense line and route to the line manager and finance;
project products route to the project side with one report per project. This design keeps the
general model and adds the project route through PSA. ⛔ Vendor comparison tables are not copied
into the repo.

## Phasing

| Stage | Cards |
| --- | --- |
| 1 | [hotcrm#2556](https://github.com/objectstack-ai/hotcrm/issues/2556) the expense package; `crm_expense` moves into it |
| 2 | [hotcrm#2559](https://github.com/objectstack-ai/hotcrm/issues/2559) `crm_expense_report` with its approval, Submit for Reimbursement and Mark as Paid; per-expense approval retires |
| 3 | The travel request: [hotcrm#2578](https://github.com/objectstack-ai/hotcrm/issues/2578) F3a, [hotcrm#2579](https://github.com/objectstack-ai/hotcrm/issues/2579) F3b, [hotcrm#2580](https://github.com/objectstack-ai/hotcrm/issues/2580) F3c, [hotcrm#2581](https://github.com/objectstack-ai/hotcrm/issues/2581) F3d; the expense skill (no card yet) |

## Decisions recorded (2026-11-16)

The maintainer's words, verbatim and untranslated, all times UTC:

| When | Words |
| --- | --- |
| 2026-11-16 22:37Z | 「我建议报销一起设计。同意不改前缀。」 |
| 2026-11-16 22:54Z | 「报销 应该是一个单独的软件包吧，很多系统还是单独的产品呢」 |
| 2026-11-16 22:55Z | 「报销需要放到核心包吗」 |
| 2026-11-16 22:56Z | 「如果作报销，是否建议差旅申请一起设计。」 |
| 2026-11-16 23:01Z | card option adopted: 「单独的报销包」 on 「定一下报销放在哪个软件包」 |
| 2026-11-16 23:03Z | 「差旅申请一起设计，并入费用报销模块？」 |
| 2026-11-16 23:04Z | 「现在有了 agent， Concur 很多功能可以借助 agent，我们只需要提供接口。」 |

What they settle:

1. **Reimbursement is designed now, with the data model** (22:37Z), and keeps the `crm_` prefix
   (22:37Z: 「同意不改前缀」).
2. **It is its own package, not a core package and not part of PSA** (22:54Z, 22:55Z, and the 23:01Z
   option adopted rather than typed). PSA depends on it — the one relaxation of module-split item 10.
3. **The travel request is designed with it, inside the expense module** — the 23:03Z sentence as read
   by the decision thread, not a typed ruling; she was asked to correct the reading and has not.
4. **The product supplies interfaces; an agent supplies the automation** (23:04Z).

## Decisions recorded (2026-11-17)

| When | Words |
| --- | --- |
| 2026-11-17 03:27Z | card option adopted: 「先放报销包,修好后搬回」 |

What it settles, for [hotcrm#2556](https://github.com/objectstack-ai/hotcrm/issues/2556):

1. **The project-path approval sits in the expense package for now.** The build's per-package lint
   judges a record-change flow's object against the package's own objects, not the packages its
   manifest depends on, so a PSA flow on `crm_expense` draws `flow-trigger-unknown-object`, which
   `pnpm lint --strict` fails on ([objectstack#34616](https://github.com/objectstack-ai/objectstack/issues/34616);
   the 2026-11-16 probe ran a build, not `lint --strict`, and missed it). `expense_project_approval`,
   its insert twin and their two notices are registered by the expense package, in a commit of their
   own. PSA still contributes the Project field and keeps the cost summaries. The travel request's
   project path, `expense_request_project_approval` and its insert twin
   ([hotcrm#2581](https://github.com/objectstack-ai/hotcrm/issues/2581), F3d), sits there on the same
   terms and is on the same move-back list; unlike the expense's it sends no notice and turns
   nothing back, so it takes no email template with it.
2. **They move back to PSA once objectstack#34616 ships**, on
   [hotcrm#2575](https://github.com/objectstack-ai/hotcrm/issues/2575), blocked on it and on the
   platform bump that carries it. Done on 2026-11-19 on the 18.6.0 pin; see *Measured on 2026-11-19 (hotcrm#2575)*.
3. **With PSA disabled only the manager path runs.** The Project field leaves the record, so the
   project path's entry condition is false and nothing reads the absent project; measured at runtime
   and pinned in `test/expense-module.test.ts`, and for the travel request in
   `test/expense-request.test.ts`.

| When | Words |
| --- | --- |
| 2026-11-17 05:15Z | 「出差申请用fable 综合分析，立卡开始开发」 |

What it settles, for the travel request:

4. **The travel request is a dispatched task.** The 23:03Z sentence had been recorded "as read"
   (*Decisions recorded (2026-11-16)* item 3); the 05:15Z order makes it work to build, in four
   cards, [hotcrm#2578](https://github.com/objectstack-ai/hotcrm/issues/2578) to
   [hotcrm#2581](https://github.com/objectstack-ai/hotcrm/issues/2581).
5. **The design choices are the decision thread's, reported to her, not her typed rulings.** Its
   defaults, all hotcrm-only and reversible: the object named `crm_expense_request` and labelled
   Travel Request, travel only; one estimated amount on the request, none on the itinerary lines;
   one approval tier; a request is optional for reimbursement; `cancelled` and `closed` in the status
   list from the start.

| When | Words |
| --- | --- |
| 2026-11-17 14:32Z | 「继续 报销的 AI skill（F4），让助手代填、查差标。」 |

What it settles, for the expense assistant (F4a [hotcrm#2616](https://github.com/objectstack-ai/hotcrm/issues/2616),
F4b [hotcrm#2617](https://github.com/objectstack-ai/hotcrm/issues/2617)):

6. **An assistant fills expenses and checks them against the standards** (「代填、查差标」), on the
   interfaces the product provides (2026-11-16 23:04Z). F4a stores the standards and the notes; F4b
   adds the skills.
7. **The defaults are the decision thread's, reported to her, not her typed rulings.** All
   hotcrm-only and reversible: the standards are a table of rows with an optional amount and free
   words, not one text page and not structured grade or city fields; they are advisory, and the
   product never blocks on one; finance keeps them and everyone reads them.
8. **Findings live on each expense, not on a report under approval** (F4b, ruled A by the decision
   thread on 2026-11-17 after the measurement, reported to her): the approval lock stays, and the
   approver's assistant reports in the conversation.

## Not measured

- Moving `crm_expense` between packages on an environment that installed 6.4.0. Inferred safe
  because the table name is the object name; measured inside
  [hotcrm#2556](https://github.com/objectstack-ai/hotcrm/issues/2556).
- Where "split per project on submit" lives, since the submit action belongs to a package that does
  not know projects. Measured first in [hotcrm#2559](https://github.com/objectstack-ai/hotcrm/issues/2559);
  the fallback is one report that may span projects, approved by the submitter's manager.
