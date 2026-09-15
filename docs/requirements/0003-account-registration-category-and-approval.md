# REQ-0003: Account registration identifier, a category that gates capability, the business-profile block, and account approval

- **Status**: Triaged
- **Source**: IT-services / software-outsourcing customer — the same one-sheet spreadsheet handed over on 2026-09-14 and triaged as [REQ-0002](0002-it-services-project-delivery-and-cost.md). This record takes its steps **1 · 3 · 4 · 5**, the ones whose 系统路径 is 客户管理.
- **Raised**: 2026-09-14
- **Disposition**: **B standard-enhancement** for `crm_account`. Two items inside it stay **C** (customer overlay) and one is **A** (already supported); each is called out below.
- **Traceability**: parent record — [REQ-0002](0002-it-services-project-delivery-and-cost.md); changeset / PR — to be filled in when built.

> **Why this record exists.** REQ-0002's *Product response* rules Track A as: "**B (Track A)** —
> to be filed as REQ-0003 onward, one record per object, each carrying its own
> standard-versus-overlay split." This is that record for `crm_account`. The C and D verdicts
> REQ-0002 already gave are **quoted**, ⛔ never re-decided here.

## Raw requirement (verbatim)

Steps 1, 3, 4 and 5 of REQ-0002's table, reproduced from that record **without change** — the
customer's own wording, line numbering inside a cell, and punctuation. ⛔ Not normalised, ⛔ not
translated.

| 业务环节 | # | 业务步骤 | 操作岗位 | 操作人 | 责任人 | 系统路径 | 备注说明 |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 客户管理 | 1 | 新增客户基本信息录入 | 销售岗 | 销售人员 | 销售负责人 | CRM→客户管理→新增客户 | 1. 需填写客户名称、简称、社会信用代码、客户分类、组织层级、注册信息、行业、地址、企业规模等基础信息；2. 客户分类：常规销售客户、招标代理公司、其他；招标代理及其他类客户仅可用于付款回款，无法发起商机、投标、销售合同。 |
| 客户管理 | 3 | 客户业务信息完善 | 销售岗 | 销售人员 | 销售负责人 | CRM→客户管理→客户详情→业务信息维护 | 填写当前主要服务商、本年度 IT 采购预算、付款周期、美国 EAR 管制清单、战略合作伙伴标识等信息。 |
| 客户管理 | 4 | 客户附件上传 | 销售岗 | 销售人员 | 销售负责人 | CRM→客户管理→客户详情→附件上传 | 上传客户资质文件、合作背景资料等相关附件。 |
| 客户管理 | 5 | 客户信息审批 | 审批岗 | 销售负责人 | 销售总监 | CRM→审批中心→待审批客户 | 客户信息提交后进入审批流，审批通过后客户正式生效，可关联商机、项目。 |

## Standard product analysis

Measured on `main` (`9f13c77`) with
`grep -oE "^    [a-z_]+: Field\.[a-zA-Z]+" src/sales/objects/account.object.ts`: `crm_account`
declares **25 fields**. The roster itself lives in the metadata and is ⛔ not transcribed here;
what follows names only the fields each step turns on.

**Step 1 — 基础信息.** Most of the list is already there. 客户名称 is `name` (with
`name_normalized` for matching and the `display_title` formula `account_number + " - " + name`
as the record title); 行业 is `industry`; 地址 is the structured `billing_address` +
`billing_country` + `office_location`; 企业规模 is `number_of_employees` and `annual_revenue`;
组织层级 is the self-lookup `parent_account`, plus `child_account_revenue` rolling up over it.
客户分类 has a field, `type` — four options, `prospect` / `customer` / `partner` / `former`.

Two gaps.

1. **No registration or tax identifier.** Nothing on the object carries a
   government-registry number. `account_number` is a `Field.autonumber` — our own sequence,
   issued by us, and already spent as half of the record title; it is not the counterparty's
   registered identity and cannot be made to be.
2. **The category classifies, it does not gate.** The customer's rule is not that the category
   exists but that it *restricts what the account may do* — 「招标代理及其他类客户仅可用于付款回款，
   无法发起商机、投标、销售合同」. Today nothing reads `type` to permit or deny anything: the object
   declares no `validations[]` and no `requiredWhen` / `readonlyWhen` / `visibleWhen`, and the two
   places in `src/sales/` that touch the value both only **write** it or branch on it for
   promotion (`account.hook.ts`, and `opportunity.hook.ts` flipping a won deal's account to
   `customer`). An opportunity can be opened against any account of any type.

**Step 3 — 业务信息.** 当前主要服务商 (incumbent vendor), 本年度 IT 采购预算 (the budget the
customer will spend with vendors this year) and 付款周期 (payment cycle) have no field.
`annual_revenue` is the account's **own** revenue, not what it spends with us, so it answers
none of the three. 战略合作伙伴标识 is the exception — see **A** below. 美国 EAR 管制清单 is **C**
— see below.

**Step 4 — 附件.** **No gap.** `account.object.ts` already declares `enable.files: true`, with
the attach/download/delete authority inherited from the record; 客户资质文件 and 合作背景资料 land
there today with no new metadata.

**Step 5 — 客户信息审批.** No approval exists on `crm_account`. `is_active` is a plain
`Field.boolean` with `defaultValue: true`, so an account is live the moment it is saved; the
only `type: 'approval'` nodes this app authors are the two amount tiers inside
`src/sales/flows/opportunity-approval.flow.ts`. The customer's requirement is not merely a
status field but a **gate**: 审批通过后客户正式生效，可关联商机、项目.

## Disposition & rationale

**B — standard enhancement**, because every gap above is a general B2B-sales primitive rather
than this customer's structure.

- **B · A registration / tax identifier.** Every B2B CRM has to hold the counterparty's legal
  registered identity — it is what invoicing, credit checks, duplicate detection and
  entity resolution key on. ⛔ **The standard field is not named after one country's registry.**
  The customer says 社会信用代码 because they register in China; a Japanese install would say
  法人番号, a German one Handelsregisternummer, a US one EIN. The core shape must carry any of
  them, so the field is a generic registration identifier (and, if a second is needed, a
  registry/type discriminator beside it) — ⛔ never a `unified_social_credit_code`.
- **B · A category that gates capability.** This is the most valuable primitive in this record
  and it generalises well beyond this customer: *some counterparties are payable but not
  sellable*. Agencies, resellers-of-record, tender intermediaries, intra-group entities and
  dormant accounts all want "keep the record, refuse the deal". The gate belongs in core
  because a category no rule reads is prose, and the rule is the point (AGENTS.md metadata
  semantics rule 8 — a value a person wrote down may block a write).
- **B · The business-profile block** — incumbent vendor, annual purchasing budget, payment
  cycle. Generic B2B sales intelligence: who holds the account today, how much there is to win,
  and how the customer pays. Nothing about it is IT-services-specific.
- **B · Account approval.** "A record is in draft until someone signs it off, and only a
  signed-off record may be referenced downstream" is standard CRM data governance, not one
  company's process. What is C is *who* approves and in how many steps — see below.
- **A · 战略合作伙伴标识 — already supported.** `type` already carries a `partner` value, and
  `tier` / `segment` carry relationship weight. No new core field. **Re-triage trigger → B:** if
  the customer means a distinct contractual partner programme with its own lifecycle rather
  than a classification, re-open this item on its own record.
- **C · The named category values.** 招标代理公司 as a shipped picklist value is one
  company's market vocabulary. Core ships the *capability-restricting category* with generic
  values; the customer's own value list is overlay configuration (framework ADR-0005 /
  ADR-0048), ⛔ never committed into HotCRM core.
- **C · 美国 EAR 管制清单.** Already decided by REQ-0002 and ⛔ not re-decided here. Quoted
  from its *Disposition & rationale*: "What is **C** in this track: the signing-entity list
  (软通签约主体), the revenue-recognition vocabulary, **the US EAR flag**, and the '铁三角' role
  model — one company's org and compliance shape."
- **C · The approval chain's shape.** REQ-0002 puts "the five-step named approval chain" in the
  overlay for Track B; the same logic holds here. Core ships *that an account is approved*; a
  named 销售负责人 → 销售总监 chain is the customer's org chart.

## Product response

**B — the standard metadata to add / change under `src/sales/`.** Named, not designed; each
lands with its own changeset and `pnpm verify`.

- `src/sales/objects/account.object.ts`
  - a registration-identifier field (country-neutral name and label), in the `basic` group,
    `searchableFields`-eligible so it can be looked up;
  - a capability-gating category — either new options on `type` or a field beside it, decided
    when built; whichever it is, **something must read it**;
  - the business-profile fields (incumbent vendor, annual purchasing budget, payment cycle),
    in a new `fieldGroups` entry so the layout stays derived (AGENTS.md — escape hatches are
    for extreme cases);
  - an approval-state field of the shape `crm_opportunity.approval_status` already uses
    (`readonly: true`, a real `defaultValue`), ⛔ not a second boolean beside `is_active`.
- The gate itself is a **transition gate, not an invariant** (AGENTS.md metadata semantics rule
  7): existing opportunities on a now-restricted account are not bricked; what is refused is the
  *new* link. Authored as a `validations[]` entry on `crm_opportunity` reading its account's
  category, with every `record.x` read carrying `has(record.x)` (AGENTS.md — validation
  predicates must be TOTAL).
- The approval is an `approval` node inside a `record_change` flow under `src/sales/flows/`,
  the construct `opportunity-approval.flow.ts` already uses. ⛔ There is no `workflow`
  metadata type and no standalone `ApprovalProcess`.
- Ships with the four locale packs (`src/sales/translations/{en,zh-CN,es-ES,ja-JP}.ts`) and a
  user-facing page under `content/docs/`, per the constraint checklist.

**A** — 战略合作伙伴标识: set `type = partner` / use `tier`, no change.

**C** — an overlay package on top of HotCRM, owned by the customer engagement: the customer's
category value list (招标代理公司 …), the EAR control-list flag, and the named approval chain.

**Not in this record** — steps 2, 6–7 and 8–14 are [REQ-0004](0004-contact-buying-centre-map.md),
[REQ-0005](0005-lead-need-type-value-and-approval.md) and
[REQ-0006](0006-opportunity-qualification-and-status-approval.md); steps 15–40 are REQ-0002's
Track B.

## Acceptance

This record is satisfied when, on a HotCRM install with no overlay:

1. An account can be created carrying a registration identifier whose label and name name no
   single country's registry, and the value is findable from global search / the lookup picker.
2. An account whose category is the restricted one **cannot** be linked to a new opportunity —
   the write is refused with the rule's own message — while opportunities that already point at
   it keep working and keep being editable.
3. The business-profile fields render as their own group on the account form without any
   `record:details` section being authored.
4. A newly created account sits in a pending state, appears in the platform approval inbox
   HotCRM already mounts, and only reaches the approved state through a decision on that
   request; 附件 needs no change (step 4 is already supported).
5. `pnpm verify` green, one changeset naming `REQ-0003`, and the four locale packs plus a
   `content/docs/` page updated.
