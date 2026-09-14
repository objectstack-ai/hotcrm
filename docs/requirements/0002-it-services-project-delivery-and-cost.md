# REQ-0002: CRM-to-delivery process for an IT-services company — customers, leads, opportunities, project initiation, cost planning, time and cost tracking, reporting

- **Status**: Triaged
- **Source**: IT-services / software-outsourcing customer (project-based delivery, monthly timesheets, Bizcase-driven cost baselines). Handed over as a one-sheet spreadsheet, 40 numbered steps across 8 business stages, on 2026-09-14.
- **Raised**: 2026-09-14
- **Disposition**: **B standard-enhancement**, in two tracks — steps 1–14 are enhancements to objects the sales module already owns; steps 15–40 are a **new standard PSA module** designed in [`../architecture/psa-module-plan.md`](../architecture/psa-module-plan.md). Individual steps carry **C** (customer overlay) or **D** (declined/deferred) where noted below.
- **Traceability**: design — `docs/architecture/psa-module-plan.md`; changesets / PRs — to be filled in per phase.

> **Maintainer ruling on how to read this record** (2026-09-14, verbatim, untranslated):
> 「hotcrm 是标准模版，如果开发 psa 也是应该按标准产品的方向设计，不应该受限于这个 excel」
> The raw requirement below is one customer's process. The product response designs the
> standard product and maps this process onto it; it does not transcribe the process.

## Raw requirement (verbatim)

The spreadsheet's columns are 业务环节（场景）· 步骤序号 · 业务步骤 · 操作岗位 · 操作人 · 责任人 ·
系统路径 · 备注说明. Reproduced without normalisation; the customer's own line numbering
inside a cell is kept.

| 业务环节 | # | 业务步骤 | 操作岗位 | 操作人 | 责任人 | 系统路径 | 备注说明 |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 客户管理 | 1 | 新增客户基本信息录入 | 销售岗 | 销售人员 | 销售负责人 | CRM→客户管理→新增客户 | 1. 需填写客户名称、简称、社会信用代码、客户分类、组织层级、注册信息、行业、地址、企业规模等基础信息；2. 客户分类：常规销售客户、招标代理公司、其他；招标代理及其他类客户仅可用于付款回款，无法发起商机、投标、销售合同。 |
| 客户管理 | 2 | 客户联系人信息维护 | 销售岗 | 销售人员 | 销售负责人 | CRM→客户管理→客户详情→联系人维护 | 维护联系人姓名、性别、部门、职务、角色、对我司态度、与销售关系强度、联系方式等信息。 |
| 客户管理 | 3 | 客户业务信息完善 | 销售岗 | 销售人员 | 销售负责人 | CRM→客户管理→客户详情→业务信息维护 | 填写当前主要服务商、本年度 IT 采购预算、付款周期、美国 EAR 管制清单、战略合作伙伴标识等信息。 |
| 客户管理 | 4 | 客户附件上传 | 销售岗 | 销售人员 | 销售负责人 | CRM→客户管理→客户详情→附件上传 | 上传客户资质文件、合作背景资料等相关附件。 |
| 客户管理 | 5 | 客户信息审批 | 审批岗 | 销售负责人 | 销售总监 | CRM→审批中心→待审批客户 | 客户信息提交后进入审批流，审批通过后客户正式生效，可关联商机、项目。 |
| 线索管理 | 6 | 线索信息录入 | 销售 / 市场岗 | 线索跟进人 | 销售负责人 | CRM→线索管理→新增线索 | 填写线索名称、线索来源、需求类型、销售负责人、客户信息、联系人信息、客户意向说明、预计金额等。 |
| 线索管理 | 7 | 线索审批 | 审批岗 | 销售负责人 | 销售总监 | CRM→审批中心→待审批线索 | 线索对应审批流程，审批通过后方可转化为正式商机。 |
| 商机立项 | 8 | 商机跟单信息填写 | 销售岗 | 销售人员 | 销售负责人 | CRM→商机管理→新增商机→跟单信息 | 填写是否投标、可控性、赢单概率、优先级、客户立项时间、预计招标 / 签约时间及金额、商机级别、分包信息等。 |
| 商机立项 | 9 | 商机主体信息关联 | 销售岗 | 销售人员 | 销售负责人 | CRM→商机管理→商机详情→主体信息 | 关联对应客户，选择软通签约主体、业务分类、项目名称、收入确认类型等。 |
| 商机立项 | 10 | 商机背景与附件补充 | 销售岗 | 销售人员 | 销售负责人 | CRM→商机管理→商机详情→其他信息 | 填写客户简介、项目背景、风险分析、付款条款、下包说明等，上传项目相关附件。 |
| 商机立项 | 11 | 商机立项审批 | 审批岗 | 销售负责人 / 事业部审批岗 | 事业部负责人 | CRM→审批中心→待立项商机 | 销售立项需走审批流程；新增商机可跟进，立项通过后方可更新阶段、投标、赢丢单操作。 |
| 商机跟进 | 12 | 商机日常跟进维护 | 销售岗 | 销售人员 | 销售负责人 | CRM→商机管理→已立项商机→跟进记录 | 更新商机阶段、跟进情况，动态维护赢单概率、预计金额、关键节点等信息。 |
| 商机跟进 | 13 | 商机状态变更（赢单 / 弃单 / 铁三角调整） | 销售岗 | 销售人员 | 销售负责人 | CRM→商机管理→商机详情→状态变更 | 发起赢单、弃单、调整铁三角等状态变更操作，填写变更原因与说明。 |
| 商机跟进 | 14 | 商机状态变更审批 | 审批岗 | 销售负责人 | 事业部负责人 | CRM→审批中心→待审批状态变更 | 重要状态变更需审批，通过后商机状态正式生效。 |
| 售前项目立项 | 15 | 关联 CRM 商机数据 | 售前 / 销售岗 | 售前负责人 | 事业部负责人 | 项管平台→售前立项→选择 CRM 商机编码 | 售前立项必须引用客户关系系统中已审批通过的商机数据。 |
| 售前项目立项 | 16 | 项目基本信息填报 | 售前 / 销售岗 | 售前负责人 | 事业部负责人 | 项管平台→售前立项→新增售前项目 | 填写项目名称、别名、项目类型、业务分类、计划起止日期、预计合同信息等。 |
| 售前项目立项 | 17 | 项目角色配置 | 售前 / 销售岗 | 售前负责人 | 事业部负责人 | 项管平台→售前立项→项目角色设置 | 配置客户经理、项目经理、项目总监、项目 QA、资源报价负责人等角色及对应人员。 |
| 售前项目立项 | 18 | 项目成本与报价测算 | 售前 / 报价岗 | 资源报价负责人 | 事业部负责人 | 项管平台→售前立项→成本测算 | 测算人工服务成本、第三方服务成本、第三方软硬件采购成本、项目费用，生成项目报价与毛利率。 |
| 售前项目立项 | 19 | 信息安全类别设置 | 售前 / 安全岗 | 安全责任人 | 信息安全负责人 | 项管平台→售前立项→信息安全设置 | 选择信息安全类别，填写安全备注说明。 |
| 售前项目立项 | 20 | 售前立项逐级审批 | 审批岗 | 成本中心负责人→事业部负责人→Bizcase 审核岗→事业本部负责人→事业群运营负责人 | 事业群运营负责人 | 项管平台→审批中心→待审批售前立项 | 审批流程：自定义流程审批。 |
| 交付项目立项 | 21 | 关联售前立项结果 | 交付岗 | 项目经理 | 交付负责人 | 项管平台→交付立项→选择售前项目 | 交付项目立项必须选择已审批通过的售前立项作为依据。 |
| 交付项目立项 | 22 | 项目基础信息完善 | 交付岗 | 项目经理 | 交付负责人 | 项管平台→交付立项→完善项目信息 | 完善项目名称、别名、项目类型、业务分类、计划起止日期等信息。 |
| 交付项目立项 | 23 | 成本中心与核算主体配置 | 交付 / 财务岗 | 项目经理 | 财务负责人 | 项管平台→交付立项→成本中心设置 | 选择实施成本中心、核算成本中心、对应部门。 |
| 交付项目立项 | 24 | 项目角色与组织配置 | 交付岗 | 项目经理 | 交付负责人 | 项管平台→交付立项→项目角色设置 | 配置项目经理、项目总监、资源报价负责人、分包 TS 填写人、各级 QA 等角色。 |
| 交付项目立项 | 25 | 信息安全设置与附件上传 | 交付 / 安全岗 | 项目经理 | 信息安全负责人 | 项管平台→交付立项→信息安全 + 附件管理 | 设置信息安全类别，上传开工确认单等项目附件。 |
| 交付项目立项 | 26 | 交付立项审批 | 审批岗 | 各级审批岗 | 事业部负责人 | 项管平台→审批中心→待审批交付立项 | 立项提交后进入审批流程，审批通过后项目正式启动。 |
| 成本计划管理 | 27 | 预算基线导入 | 成本 / 项目岗 | 成本管理员 | 财务负责人 | 项管平台→成本计划→导入 Bizcase 预算 | 以审批通过的 Bizcase 总成本作为考核基线，形成初始项目成本计划。 |
| 成本计划管理 | 28 | 人工服务成本计划编制 | 成本 / 项目岗 | 成本管理员 | 财务负责人 | 项管平台→成本计划→人工服务成本配置 | 按岗位级别、费率标准、工时、人数测算人工成本，分解至各月度。 |
| 成本计划管理 | 29 | 第三方服务成本计划编制 | 成本 / 项目岗 | 成本管理员 | 财务负责人 | 项管平台→成本计划→第三方服务成本配置 | 按服务名称、单价、人数、工期测算第三方服务成本，分解至各月度。 |
| 成本计划管理 | 30 | 第三方软硬件采购成本计划编制 | 成本 / 项目岗 | 成本管理员 | 财务负责人 | 项管平台→成本计划→第三方软硬件成本配置 | 按采购品类、数量、单价测算软硬件采购成本。 |
| 成本计划管理 | 31 | 项目费用（差旅等）计划编制 | 成本 / 项目岗 | 成本管理员 | 财务负责人 | 项管平台→成本计划→项目费用配置 | 编制差旅、报销类项目费用预算。 |
| 成本计划管理 | 32 | 成本计划调整与审批 | 成本 / 项目岗 | 成本管理员 | 财务负责人 | 项管平台→成本计划→预算调整→提交审批 | 预算不足时申请追加，填写调整原因、差异分析，走审批流程。 |
| 成本执行管理 | 33 | 月度工时填报（TS 填写） | 全体项目人员 | 项目参与人员 | 项目经理 | 项管平台→工时填写→TS 月度填写→选择对应项目 | 1. 销售填写售前项目 TS，交付填写交付项目 TS；2. 按实际出勤填报工时，请假、加班申请同步后自动更新。 |
| 成本执行管理 | 34 | 工时审批 | 审批岗 | 项目经理 | 部门负责人 | 项管平台→工时审批→待审批工时 | 工时提交后由项目经理审批，通过后计入项目实际成本。 |
| 成本执行管理 | 35 | 差旅成本填报 | 项目人员 | 项目参与人员 | 项目经理 | 项管平台→成本执行→差旅报销→关联项目 | 差旅成本按项目归集，与人力成本对应，凭报销单据录入系统。 |
| 成本执行管理 | 36 | 成本超支预警与管控 | 成本 / 管理岗 | 成本管理员 | 财务负责人 | 项管平台→成本执行→成本监控 | 系统实时累计项目成本，成本超预算时限制工时填报，触发成本风险预警。 |
| 项目报表管理 | 37 | 项目综合信息查询 | 项目 / 管理岗 | 项目相关人员 | 项目经理 | 项管平台→项目报表→项目综合查询 | 可查询项目基本信息、预算、成本、进度、收入、开票、收款等全维度数据。 |
| 项目报表管理 | 38 | 项目财务数据查询 | 财务 / 项目岗 | 财务人员 / 项目经理 | 财务负责人 | 项管平台→项目报表→财务数据查询 | 查询项目合同额、总成本、毛利率、开票金额、收款金额等财务指标。 |
| 项目报表管理 | 39 | 项目成本跟踪监控 | 成本 / 管理岗 | 成本管理员 | 财务负责人 | 项管平台→项目报表→成本跟踪查询 | 监控预算执行率、成本消耗进度，对比基线与实际成本差异。 |
| 项目报表管理 | 40 | 项目合同与订单查询 | 商务 / 项目岗 | 商务人员 | 商务负责人 | 项管平台→项目报表→合同订单查询 | 查询销售合同、采购合同、订单执行情况。 |

## Standard product analysis

The spreadsheet describes **two systems**. Its own 系统路径 column says so: steps 1–14 run in
"CRM", steps 15–40 in "项管平台" (a project-management platform). The first is a sales
process on objects HotCRM already owns; the second is Professional Services Automation —
project initiation, staffing, cost planning against an approved baseline, time and expense
capture, cost-versus-budget control and project financial reporting — which HotCRM has no
objects for at all. The customer is a project-based IT-services business, and that half of
the process is the generic shape of the whole category, not one company's quirk.

**Sales half (steps 1–14), against `src/objects/`.**

- `crm_account` has name, type, industry, revenue, headcount, structured address, parent
  account and tiering; it has no registration / tax identifier, no category that *restricts
  what the account may do* (the "招标代理 may pay but may not open an opportunity" rule), no
  business-profile block (incumbent vendor, IT budget, payment cycle), and no approval —
  an account is live on save. Attachments already exist (`enable.files`).
- `crm_contact` has name, department, title, channels and a primary flag; it has no
  decision-map attributes (role in the buying centre, attitude to us, relationship strength).
- `crm_lead` has source, status, rating, conversion and duplicate handling; it has no
  need-type, no estimated amount, and no approval gate on conversion.
- `crm_opportunity` has stage, amount, probability, forecast category, a **tiered amount
  approval** (`src/flows/opportunity-approval.flow.ts`) and win/loss reasons; it has no bid
  flag, controllability, priority, level, customer-side milestone dates, subcontracting
  fields, background / risk / payment-terms narrative, and no approval on *status change*
  (won, abandoned) — only on amount.
- Every approval the customer names lands in the platform approval inbox HotCRM already
  mounts; the gap is which records enter it, not where it is.

**Delivery half (steps 15–40).** No project, staffing, rate, budget, timesheet or expense
object exists. Two standing rulings shape what can be built: HotCRM models no orders,
invoices or payments (2026-08-02, `src/flows/billing-handoff.flow.ts`), and HotCRM is a pure
metadata application, so every mechanism must be a platform construct — `approval` flow
nodes, `sys_business_unit` for cost centres and departments, `sys_user` for people,
`enable.files` for attachments.

## Disposition & rationale

**B — standard enhancement, two tracks.** The burden of proof for entering the standard
product is met differently by each half:

- **Track A — sales-module enhancements (steps 1–14).** Each gap is a general B2B-sales
  primitive, not this customer's structure: an account registration identifier and an
  account category that gates capabilities; a buying-centre map on contacts; need-type and
  estimated value on leads; bid / priority / level on opportunities and an approval on
  status change. What is **C** in this track: the signing-entity list (软通签约主体), the
  revenue-recognition vocabulary, the US EAR flag, and the "铁三角" role model — one
  company's org and compliance shape. Track A is **not designed here**; it is filed as its
  own records so each gap gets its own triage rather than riding this one.
- **Track B — the PSA module (steps 15–40).** Designed as a standard module in
  [`../architecture/psa-module-plan.md`](../architecture/psa-module-plan.md), landing as
  `app.objectstack.hotcrm.psa` under ADR-0130 inside the HotCRM artifact. The step-by-step
  mapping, with each step's B / C / D verdict and the reason, is the table *Mapping REQ-0002
  onto the standard model* in that document; the verdicts in short:
  - **C (customer overlay)**: the five-step named approval chain of step 20; the
    organisation-specific role titles in steps 17 and 24; any "opportunity stage may not
    advance until the project is approved" coupling (an `objectExtensions` validation on
    `crm_opportunity` in the overlay, never in core).
  - **D (declined / deferred)**: leave-and-overtime synchronisation into timesheets (an HR
    system's data — revisit when a declarative connector instance for it exists, ADR-0097);
    invoicing and collection figures in steps 37–38 and purchase contracts / orders in step
    40 (the 2026-08-02 ruling: billing is an external system's job; revisit only if that
    ruling is revisited).
  - Everything else is **B**, on the standard constructs the design names.

**Re-triage triggers.** A second customer asking for a multi-level *named* initiation chain
promotes a configurable approval-chain shape from C to B; a second customer asking for
project invoicing reopens the billing-scope ruling rather than this record.

## Product response

- **B (Track B)** — the metadata, phasing and acceptance are the design document's; nothing
  is restated here. Phase 0 (the ADR-0130 composition proof) needs the maintainer decisions
  listed at the end of that document before it opens.
- **B (Track A)** — to be filed as REQ-0003 onward, one record per object, each carrying its
  own standard-versus-overlay split.
- **C** — an overlay package on top of HotCRM, owned by the customer engagement, carrying
  the named approval chain, the role-title picklist values and the opportunity coupling.
- **D** — recorded above with the ruling each rests on and the trigger that reopens it.

## Acceptance

- Track B: each phase's acceptance row in the design document, culminating in a delivery
  project that moves from an approved opportunity through initiation approval, a baseline
  budget, approved monthly timesheets and expenses, to a project record whose actual cost,
  variance and gross margin are computed — demonstrated on `pnpm dev` and recorded with a
  browser pass, `pnpm verify` green, one changeset per PR.
- Track A: per its own records.
- This record is closed as **Shipped** when Track B Phase 4 is on `main`; the C and D items
  stay recorded on it as the answer given.
