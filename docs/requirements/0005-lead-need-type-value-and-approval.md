# REQ-0005: Need type and estimated value on the lead, and an approval gate before conversion

- **Status**: Triaged
- **Source**: IT-services / software-outsourcing customer — the same one-sheet spreadsheet handed over on 2026-09-14 and triaged as [REQ-0002](0002-it-services-project-delivery-and-cost.md). This record takes its steps **6 · 7**.
- **Raised**: 2026-09-14
- **Disposition**: **B standard-enhancement** for `crm_lead`. No **C** item in this record.
- **Traceability**: parent record — [REQ-0002](0002-it-services-project-delivery-and-cost.md); changeset / PR — to be filled in when built.

> **Why this record exists.** REQ-0002's *Product response* rules Track A as: "**B (Track A)** —
> to be filed as REQ-0003 onward, one record per object, each carrying its own
> standard-versus-overlay split." This is that record for `crm_lead`.

## Raw requirement (verbatim)

Steps 6 and 7 of REQ-0002's table, reproduced from that record **without change** — the
customer's own wording and punctuation. ⛔ Not normalised, ⛔ not translated.

| 业务环节 | # | 业务步骤 | 操作岗位 | 操作人 | 责任人 | 系统路径 | 备注说明 |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 线索管理 | 6 | 线索信息录入 | 销售 / 市场岗 | 线索跟进人 | 销售负责人 | CRM→线索管理→新增线索 | 填写线索名称、线索来源、需求类型、销售负责人、客户信息、联系人信息、客户意向说明、预计金额等。 |
| 线索管理 | 7 | 线索审批 | 审批岗 | 销售负责人 | 销售总监 | CRM→审批中心→待审批线索 | 线索对应审批流程，审批通过后方可转化为正式商机。 |

## Standard product analysis

Measured on `main` (`9f13c77`) with
`grep -oE "^    [a-z_]+: Field\.[a-zA-Z]+" src/sales/objects/lead.object.ts`: `crm_lead` declares
**36 fields** — the widest object in the sales package. The roster stays in the metadata and is
⛔ not transcribed here; what follows names only the fields these two steps turn on.

**Step 6 — 线索信息录入.** Most of the noun list is already covered. 线索名称 is the
`display_title` formula (`first_name last_name - company`); 线索来源 is `lead_source`, on the
canonical shared picklist; 销售负责人 is `owner_id`, the platform ownership anchor the routing
flow (`src/sales/flows/lead-assignment.flow.ts`) already writes; 客户信息 is `company` +
`company_normalized` + `industry` + `annual_revenue` + `number_of_employees` + `address`;
联系人信息 is `first_name` / `last_name` / `title` / `email` / `phone` / `mobile`; 客户意向说明
is `description` and `notes`. Qualification and hygiene are richer than the step asks for —
`status`, `rating`, `disqualification_reason`, and the whole duplicate block
(`duplicate_of_type` / `duplicate_of_lead` / `duplicate_of_contact` / `duplicate_status`).

Two gaps.

1. **需求类型 — what the prospect needs.** No field. `industry` says what the prospect *is*,
   `lead_source` says where they came from, `type` does not exist on the lead at all
   (`crm_opportunity` has one; `crm_lead` does not). Nothing records *what they are asking
   for*, so leads cannot be routed, reported or prioritised by demand.
2. **预计金额 — the estimated value of the demand.** No field. `annual_revenue` is the prospect
   **company's own** turnover, which is a size signal, not a deal size — and it is the value
   `lead-conversion.flow.ts` copies onto the account it creates, so it is already spoken for.
   Today the first number that describes the deal appears only after conversion, on
   `crm_opportunity.amount`: the conversion screen collects an `opportunityAmount` variable,
   and before that moment the pipeline has no value at all.

**Step 7 — 线索审批.** No approval exists anywhere on the lead. `status` has five values
(`new` / `contacted` / `qualified` / `unqualified` / `converted`) and none of them means
"approved"; conversion runs through the `convert_lead` action → `lead_conversion` screen flow,
and the action is deliberately visible on **any** open lead — its `visible` predicate excludes
only already-converted and unqualified leads. The only `type: 'approval'` nodes this app
authors are the two amount tiers inside `src/sales/flows/opportunity-approval.flow.ts`, on the
opportunity. So today any owner can convert at any time; the customer requires
「审批通过后方可转化为正式商机」.

## Disposition & rationale

**B — standard enhancement.** All three items are general pipeline primitives.

- **B · 需求类型.** "What does this prospect want" is the most basic segmentation a lead
  carries after its source. Every CRM install routes, scores and reports on it; the *values* are
  industry vocabulary and belong in configuration, but the **slot** is generic. Core ships the
  field with a generic starter set; a customer's own demand taxonomy is overlay configuration
  the same way `industry` values are.
- **B · 预计金额.** Pipeline value before conversion is standard: without it, lead-stage
  forecasting, prioritisation ("work the big ones first") and the conversion screen's own
  prefill have no source. It also fixes a real asymmetry in this app — the conversion flow
  already asks a human to type a deal amount into `opportunityAmount`; that number should come
  **from the lead**, not be invented at the moment of conversion.
- **B · An approval gate before conversion.** The generic requirement is not "our sales
  director signs leads off"; it is **conversion is an irreversible, pipeline-affecting act and
  should be gateable**. `convert_lead`'s own source already says so in its comment about
  confirmation — it calls conversion "an IRREVERSIBLE action". A lead becomes an account, a
  contact and an opportunity in one step; once converted, `is_converted` is true and the
  `convert_lead` action hides itself. Any organisation with more than one seller wants control
  over what enters the pipeline as a real deal, and the platform approval inbox HotCRM already
  mounts is where it lands (REQ-0002: "Every approval the customer names lands in the platform
  approval inbox HotCRM already mounts; the gap is which records enter it, not where it is.").
  **The gate must be configurable — off by default.** A single-seller install must not be
  forced through an approval to convert a lead.

**No C in this record.** Nothing in steps 6–7 names this customer's org, vocabulary or
compliance shape. For contrast, REQ-0002's Track A **C** list, quoted verbatim: "the
signing-entity list (软通签约主体), the revenue-recognition vocabulary, the US EAR flag, and the
'铁三角' role model — one company's org and compliance shape." None of it is here. What *would*
be C is the customer's concrete 需求类型 value list and their named 销售负责人 → 销售总监 chain —
both configuration on top of the generic shape this record files, not core.

## Product response

**B — the standard metadata to add / change under `src/sales/`.**

- `src/sales/objects/lead.object.ts`
  - a **need-type** select in the `qualification` group, generic starter values, authored in
    the shared picklist style (`src/sales/objects/_picklists.ts`);
  - an **estimated amount** `Field.currency`, in the same group, ⛔ never conflated with
    `annual_revenue` — the two answer different questions and `lead_conversion` already copies
    the latter onto the account;
  - an approval-state field of the shape `crm_opportunity.approval_status` already uses
    (`readonly: true`, a real `defaultValue`, ⛔ not only an option-level `default: true` —
    `status`'s own comment records why). ⛔ Do **not** add an "approved" value to `status`:
    that select is a qualification lifecycle, and overloading it would break the
    `convert_lead` predicate and the seeded data.
- `src/sales/flows/` — the approval itself is an `approval` node in a flow, the construct
  `opportunity-approval.flow.ts` already uses. ⛔ There is no `workflow` metadata type and no
  standalone `ApprovalProcess`.
- The gate on conversion is a **transition gate, not an invariant** (AGENTS.md metadata
  semantics rule 7): leads that predate the rule are not bricked; what is refused is the
  *conversion* of an unapproved lead. Two surfaces have to agree, and the implementing PR owns
  deciding whether both are authored: `convert_lead`'s `visible` predicate (so the button is
  not offered) and the write path itself (so the API cannot route around the button). Every
  `record.x` read carries `has(record.x)` (AGENTS.md — validation predicates must be TOTAL);
  `convert_lead`'s existing predicate is the worked example of the fail-closed arrangement.
- `lead_conversion`'s `opportunityAmount` / `opportunityName` screen fields prefill from the
  lead's new estimated amount rather than starting blank.
- Ships with the four locale packs (`src/sales/translations/{en,zh-CN,es-ES,ja-JP}.ts`) — label,
  every option label — and a user-facing page under `content/docs/` explaining when a lead
  needs approval. Business concepts, ⛔ never a hand-copied field roster.

**Not in this record** — steps 1 / 3 / 4 / 5 are
[REQ-0003](0003-account-registration-category-and-approval.md), step 2 is
[REQ-0004](0004-contact-buying-centre-map.md), steps 8–14 are
[REQ-0006](0006-opportunity-qualification-and-status-approval.md), steps 15–40 are REQ-0002's
Track B.

## Acceptance

This record is satisfied when, on a HotCRM install with no overlay:

1. A lead carries a need type and an estimated amount, both filterable and groupable in a lead
   list view, and both visible on the lead form from `fieldGroups` alone.
2. Converting a lead prefills the deal amount from the lead's estimated amount instead of an
   empty box.
3. With the gate switched on, an unapproved lead offers no Convert button **and** a direct API
   conversion attempt is refused; with it off (the default), conversion behaves exactly as it
   does today.
4. A lead that predates the rule, already converted, is untouched — no existing record is
   invalidated by the new gate.
5. `pnpm verify` green — including `test/object-validation-predicates.test.ts`, which fails the
   build on any un-`has()`-guarded predicate — and one changeset naming `REQ-0005`.
