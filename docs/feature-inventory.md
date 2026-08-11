# HotCRM 功能清单(Feature Inventory)

> 本文档回答"这个系统有哪些功能",是测试、文档、分诊工作的共同参照(测试技能 #1043 是第一个消费方)。
> 依据仓库 `src/` 元数据逐项清点产出(参见 #1052),不是凭记忆或旧文档手写。
> 最后清点日期:2026-08-07。

## 使用与维护规则

- **编号是稳定的**:每个功能点有一个 `域前缀-三位数` 编号(如 `LEA-004`)。编号只增不改——
  功能被移除时保留行并标注"已移除 (#issue)",新功能追加在所在域的末尾,**不要重排**。
- **锚点即真相**:每行的实现锚点指向定义该功能的源文件。当本文与源码冲突时,以源码为准,
  并请顺手修订本文(单独的 docs PR 或与实现同 PR 均可)。
- **一行一个功能点**:名称 + 一句话描述 + 锚点。设计细节、历史沿革请查锚点文件内注释,
  或 `src/docs/`(业务规则手册)与 `docs/ARCHITECTURE.md`。

## 域前缀索引

| 前缀 | 业务能力域 | 前缀 | 业务能力域 |
| --- | --- | --- | --- |
| LEA | 线索 | KB | 知识库 |
| ACC | 客户与联系人 | MKT | 营销活动 |
| OPP | 商机与管道 | FCT | 预测与销售业绩 |
| QUO | 报价(CPQ 与产品目录) | ACT | 任务与活动 |
| CON | 合同 | APR | 审批 |
| SVC | 服务与 SLA | PRM | 权限与共享 |
| | | ADM | 管理与设置 |

## 总览统计(清点时点)

17 个业务对象(`crm_*`,含 4 个联结/明细对象)· 21 个流程文件(23 个流程定义)·
26 个已注册 action · 14 个视图文件 · 8 个页面 · 5 个仪表板 · 10 个报表 ·
9 个数据集(语义层)· 6 个 profile · 9 条共享规则 · 12 个扁平岗位 · 6 个 AI 技能 ·
4 种语言 · 3 个导入映射 · 19 个种子数据集。

---

## LEA — 线索

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| LEA-001 | 线索对象 | 未鉴定潜客档案(`crm_lead`):身份/公司/鉴定/转化/查重等 10 个字段组,1–5 整星评分,私有共享 | `src/objects/lead.object.ts` |
| LEA-002 | 线索状态机 | `new → contacted → qualified → unqualified → converted` 转换表(warning 级),converted 为终态、unqualified 可回 new | `src/objects/lead.object.ts`(validations) |
| LEA-003 | 失格原因强制 | status=unqualified 必填 `disqualification_reason`;以 duplicate 失格必须指定幸存记录且人工确认 | `src/objects/lead.object.ts`(validations) |
| LEA-004 | 自动线索评分 | 未显式给分时按企业邮箱/电话/职位/行业/规模/营收加权计算 rating(1–5 整星) | `src/objects/lead.hook.ts`(`lead_automation`) |
| LEA-005 | 轮询自动派单 | 无主线索按"未转化线索最少"分配给 `sales_rep` 岗位人员池,失败不阻断插入 | `src/objects/lead.hook.ts`(`lead_auto_assign`) |
| LEA-006 | Web-to-Lead 公开表单 | 匿名表单 `/forms/contact-us`(`allowAnonymous`),hook 补访客默认值并剥离伪造的转化/归属/查重字段 | `src/views/lead.view.ts`(`web_to_lead`)+ `src/objects/lead.hook.ts` |
| LEA-007 | 规范化与软性查重 | 邮箱小写化、公司名归一化(`company_normalized`);插入时按邮箱先查联系人后查线索,命中标 `suspected` | `src/objects/lead.hook.ts`(`lead_duplicate_check`) |
| LEA-008 | 已转换线索锁定 | 转化后除叙述字段外冻结,引用字段置空按"链接不可清除"报错(级联删除误报修复) | `src/objects/lead.hook.ts`(`lead_automation`) |
| LEA-009 | 鉴定合格自动建任务 | status 变为 qualified 时自动创建 +2 天到期的 high 跟进任务给线索 owner | `src/objects/lead.hook.ts`(`lead_automation`) |
| LEA-010 | 线索转化向导 | 屏幕流:账户按归一化名去重复用、联系人按邮箱去重、可选建商机、回写转化字段并通知操作者 | `src/flows/lead-conversion.flow.ts` + `src/actions/lead.actions.ts`(`convert_lead`) |
| LEA-011 | 新线索路由 SLA | 新建即路由:热线索(rating≥4)1 天跟进期限并发热线索告警,普通线索 3 天 | `src/flows/lead-assignment.flow.ts` |
| LEA-012 | 排定跟进 | 屏幕流收集下一步动作/到期日/类型/优先级,创建任务并同步线索 `next_followup_date` | `src/flows/schedule-followup.flow.ts` + `src/actions/lead.actions.ts`(`schedule_followup`) |
| LEA-013 | 批量加入活动 | 列表多选批量动作:逐行去重后插入活动成员(记录选择器选活动) | `src/actions/lead.actions.ts`(`create_campaign`) |
| LEA-014 | 线索列表视图族 | 默认列表 + 7 个具名视图:我的/热线索/高优/疑似重复/状态看板/日历/卡片 | `src/views/lead.view.ts` |
| LEA-015 | 线索表单族 | 8 个具名表单覆盖全部布局类型:快速新建/分 tab 详情/转化向导/分栏/抽屉/弹窗/公开表单/条件示范 | `src/views/lead.view.ts`(formViews) |
| LEA-016 | 线索详情页 | header 挂转化/跟进/三个活动动作,highlights 条,5 阶段 path,Details/Related/Activity/History 四 tab | `src/pages/lead_detail.page.ts` |
| LEA-017 | AI 线索鉴定技能 | 按 BANT 四维打 0–100 分并给下一步建议;≥70 且经人工确认才调用转化动作 | `src/skills/lead-qualification.skill.ts` |
| LEA-018 | 线索导入 | CSV/XLSX 导入映射,按 email upsert,状态/来源/行业同义词表;owner 留空归导入者 | `src/mappings/lead_import.mapping.ts` |
| LEA-019 | 线索分析 | `lead_metrics` 数据集 + "线索互动月份×来源"矩阵报表 | `src/datasets/lead.dataset.ts` + `src/reports/lead.report.ts` |

## ACC — 客户与联系人

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| ACC-001 | 客户对象 | 公司主档(`crm_account`):类型/行业/财务、客户成功字段(tier/segment/health_score/续约)、logo/品牌色/地理位置,启用附件 | `src/objects/account.object.ts` |
| ACC-002 | 客户名唯一与匹配键 | `name` 租户内唯一;hook 维护 `name_normalized`(小写+折叠空白)作为线索转化的账户去重键 | `src/objects/account.object.ts` + `src/objects/account.hook.ts` |
| ACC-003 | 区域派生 | 从 `billing_address.country` 投影扁平列 `billing_country`(大写 trim),并按唯一映射表分类为 `territory` 选择列表(`na`/`emea`/`other`),供区域共享规则下推过滤 | `src/objects/_territory.ts` + `src/objects/account.hook.ts` |
| ACC-004 | 客户保护 | 网址须以 http(s) 开头、营收非负;有开放商机的 customer 禁止删除 | `src/objects/account.hook.ts` |
| ACC-005 | 客户活动时钟 | `last_activity_date` 由多路写入:owner/type 变更、held 事件与完成任务冒泡、工单解决;是流失分析的信号源 | `src/objects/account.hook.ts` 等 |
| ACC-006 | 客户列表视图族 | 默认列表 + 卡片/地图/大客户/我的/续约/风险 7 个 tab;批量改 tier、转移 owner、批量删除 | `src/views/account.view.ts` |
| ACC-007 | 客户工作台 | ADR-0047 interface page:引用 `all_accounts` 视图的策展列表,仅行业/类型/负责人三个快速筛选,锁定 grid、禁新建 | `src/pages/account_workbench.page.ts` |
| ACC-008 | 客户详情页 | slotted 页:覆盖 header(三个活动动作)与 discussion(评论/表情/提及全开的 chatter)两个 slot,其余由默认页合成 | `src/pages/account_detail.page.ts` |
| ACC-009 | 联系人对象 | 自然人档案(`crm_contact`):masterDetail 挂客户(删客户级联删联系人),email 租户内唯一,头像、汇报关系、沟通偏好 | `src/objects/contact.object.ts` |
| ACC-010 | 联系人完整性 | 邮箱小写化并全局查重;被开放商机/未结报价/激活合同引用的联系人禁止删除 | `src/objects/contact.hook.ts` |
| ACC-011 | 设为主联系人 | 记录/行菜单 script 动作,置 `is_primary: true` | `src/actions/contact.actions.ts`(`mark_primary`) |
| ACC-012 | 发送邮件 | 收集主题/正文,写入 `sys_email` 队列 + `sys_activity` 时间线,并更新联系人/客户互动时间;email_opt_out 时隐藏 | `src/actions/contact.actions.ts`(`send_email`) |
| ACC-013 | 联系人欢迎通知 | 新建联系人(未退订)时通知其 owner(inbox+email) | `src/flows/contact-welcome.flow.ts` |
| ACC-014 | 联系人列表视图 | 按客户分组的默认列表(头像列)、头像封面的名录 gallery、主联系人过滤视图 | `src/views/contact.view.ts` |
| ACC-015 | 客户/联系人导入 | 两个 CSV 映射:客户按 name upsert(支持同文件父客户自解析)、联系人按 email upsert(须先有客户);owner 按邮箱 lookup | `src/mappings/account_import.mapping.ts` + `src/mappings/contact_import.mapping.ts` |
| ACC-016 | AI Customer 360 技能 | 聚合客户、工单、商机与知识文章,产出"客户快照/进行中工作/风险与备注"三段式档案 | `src/skills/customer-360.skill.ts` |
| ACC-017 | AI 邮件起草技能 | 基于真实联系人数据起草个性化邮件(两个主题行变体),展示草稿后交人工发送 | `src/skills/email-drafting.skill.ts` |
| ACC-018 | 客户分析 | `account_metrics`/`contact_metrics` 数据集、行业×类型矩阵报表、客户流失信号联合报表(30/60/90 天静默窗口) | `src/datasets/account.dataset.ts`、`src/reports/account.report.ts`、`src/reports/churn.report.ts` |

## OPP — 商机与管道

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| OPP-001 | 商机对象 | 管道交易(`crm_opportunity`):必填名称/客户/金额/阶段/关闭日,主联系人级联筛选,竞争对手、赢/输单原因,启用附件 | `src/objects/opportunity.object.ts` |
| OPP-002 | 七阶段状态机 | `prospecting → … → negotiation → closed_won/closed_lost` 转换表;closed_won 必填 win_reason、closed_lost 必填 loss_reason | `src/objects/opportunity.object.ts`(validations) |
| OPP-003 | 阶段驱动派生 | 阶段是唯一真值源:自动同步 `probability`、`expected_revenue`(金额×概率)、`forecast_category`(pipeline/best_case/commit/closed/omitted) | `src/objects/opportunity.hook.ts`(`opportunity_lifecycle`) |
| OPP-004 | 阶段龄时钟 | 阶段变更即重置 `stage_entry_date`,公式列 `days_in_stage` 展示停留天数(停滞扫描按存储列过滤) | `src/objects/opportunity.hook.ts` + `src/objects/opportunity.object.ts` |
| OPP-005 | 已关闭商机冻结 | 关闭后除叙述与审批字段外禁改;赢单未给关闭日时自动补今天 | `src/objects/opportunity.hook.ts` |
| OPP-006 | 赢单后置动作 | 赢单后把客户 type 升级为 customer,并创建 +3 天到期的"激活新客户"任务 | `src/objects/opportunity.hook.ts`(`opportunity_promote_account`) |
| OPP-007 | 商机行项目与金额汇总 | 明细对象(`crm_opportunity_line_item`,受父控共享、删商机级联):从原始列重算并回写商机 `amount`,已关闭商机跳过、空行集不清零 | `src/objects/opportunity_line_item.object.ts` + `.hook.ts` |
| OPP-008 | 行项目价格填充 | 选择产品即填充 `list_price`,插入时空 `unit_price` 默认为目录价(不覆盖已谈判价);商机/报价行共用一份工厂 | `src/objects/_line-item-price-fill.ts` |
| OPP-009 | 销售管道看板 | `pipeline_kanban`:按阶段分列、列头按金额汇总、拖拽推进、640px 抽屉,排除已关闭交易;导航有直达入口 | `src/views/opportunity.view.ts` + `src/apps/crm.app.ts`(`nav_pipeline`) |
| OPP-010 | 商机视图族 | 默认"Open Deals" + 我的/全量/关闭日日历/timeline/卡片/停滞(按阶段龄排序)/本季关单(预测类别+季度窗口)共 9 个 tab | `src/views/opportunity.view.ts` |
| OPP-011 | 批量更新阶段 | 全仓唯一聚合式批量动作:整个选择集一次 dispatch(`_selectedIds`),全有或全无,失败 id 汇总报错 | `src/actions/opportunity.actions.ts`(`mass_update_stage`) |
| OPP-012 | 克隆商机 | 复制客户/联系人/金额/来源等为新 prospecting 商机,关闭日重置为 +90 天 | `src/actions/opportunity.actions.ts`(`clone_opportunity`) |
| OPP-013 | 停滞商机日扫描 | 每日 07:30 扫描阶段停留 >14 天的开放商机:通知 owner 并幂等创建 +2 天跟进任务 | `src/flows/opportunity-stagnation.flow.ts` |
| OPP-014 | 大单赢单告警 | 金额 >$100K 的商机赢单时通知 owner(防重发) | `src/flows/opportunity-won-alert.flow.ts` |
| OPP-015 | 私密商机 | `is_private` 标记的交易经 RLS 仅对 owner 可见,即使读方持全组织读权限 | `src/profiles/sales-manager.profile.ts`、`src/profiles/marketing-user.profile.ts`(RLS) |
| OPP-016 | 商机详情页 | header 挂生成报价/克隆/三个活动动作,7 阶段 path,Related 含报价/产品明细/任务三个相关列表 + 侧栏 reference rail | `src/pages/opportunity_detail.page.ts` |
| OPP-017 | 商机分析 | `opportunity_metrics` 数据集(win_rate 派生比率、跨对象行业维度)+ 阶段/按人赢单/管道覆盖矩阵/漏斗 4 个报表 | `src/datasets/opportunity.dataset.ts` + `src/reports/opportunity.report.ts` |

## QUO — 报价(CPQ 与产品目录)

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| QUO-001 | 报价对象 | 正式报价单(`crm_quote`):QTE-{0000} 自动编号,定价字段组(subtotal/discount/tax/shipping/total),条款与双地址,启用附件 | `src/objects/quote.object.ts` |
| QUO-002 | 报价状态机 | `draft → in_review → presented → accepted/rejected/expired`;accepted/expired 终态,rejected 可回 draft 重报 | `src/objects/quote.object.ts`(validations) |
| QUO-003 | 报价默认与冻结 | 未给失效日时默认 `quote_date + 30 天`;accepted/expired 后除内部备注外禁改 | `src/objects/quote.hook.ts`(`quote_workflow`) |
| QUO-004 | 从商机生成报价 | 屏幕流收集名称/有效期/折扣,按商机金额播种报价定价,并把早期阶段商机推进到 proposal | `src/flows/quote-generation.flow.ts` + `src/actions/opportunity.actions.ts`(`generate_quote`) |
| QUO-005 | 接受报价→起草合同 | status 变 accepted 时自动创建 draft 合同(12 个日历月,合同额=报价总价);无联系人时给出具名报错 | `src/objects/quote.hook.ts`(`quote_on_accepted`) |
| QUO-006 | 接受报价→商机赢单 | 同一 hook 的独立第二条腿:关联商机置 closed_won、补关闭日与 `win_reason='quote_accepted'` | `src/objects/quote.hook.ts`(`quote_on_accepted`) |
| QUO-007 | 报价行项目与总额汇总 | 明细对象(`crm_quote_line_item`,受父控、删报价级联,行级税率公式):重算 subtotal/discount_amount/total_price 回写报价,已结报价跳过 | `src/objects/quote_line_item.object.ts` + `.hook.ts` |
| QUO-008 | 报价自动过期 | 每日 01:00 把过了 `expiration_date` 的未结报价置 expired | `src/flows/quote-expiration.flow.ts` |
| QUO-009 | 报价视图 | 状态看板(按 total_price 汇总)、报价日→失效日日历、总额汇总列表 | `src/views/quote.view.ts` |
| QUO-010 | 产品目录对象 | `crm_product`:PRD-{0000} 编号、SKU 租户唯一、类别/产品族/计费类型/计量单位、定价与库存、图片与 PDF datasheet,全组织可读 | `src/objects/product.object.ts` |
| QUO-011 | 产品目录保护 | `list_price ≥ cost` 硬校验、SKU 自动大写;被任何行项目引用的产品禁删(用 `is_active=false` 退役) | `src/objects/product.hook.ts` |
| QUO-012 | 产品视图 | 按类别分组列表、产品图封面 gallery 目录、低库存(≤10)标红视图 | `src/views/product.view.ts` |
| QUO-013 | 产品分析 | `product_metrics` 数据集(按类别的数量与目录价汇总) | `src/datasets/product.dataset.ts` |

## CON — 合同

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| CON-001 | 合同对象 | 法律协议(`crm_contract`):CTR-{0000} 编号即标题,必填客户/联系人/期限/起止日/合同额,签署与计费字段,私有共享,启用附件 | `src/objects/contract.object.ts` |
| CON-002 | 合同状态机 | `draft → in_approval → activated → expired/terminated`;两个终态,续约=新建合同而非复活旧行 | `src/objects/contract.object.ts`(validations) |
| CON-003 | 期限一致性校验 | 起止日与 `contract_term_months` 偏差 >1 个月即拒绝;激活后禁止缩短 `end_date`(应走终止/变更) | `src/objects/contract.hook.ts`(`contract_validation`) |
| CON-004 | 激活后置动作 | 激活时补 `signed_date`(如未填)并把客户升级为 customer | `src/objects/contract.hook.ts`(`contract_on_activation`) |
| CON-005 | 合同自动过期 | 每日 00:00 把过了 `end_date` 的 activated 合同置 expired 并通知 owner | `src/flows/contract-expiration.flow.ts` |
| CON-006 | 续约提醒与自动续约 | 每日 08:00 按每份合同的 `renewal_notice_days` 幂等创建续约任务并通知;`auto_renewal` 合同自动开出续约商机(proposal,金额=合同额) | `src/flows/contract-renewal.flow.ts` |
| CON-007 | 合同视图 | 到期日日历、合同期 gantt、按客户分组的季度 timeline、按最快到期排序的列表 | `src/views/contract.view.ts` |

## SVC — 服务与 SLA

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| SVC-001 | 工单对象 | 支持工单(`crm_case`):CASE-{00000} 租户内唯一编号,四档优先级、七状态、来源渠道、父工单,客户签名/五星评分/反馈,启用附件 | `src/objects/case.object.ts` |
| SVC-002 | 工单状态机 | 每个开放状态都可达 escalated 与 closed;resolved/closed 可重开;关闭必填 resolution | `src/objects/case.object.ts`(validations) |
| SVC-003 | SLA 时限计算 | 每张工单首次落库时按「优先级 × 账户 tier」矩阵写 `sla_due_date`(日历小时;critical 各 tier 均 4 小时) | `src/objects/case.hook.ts`(`case_sla_defaults`)、`src/objects/_case-sla.ts` |
| SVC-004 | 优先级排序落地 | `priority_rank`(critical=4…low=1,未知=0)供队列按紧急度排序,与任务侧哨兵一致 | `src/objects/case.hook.ts` |
| SVC-005 | Web-to-Case 公开表单 | 匿名表单 `/forms/support`;hook 判定访客提交,补默认值并剥离 owner/升级/关闭/内部备注字段 | `src/views/case.view.ts`(`web_to_case`)+ `src/objects/case.hook.ts` |
| SVC-006 | 关闭指标 | 关闭时打 `closed_date` 并计算 `resolution_time_hours`;`is_closed` 由状态派生 | `src/objects/case.hook.ts` |
| SVC-007 | Critical 即时升级 | record 流(update+create 孪生):critical 工单自动标升级、置 escalated、通知 owner(critical 级);只标记不改派 | `src/flows/case-escalation.flow.ts` |
| SVC-008 | SLA 每小时违约扫描 | 过期未结工单标 `is_sla_violated`、升级并通知 owner(topic `case_sla_breach`) | `src/flows/case-sla-monitor.flow.ts` |
| SVC-009 | 升级派发跟进任务 | 升级时的唯一任务产出点:给客户负责人创建次日到期的 urgent 跟进任务;解决时更新客户活动时钟 | `src/objects/case.hook.ts`(`case_status_side_effects`) |
| SVC-010 | 手动升级/关闭工单 | 两个屏幕流动作:升级必填原因并置 critical;关闭必填解决方案(系统身份写只读生命周期字段) | `src/flows/case-actions.flow.ts` + `src/actions/case.actions.ts` |
| SVC-011 | CSAT 关单回访 | 工单关闭 1 天后通知 owner 联系客户记录满意度评分 | `src/flows/case-csat-followup.flow.ts` |
| SVC-012 | 首次响应打戳 | 工单上出现任何一条 held 互动事件时,自动补 `first_response_date`(SLA 首次响应指标) | `src/objects/event.hook.ts`(`event_activity_bubble`) |
| SVC-013 | 工单视图族 | 默认按优先级序排 + 状态看板(抽屉)/SLA 日历/timeline/已升级/SLA 风险/我的未结共 7 个 tab | `src/views/case.view.ts` |
| SVC-014 | 工单详情页 | SLA highlights 条、6 阶段 path、升级/关闭/记录通话动作,统一活动时间线(评论/提及/线程/表情全开) | `src/pages/case_detail.page.ts` |
| SVC-015 | 工单升级共享 | critical 未结工单自动共享给 service_manager(可编辑)与 service_director(只读) | `src/sharing/case.sharing.ts` |
| SVC-016 | 工单时间线里程碑 | 声明式里程碑:escalated/resolved/closed 三个状态转换自动发时间线条目 | `src/objects/case.object.ts`(activityMilestones) |
| SVC-017 | AI 工单分诊技能 | 只读技能:建议优先级并给出唯一驱动理由,把用户指向升级/关闭按钮(刻意无变更工具) | `src/skills/case-triage.skill.ts` |
| SVC-018 | 服务分析 | 服务仪表板(60s 刷新、SLA 达标仪表盘、10 widget)+ `case_metrics` 数据集 + 状态×优先级/SLA/开单日矩阵 3 个报表 | `src/dashboards/service.dashboard.ts`、`src/datasets/case.dataset.ts`、`src/reports/case.report.ts` |

## KB — 知识库

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| KB-001 | 知识文章对象 | `crm_knowledge_article`:KA-{0000} 编号,全组织可读,分类/多选标签/语言标记,受众开关(public/internal),可回链来源工单 | `src/objects/knowledge_article.object.ts` |
| KB-002 | 审核发布生命周期 | `draft → in_review → published → archived`,`archived → published` 重新上架是承认的合法回路 | `src/objects/knowledge_article.object.ts` |
| KB-003 | 发布门槛 | 无正文禁止发布(error);无摘要发布告警(摘要供搜索结果与 AI 引用) | `src/objects/knowledge_article.object.ts`(validations) |
| KB-004 | 发布时间戳 | 首次发布写 `published_at`(重新上架不重置,导入可带历史日期);处于已发布态的写入刷新 `last_reviewed_at` | `src/objects/knowledge_article.hook.ts` |
| KB-005 | 参与度指标 | `view_count`/`helpful_count`/`not_helpful_count` 只读计数字段 | `src/objects/knowledge_article.object.ts` |
| KB-006 | 知识库视图 | 已发布按浏览量、我的草稿(draft+in_review)、复审队列(published 按 `last_reviewed_at` 最旧优先)、按分类分组全量 | `src/views/knowledge_article.view.ts` |
| KB-007 | 知识库权限面 | 服务坐席可建/改(无删,归档留给管理员),销售只读,匿名访客一律拒绝(门户走 `allowAnonymous` 视图而非放宽对象读) | `src/profiles/service-agent.profile.ts`、`src/profiles/guest-portal.profile.ts` |

## MKT — 营销活动

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| MKT-001 | 活动对象 | 市场活动(`crm_campaign`):CPG-{0000} 编号,类型/渠道,预算四件套与 `response_rate`/`roi` 公式,父活动层级,全组织可读 | `src/objects/campaign.object.ts` |
| MKT-002 | 活动校验 | 结束日须晚于开始日、进入 in_progress 须起止日齐备、实际成本超预算告警 | `src/objects/campaign.hook.ts` + validations |
| MKT-003 | 活动成员联结对象 | `crm_campaign_member`:挂 Lead 或 Contact(二选一强制),7 状态响应生命周期(sent→…→converted/bounced/unsubscribed),受父活动控共享;人物删除级联(GDPR) | `src/objects/campaign_member.object.ts` |
| MKT-004 | 批量入组线索 | 屏幕流:按状态筛选未转化、有邮箱、未退订的线索(上限 1000),去重后批量插入成员并盖 `added_date` | `src/flows/campaign-enrollment.flow.ts` + `src/actions/campaign.actions.ts`(`enroll_leads`) |
| MKT-005 | 活动指标快照 | 活动完成时一次性经成员表归因统计:入组数/响应数/线索数/转化数/商机数/赢单数/实际营收 | `src/objects/campaign.hook.ts`(`campaign_snapshot_metrics`) |
| MKT-006 | 活动自动完结 | 每日 02:00 把过了 `end_date` 的 in_progress 活动置 completed(随后触发指标快照) | `src/flows/campaign-completion.flow.ts` |
| MKT-007 | 活动时间可视化 | 全仓唯一同时具备 gantt/calendar/timeline 三种时间视图的对象 | `src/views/campaign.view.ts` |
| MKT-008 | 营销协作权限 | planning/in_progress 活动共享给营销经理/总监(可编辑);marketing_user 经 RLS 放宽可编辑他人活动与系统创建的成员行 | `src/sharing/campaign.sharing.ts` + `src/profiles/marketing-user.profile.ts` |

## FCT — 预测与销售业绩

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| FCT-001 | 预测对象 | `crm_forecast`:按 owner×期间(月/季)的管道快照,四个累计金额桶 + quota,`attainment_pct`/`coverage_ratio`/`expected_amount` 公式,私有共享 | `src/objects/forecast.object.ts` |
| FCT-002 | 期间族派生 | 写入时自动派生 `period_start`/`period_end`/`period_label`(如 "Q3 2026")与 `snapshot_date`,杜绝期间边界漂移 | `src/objects/forecast.hook.ts` |
| FCT-003 | 夜间预测快照 | 每日 03:00 为每个有活跃商机的 owner upsert 当季快照并累加四桶(pipeline/best_case/commit/closed);quota 保持手工维护 | `src/flows/forecast-snapshot.flow.ts` |
| FCT-004 | 预测类别累计桶 | 桶边界即 `crm_opportunity.forecast_category` 存储列(由阶段派生),与商机视图和仪表板共用同一定义 | `src/objects/forecast.object.ts` + `src/objects/opportunity.hook.ts` |
| FCT-005 | 预测视图 | 本季度视图(period+period_start 双条件钉死单一快照)、我的预测、按期间分组的金额汇总列表 | `src/views/forecast.view.ts` |
| FCT-006 | AI 营收预测技能 | 分析管道健康度、暴露风险交易,按加权值(金额×概率)给出带区间的营收预测并可视化 | `src/skills/revenue-forecasting.skill.ts` |
| FCT-007 | 销售业绩仪表板 | 17 个 widget:管道/QTD 赢单/赢率三件套、按预测类别管道、按人配额达成与赢率、输单原因、阶段×来源透视表 | `src/dashboards/sales.dashboard.ts` |
| FCT-008 | 高管与 CRM 总览仪表板 | 高管版(YTD 营收、行业分布、获客节奏,9 widget)与全员总览版(营收/管道/来源,9 widget) | `src/dashboards/executive.dashboard.ts`、`src/dashboards/crm.dashboard.ts` |
| FCT-009 | 预测数据集 | `forecast_metrics`(attainment 派生比率);度量跨期间不可加,消费方必须钉期间(构建期测试强制) | `src/datasets/forecast.dataset.ts` |
| FCT-010 | 业绩报表入口 | 管道覆盖矩阵/线索流入/SLA 三份高信号报表直达导航;完整报表目录仍作为元数据出货 | `src/apps/crm.app.ts`(`group_insights`) |

## ACT — 任务与活动

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| ACT-001 | 任务对象 | 待办(`crm_task`):五路多态关联(账户/联系人/商机/线索/工单),优先级与 `priority_rank`,提醒时间校验,进度与工时 | `src/objects/task.object.ts` |
| ACT-002 | 任务完成语义 | 进入 completed 自动补 `completed_date`、进度置 100;维护 `is_completed`/`is_overdue` 布尔 | `src/objects/task.hook.ts`(`task_completion`) |
| ACT-003 | 重复任务生成器 | 完成时按 daily/weekly/monthly/yearly×间隔克隆下一期(月末日期 clamp 防漂移),超过 `recurrence_end_date` 终止 | `src/objects/task.hook.ts`(`task_recurrence`) |
| ACT-004 | 任务到期提醒 | 每小时扫描 `reminder_date` 已到的未完成任务,通知 owner 并清空提醒时间去重 | `src/flows/task-due-reminder.flow.ts` |
| ACT-005 | 紧急任务告警 | 新建 urgent 任务即刻通知 owner(warning 级) | `src/flows/task-urgent-alert.flow.ts` |
| ACT-006 | 任务视图族 | 8 个 tab:未完成看板、到期日历、带进度条的 gantt(全仓唯一)、按人 worklog timeline、我的/高优/积压队列 | `src/views/task.view.ts` |
| ACT-007 | 事件对象 | 日历时段互动记录(`crm_event`):类型/状态(planned/held/cancelled/no_show)、起止时间与时长自动派生、五路多态关联 | `src/objects/event.object.ts` + `.hook.ts`(`event_schedule_derive`) |
| ACT-008 | 事件参与者联结对象 | `crm_event_attendee`:异构参与者(联系人/线索/内部用户/外部客人),响应状态与组织者标记,受父事件控共享;人物删除级联 | `src/objects/event_attendee.object.ts` |
| ACT-009 | 活动记录动作家族 | 15 个动作(记录通话/记录会议/安排会议 × 线索/联系人/客户/商机/工单):建真实事件+参与者行+`sys_activity` 时间线条目 | `src/actions/global.actions.ts` |
| ACT-010 | 互动 recency 冒泡 | held 事件与完成任务向上冒泡(含经联系人/商机/工单走到父客户):写客户 `last_activity_date` 与联系人/线索 `last_contacted_date` | `src/objects/event.hook.ts` + `src/objects/task.hook.ts`(activity bubble) |
| ACT-011 | 事件日历 | 全局日历 + 我的日历(全仓唯一双日历对象)、按人泳道的团队 timeline、即将进行/互动历史队列 | `src/views/event.view.ts` |
| ACT-012 | 活动导航与仪表板 | 独立 Activity 导航组(事件/日历/互动历史);活动仪表板 13 widget 含 30/60/90 天静默客户计数 | `src/apps/crm.app.ts`(`group_activity`)+ `src/dashboards/activity.dashboard.ts` |
| ACT-013 | 活动数据集 | `event_metrics`(周分桶、面客分钟数)与 `task_metrics`(逾期/进度) | `src/datasets/event.dataset.ts`、`src/datasets/task.dataset.ts` |

## APR — 审批

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| APR-001 | 大额商机两级审批 | >$100K 触发销售经理审批,>$500K 追加销售总监签字(create/update 孪生流,ADR-0019 approval 节点) | `src/flows/opportunity-approval.flow.ts` |
| APR-002 | 审批行为语义 | first_response(先响应者决定)、审批期间锁记录、`approval_status` 字段实时镜像审批状态 | `src/flows/opportunity-approval.flow.ts` |
| APR-003 | 审批结果处置 | 通过写 `approved_date` 并通知 owner;拒绝置 rejected 并通知修改后重提(warning 级) | `src/flows/opportunity-approval.flow.ts` |
| APR-004 | 空审批人兜底 | 审批岗位无人在职时 `onEmptyApprovers: 'admin_rescue'` 挂起等管理员接管,不搁死记录 | `src/flows/opportunity-approval.flow.ts` |
| APR-005 | 审批收件箱 | Approvals 导航组的 Inbox 入口(`sys_approval_request`,带对象存在性守卫) | `src/apps/crm.app.ts`(`group_approvals`) |

## PRM — 权限与共享

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| PRM-001 | 六个 profile 权限矩阵 | system_admin/sales_rep/sales_manager/service_agent/marketing_user/guest_portal,显式允许制,覆盖全部业务对象 | `src/profiles/` |
| PRM-002 | Guest Portal | 匿名访客仅可创建 lead 与 case(服务两个公开表单),零读取、零编辑、无导出位 | `src/profiles/guest-portal.profile.ts` |
| PRM-003 | 字段级安全 | 如 `annual_revenue`/`health_score` 对销售只读、`crm_case.internal_notes` 对销售完全遮蔽、坐席可读写 | `src/profiles/*.profile.ts`(fieldPermissions) |
| PRM-004 | 导出权限闸门 | `allowExport` 是真实闸门(未设即拒):仅在有读权限且视图提供导出界面的五个对象上授予,服务端 `canExport` 把关 | `src/profiles/index.ts` |
| PRM-005 | 所有权转移轴 | `allowTransfer` 控制把记录种到/改到他人名下:管理员全量、经理随 modifyAll、坐席仅在任务上窄授权(工单升级派单所需) | `src/profiles/index.ts` |
| PRM-006 | 九条条件共享规则 | 客户团队(customer→经理可编辑)、NA/EU 区域(按 `territory`)、活动领导层、工单升级、大单(≥$100K→总监/高管只读) | `src/sharing/` |
| PRM-007 | 扁平岗位结构 | 12 个岗位(销售/服务/营销三线 + NA/EU 区域组),无层级、可见性不向上滚动,每个层级各带自己的授权 | `src/sharing/positions.ts` |
| PRM-008 | 行级安全(RLS) | 私密商机仅 owner 可见(经理与营销两份 select 规则);营销对活动/成员的 update 放宽 | `src/profiles/sales-manager.profile.ts`、`src/profiles/marketing-user.profile.ts` |
| PRM-009 | OWD 共享模型分布 | 销售/服务核心对象 private;产品/活动/知识库 public_read;联系人与四个明细/联结对象 controlled_by_parent | `src/objects/*.object.ts`(sharingModel) |
| PRM-010 | 演示人员编制 | `pnpm demo:staff` 脚本(刻意非元数据、不进发布产物):造 3 个可登录演示账号补齐岗位授权链 | `src/sharing/demo-staffing.ts` |

## ADM — 管理与设置

| 编号 | 功能 | 说明 | 实现锚点 |
| --- | --- | --- | --- |
| ADM-001 | 应用定义与导航 | `crm_enterprise` 应用:7 个导航组(Sales/My Work/Activity/Marketing/Service/Insights/Approvals),royal blue 品牌,落地页为高管仪表板 | `src/apps/crm.app.ts` |
| ADM-002 | Sales Home 页 | 三栏首页(sales_rep/manager 默认):4 个实时 KPI、我的线索/交易/任务三个嵌入列表 tab、快速新建、AI 助手引导卡、今日日程 | `src/pages/home.page.ts` |
| ADM-003 | 启动器与工具条 | App Launcher(应用网格+全局搜索)与 Utility Bar(通知面板、快速笔记、快速搜索),四个 profile 全覆盖 | `src/pages/app_launcher.page.ts`、`src/pages/utility_bar.page.ts` |
| ADM-004 | 数据导入 | 3 个可复用导入映射(客户/联系人/线索,CSV/XLSX upsert)+ 行业与线索来源同义词表 + 现成模板 | `src/mappings/` + `assets/import-templates/` |
| ADM-005 | 数据导出 | 五对象(客户/联系人/线索/商机/工单)列表 CSV/XLSX 导出,经单一服务端路由与 `allowExport` 权限把关 | `src/views/*.view.ts`(exportOptions)+ `src/profiles/index.ts` |
| ADM-006 | 文件与附件 | 6 个对象启用附件面(客户/联系人/商机/报价/合同/工单);记录评论 feed 全对象默认开启;产品图/logo/头像/签名等媒体字段带服务端类型与大小限制 | `src/objects/*.object.ts`(enable.files)+ `src/objects/index.ts`(机制说明) |
| ADM-007 | 通知体系 | 全部流程经声明式 notify 节点(ADR-0012)发 inbox+email,收件人统一为记录 owner(转化/生成报价通知操作者);severity 分级 | `src/flows/*.flow.ts` |
| ADM-008 | 多语言 | en/zh-CN/ja-JP/es-ES 四语言全量翻译:对象/字段/选项/视图/表单分区/动作/仪表板/页面/导航/通用文案 | `src/translations/` |
| ADM-009 | 分析语义层 | 9 个 dataset(ADR-0021)承载全部仪表板与报表的维度/度量定义,含派生比率与跨对象维度 | `src/datasets/` |
| ADM-010 | 种子数据 | 19 个幂等 upsert 数据集(客户 9/线索 21/商机 23/工单 8/事件 27/活动成员 ~52 等),金额自明细派生、区域与流失时钟按演示可观测性设计 | `src/data/` |
| ADM-011 | 演示数据认领 | 每 10 分钟扫描:把 12 个对象的无主种子记录认领给首个真实用户(种子无法命名 owner 的补偿机制) | `src/flows/demo-bootstrap.flow.ts` |
| ADM-012 | AI Live Data 技能 | 每次先读取当前活 schema 再查询——管理员新加字段后 AI 立即可用(平台 `ask` 助手挂载,skills-only 架构) | `src/skills/live-data.skill.ts` |
| ADM-013 | 应用内规则手册 | 4 篇随包文档:总览/销售规则(路由、审批阈值、停滞窗口)/服务规则(SLA、升级、CSAT)/管理手册(岗位、共享、13 个自动化旋钮) | `src/docs/` |
| ADM-014 | 字段历史跟踪 | 各对象关键字段 `trackHistory`(owner、状态/阶段/优先级、金额/营收等)驱动记录页 History 审计流 | `src/objects/*.object.ts` |
| ADM-015 | 平台能力声明 | `requires: automation/triggers/analytics/auth/ui/approvals/sharing`;`ai` 刻意不列(开源版无 AI service,技能仍编入产物在云端运行) | `objectstack.config.ts` |

---

## 附:清点范围核对单

按 #1052 的完整性要求逐项核对,均已覆盖:

- 17 个业务对象与全部 hook:LEA/ACC/OPP/QUO/CON/SVC/KB/MKT/FCT/ACT 各域首行起
- 客户工作台:ACC-007;报价与合同完整生命周期:QUO-002~008、CON-002~006
- 产品:QUO-010~013;任务/事件与参与者:ACT-001~008;互动历史:ACT-009~011、ACC-005
- 知识库审核流:KB-002~004;数据导入导出:ADM-004/005;批量操作:LEA-013、OPP-011、ACC-006
- 文件上传:ADM-006;审批流:APR 全域;guest portal:PRM-002、LEA-006、SVC-005
- 通知:ADM-007 及各流程行;多语言:ADM-008
