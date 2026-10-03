# REQ-0006: Opportunity qualification fields, the deal narrative block, and approval on status change

- **Status**: Triaged
- **Source**: IT-services / software-outsourcing customer — the same one-sheet spreadsheet handed over on 2026-09-14 and triaged as [REQ-0002](0002-it-services-project-delivery-and-cost.md). This record takes its steps **8 · 9 · 10 · 11 · 12 · 13 · 14**.
- **Raised**: 2026-09-14
- **Disposition**: **B standard-enhancement** for `crm_opportunity`. Three items inside it stay **C** (customer overlay), carried over from REQ-0002 and ⛔ not re-decided here.
- **Traceability**: parent record — [REQ-0002](0002-it-services-project-delivery-and-cost.md); changeset / PR — to be filled in when built.

> **Why this record exists.** REQ-0002's *Product response* rules Track A as: "**B (Track A)** —
> to be filed as REQ-0003 onward, one record per object, each carrying its own
> standard-versus-overlay split." This is that record for `crm_opportunity` — the largest slice
> of Track A, seven of its fourteen steps.

## Raw requirement (verbatim)

Steps 8 through 14 of REQ-0002's table, reproduced from that record **without change** — the
customer's own wording and punctuation. ⛔ Not normalised, ⛔ not translated.

| 业务环节 | # | 业务步骤 | 操作岗位 | 操作人 | 责任人 | 系统路径 | 备注说明 |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 商机立项 | 8 | 商机跟单信息填写 | 销售岗 | 销售人员 | 销售负责人 | CRM→商机管理→新增商机→跟单信息 | 填写是否投标、可控性、赢单概率、优先级、客户立项时间、预计招标 / 签约时间及金额、商机级别、分包信息等。 |
| 商机立项 | 9 | 商机主体信息关联 | 销售岗 | 销售人员 | 销售负责人 | CRM→商机管理→商机详情→主体信息 | 关联对应客户，选择软通签约主体、业务分类、项目名称、收入确认类型等。 |
| 商机立项 | 10 | 商机背景与附件补充 | 销售岗 | 销售人员 | 销售负责人 | CRM→商机管理→商机详情→其他信息 | 填写客户简介、项目背景、风险分析、付款条款、下包说明等，上传项目相关附件。 |
| 商机立项 | 11 | 商机立项审批 | 审批岗 | 销售负责人 / 事业部审批岗 | 事业部负责人 | CRM→审批中心→待立项商机 | 销售立项需走审批流程；新增商机可跟进，立项通过后方可更新阶段、投标、赢丢单操作。 |
| 商机跟进 | 12 | 商机日常跟进维护 | 销售岗 | 销售人员 | 销售负责人 | CRM→商机管理→已立项商机→跟进记录 | 更新商机阶段、跟进情况，动态维护赢单概率、预计金额、关键节点等信息。 |
| 商机跟进 | 13 | 商机状态变更（赢单 / 弃单 / 铁三角调整） | 销售岗 | 销售人员 | 销售负责人 | CRM→商机管理→商机详情→状态变更 | 发起赢单、弃单、调整铁三角等状态变更操作，填写变更原因与说明。 |
| 商机跟进 | 14 | 商机状态变更审批 | 审批岗 | 销售负责人 | 事业部负责人 | CRM→审批中心→待审批状态变更 | 重要状态变更需审批，通过后商机状态正式生效。 |

## Standard product analysis

Measured on `main` (`9f13c77`) with
`grep -oE "^    [a-z_]+: Field\.[a-zA-Z]+" src/sales/objects/opportunity.object.ts`:
`crm_opportunity` declares **23 fields**. The roster stays in the metadata and is ⛔ not
transcribed here; what follows names only the fields these seven steps turn on.

**Already there.** 赢单概率 is `probability` (derived in `opportunity.hook.ts` from
`stage → STAGE_PROBABILITY`, one source of truth). 预计金额 is `amount`, with `expected_revenue`
derived beside it. 关联对应客户 is `crm_account`, 项目名称 is `name`, and `primary_contact`
anchors the deal to a person. 商机阶段 is `stage`, with `stage_entry_date` and the `days_in_stage`
formula for step 12's 跟进情况, plus a platform activity timeline: `trackHistory` on `stage`
renders each change, and `activityMilestones` emits a semantic entry on `closed_won` /
`closed_lost`. 赢单/弃单原因 is `win_reason` / `loss_reason` / `loss_details` (step 13's
变更原因与说明). 附件 (step 10) is `enable.files: true` — **no gap**. Legal stage moves are already
constrained by a `type: 'state_machine'` validation on `stage`, and `approval_status` /
`approved_date` already exist.

**Missing.**

1. **The qualification block (step 8).** 是否投标 (do we bid), 可控性 (how controllable the deal
   is), 优先级 (priority) and 商机级别 (deal level/grade) have no fields. `forecast_category` is
   the closest thing and answers a different question — it is the forecast roll-up bucket, not
   a judgement about whether to pursue, and it is derived from `stage`.
2. **Customer-side milestone dates and amounts (step 8).** 客户立项时间, 预计招标时间, 预计签约时间
   and the amounts attached to them have no fields. `close_date` is a single date — *our*
   expected close — so the customer's own procurement calendar, which is what an
   outsourcing seller actually plans against, is unrecorded.
3. **Subcontracting (steps 8 and 10).** 分包信息 and 下包说明 have no field anywhere in
   `src/sales/`.
4. **The narrative block (step 10).** 客户简介, 项目背景, 风险分析, 付款条款 have no fields. The
   object has exactly two prose fields: `description` (markdown) and `next_step` (textarea).
   Everything the customer wants to write about the deal today collapses into `description`.
5. **业务分类 (step 9).** `type` exists but its four values are a *relationship* taxonomy
   (`new_business` / `existing_upgrade` / `existing_renewal` / `existing_expansion`), not a
   business-line classification. Partial, not absent — see the disposition.
6. **Approval on qualification and on status change (steps 11 and 14).** The only approval this
   app authors is `src/sales/flows/opportunity-approval.flow.ts`, and it is keyed on **amount**:
   manager review at `>= $100K`, director sign-off `> $500K`, stamping `approval_status`. Two
   different gates are missing. Step 11 wants 立项 approval that **gates stage advancement**
   (「立项通过后方可更新阶段、投标、赢丢单操作」), and step 14 wants approval of the **status change
   itself** (won / abandoned). Today a $10K deal moves straight to `closed_won` with no approval
   at all, and the `state_machine` validation that constrains transitions is `severity:
   'warning'` — it does not refuse the write.

## Disposition & rationale

**B — standard enhancement.** The qualification judgements, the customer-side calendar, the
narrative block and approval-on-status-change are all general B2B deal management; what is
specific to this customer is *vocabulary and org*, and that stays out of core.

- **B · The qualification block.** Bid/no-bid, controllability, priority and deal level are the
  standard qualification vocabulary of any seller that cannot pursue every deal — they are how a
  pipeline is triaged, and they exist independently of IT services. Core ships the fields with
  generic values; a customer's own grading scale is configuration.
- **B · Customer-side milestone dates.** Any considered purchase has a buyer-side calendar —
  budget approval, tender, signature — that is not the same as our forecast close date.
  Recording it is what lets a seller plan; a single `close_date` cannot carry three distinct
  events.
- **B · Subcontracting.** Services deals are routinely partly delivered by someone else, and
  the margin depends on it. The *fact* of subcontracting is generic; the customer's supplier
  list is not, and is not proposed here.
- **B · The narrative block.** Customer background, project background, risk analysis and
  payment terms are the standard deal-review narrative. Splitting them out of one
  `description` field is what makes them reviewable, templatable and (later) reportable.
- **B · Approval on status change, and on qualification.** This is the most valuable primitive
  in this record. HotCRM already accepts that deals need sign-off — it just keys it on size
  only. The general rule is that **the transitions that matter are the irreversible ones**:
  declaring a deal won or abandoned moves forecast, commission and headcount planning, and it
  is the one transition `stage`'s own state machine makes terminal (`closed_won: []`,
  `closed_lost: []`). An approval keyed only on amount cannot see it. Per REQ-0002: "Every
  approval the customer names lands in the platform approval inbox HotCRM already mounts; the
  gap is which records enter it, not where it is." **Both gates must be configurable — off by
  default**, so existing installs keep today's amount-only behaviour.
- **B (partial) · 业务分类.** `type` is not the right field to overload — its values are a
  relationship taxonomy and `opportunity.hook.ts` / reporting read them. A separate business-line
  classification field is generic (every multi-line-of-business seller has one); the customer's
  own line-of-business values are configuration on top of it.

**C — carried over from REQ-0002, ⛔ not re-decided here.** Quoted verbatim from that record's
*Disposition & rationale*: "What is **C** in this track: the signing-entity list (软通签约主体),
the revenue-recognition vocabulary, the US EAR flag, and the '铁三角' role model — one company's
org and compliance shape."

- **C · 软通签约主体 (step 9).** The signing-entity list is one company's legal-entity
  structure.
- **C · 收入确认类型 (step 9).** The revenue-recognition vocabulary is that company's finance
  policy — and HotCRM models no orders, invoices or payments at all (the 2026-08-02 ruling
  recorded in REQ-0002).
- **C · 铁三角 role model (step 13's 铁三角调整).** A named three-role deal-team model is one
  company's org shape. Note the boundary: the **customer-side** buying-centre map is **B** and
  is filed as [REQ-0004](0004-contact-buying-centre-map.md); this C is about **our own** deal
  team.
- **C · The named approval chains** (步骤 11 的 销售负责人 / 事业部审批岗 → 事业部负责人, 步骤 14 的
  销售负责人 → 事业部负责人). Core ships *that* the transition is gated; who signs, in what order,
  is the customer's org chart — the same verdict REQ-0002 gives the five-step chain of step 20.

All C items land in an overlay / extension package on top of HotCRM (framework ADR-0005 /
ADR-0048, base metadata protected by ADR-0010), ⛔ never committed into HotCRM core.

## Product response

**B — the standard metadata to add / change under `src/sales/`.** Named, not designed; expect
more than one PR, each with its own changeset and `pnpm verify`.

- `src/sales/objects/opportunity.object.ts`
  - a **qualification group** (new `fieldGroups` entry): bid flag (boolean), controllability,
    priority and deal level (ordered selects, generic values from the shared picklist style in
    `src/sales/objects/_picklists.ts`);
  - **customer-side milestone dates** in the `sales_process` group — customer initiation,
    expected tender, expected signing — each a `Field.date`, ⛔ never folded into `close_date`;
    the amounts that go with them are `Field.currency`;
  - **subcontracting** — a flag plus a note, in the qualification group;
  - a **narrative group**: customer background, project background, risk analysis, payment
    terms, subcontracting note — `Field.markdown` / `Field.textarea` per field, ⛔ not more
    prose crammed into `description`;
  - a **business-line classification** select, beside `type` and ⛔ not replacing it.
  - Every field opts in with `group: '<key>'` so the form layout stays **derived** — ⛔ no
    `record:details` sections, ⛔ no `form.sections` enumeration (AGENTS.md: escape hatches are
    for the extreme, customer-demanded case only).
- `src/sales/flows/` — the two gates are `approval` nodes in flows, the construct
  `opportunity-approval.flow.ts` already uses; the implementing PR decides whether they extend
  that flow or land beside it, and ⛔ must keep the single-source-of-truth property its
  docstring records (no double-firing). ⛔ There is no `workflow` metadata type and no
  standalone `ApprovalProcess`.
- The stage-advancement gate is a **transition gate, not an invariant** (AGENTS.md metadata
  semantics rule 7): deals that predate the rule keep their stage; what is refused is the next
  move. Every `record.x` read in an authored predicate carries `has(record.x)` (AGENTS.md —
  validation predicates must be TOTAL).
- ⚠️ `opportunity-approval.flow.ts` is `runAs: 'system'` for a measured reason recorded in its
  own docstring — a gate that only engages for logged-in writers is not a control. Any new gate
  inherits that lesson; and elevation stays as small as it can be (AGENTS.md metadata semantics
  rule 9).
- Ships with the four locale packs (`src/sales/translations/{en,zh-CN,es-ES,ja-JP}.ts`) — label,
  every option label — and a user-facing page under `content/docs/` explaining qualification and
  the approval gates. Business concepts, ⛔ never a hand-copied field roster.

**C** — an overlay package owned by the customer engagement: signing entity, revenue-recognition
type, the 铁三角 deal-team role model, and the named approval chains.

**Not in this record** — steps 1 / 3 / 4 / 5 are
[REQ-0003](0003-account-registration-category-and-approval.md), step 2 is
[REQ-0004](0004-contact-buying-centre-map.md), steps 6–7 are
[REQ-0005](0005-lead-need-type-value-and-approval.md), steps 15–40 are REQ-0002's Track B
(the PSA module) and ⛔ nothing here anticipates them.

## Acceptance

This record is satisfied when, on a HotCRM install with no overlay:

1. An opportunity form renders a qualification group and a narrative group from `fieldGroups`
   alone, carrying bid flag, controllability, priority, deal level, subcontracting, the
   customer-side milestone dates and amounts, and the four narrative fields.
2. The customer-side dates are reportable independently of `close_date` — a list view can show
   "deals whose tender is expected this quarter" without touching the forecast close date.
3. With the status-change gate switched on, moving a deal to `closed_won` or `closed_lost`
   opens an approval request in the inbox HotCRM already mounts and the stage does not change
   until it is decided; with it off (the default), the existing amount-tiered behaviour of
   `opportunity-approval.flow.ts` is bit-for-bit what it is today.
4. A gate opened by a writer with no session still engages — the measured failure recorded in
   `opportunity-approval.flow.ts`'s docstring does not recur.
5. Signing entity and revenue-recognition type have **no field in core at all**, and the
   business-line classification field ships with generic values only — the customer's own
   line-of-business list, entity list and 铁三角 roles come from the overlay.
6. `pnpm verify` green — including `test/object-validation-predicates.test.ts` — and a changeset
   per PR, each naming `REQ-0006`.
