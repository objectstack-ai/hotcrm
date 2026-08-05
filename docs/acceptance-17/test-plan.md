# HotCRM × ObjectStack 17.0 GA 验收测试计划(rc.2 / 当前 main)

> 修订自 `upgrade/objectstack-17` 分支的 `docs/upgrade-17/test-plan.md`(rc.0 底本)。
> 本版针对 **当前 main**:`@objectstack/*` **17.0.0-rc.2**(#579 升 rc.1,#663 升 rc.2),
> `engines.protocol ^17.0.0-rc.2`。任务原文以 rc.1 为目标;main 已于 2026-08-03 前进到
> rc.2,验收以当前 main 为准,判定注明 rc.2。

- **环境**:远程沙箱独立容器,分支 `claude/hotcrm-17-rc1-acceptance-hj869o`;dev server
  `objectstack dev -p 4001`,SQLite 库 `.objectstack/data`(全新种子);登录
  `admin@objectos.ai / admin123`
- **原则**:**只测不修** —— 发现问题建 issue(bug 标签;平台侧加 `[17.0-rc][疑似平台]`),
  不改 `src/` 代码;与既有 issue 台账去重后再立新
- **数据隔离**:所有测试写入的记录名/主题统一加前缀 **`RC1ACC-`**(按执行者再加分段号,如
  `RC1ACC-P3-`),便于并行会话隔离与事后清理;不修改、不删除种子记录(删除测试只删自建记录)
- **证据规范**(沿用 rc.0 报告):每项判定必须附 **请求状态码 / 服务端·控制台输出 / 截图**
  之一;不接受"看起来正常"。判定值:**通过 / 失败 / 阻塞**(阻塞=被其它缺陷挡住无法执行)

## 与 rc.0 底本的差异(2026-08-05 修订)

| 变化 | 说明 |
|---|---|
| AI agents 已裁撤(#512) | 旧计划 §7「AI(2 agents/6 skills)」删除;skills 仍在,仅验证元数据加载 |
| competitor 模块已移除(#551) | 对象清单删去 `crm_competitor` |
| 活动模型上线(#592/#670) | 新增 `crm_event`、`crm_event_attendee` 对象、activity 仪表盘、14 个活动类 action |
| rc.0 发现的 #527/#529/#530/#531/#535 已修复关闭 | 不再复测;#520 系列见 §8 |
| 上游 #3912/#3913/#3914/#3915/#3955 已随 rc.1/rc.2 发布 | §8 阻塞项预期部分解除,逐条实证 |
| 元数据普查(`pnpm validate`,rc.2) | **17 对象/344 字段/1 app/14 视图/8 页面/5 仪表盘/10 报表/26 actions/24 flows/12 岗位/6 权限集** |

## 0. 静态与自动化基线(先行,必须全绿)

| 项 | 内容 | 结果判据 |
|---|---|---|
| S1 | `pnpm verify`(validate+typecheck+lint+hygiene+build+vitest) | 退出码 0(vitest 52 文件 / 1281 例) |
| S2 | `pnpm test:e2e`(Playwright headless,同 CI e2e.yml) | 全过 |
| S3 | dev server 冷启动 + 种子加载 | 无 ERROR,登录可用 |

## 1. 对象:列表 + 详情(14 个带视图对象;只读,可并行)

每对象:① 列表视图渲染且有种子数据 ② 打开一条详情不报错 ③ 控制台无新增报错。

`crm_account` `crm_contact` `crm_lead` `crm_opportunity` `crm_product` `crm_quote`
`crm_contract` `crm_case` `crm_campaign` `crm_forecast` `crm_knowledge_article`
`crm_task` `crm_event` `crm_event_attendee`

3 个无独立视图的子对象经父记录相关列表验证:`crm_opportunity_line_item`(商机详情)、
`crm_quote_line_item`(报价详情)、`crm_campaign_member`(市场活动详情)。

## 2. 对象:新建 / 编辑 / 删除(17 个对象全量;写,串行)

每对象:新建(必填校验+保存)→ 编辑(字段回显+保存)→ 删除自建记录。重点:

| 项 | 重点 |
|---|---|
| C1 商机 | stage→probability/expected_revenue 派生 hook;closed_won 盖章 close_date |
| C2 工单 | **多 tab 表单**(Case/SLA/Resolution)——rc.0 的 #525 场景,校验失败后切 tab 值不丢 |
| C3 线索 | 新建 + convert_lead screen flow 全程(industry 越界映射已修 #626 的回归) |
| C4 合同 | 新建 + 状态看板拖拽(rc.0 未验证项 O1,人工/Playwright 拖一次) |
| C5 行项目 | 商机/报价行项目经相关列表增删(controlled_by_parent 写权限,#547 修复回归) |
| C6 事件 | crm_event 新建 + 与会人(event_attendee)联动(#592 新功能首测) |

## 3. Actions(26 个全量;写,串行)

12 个业务 action + 14 个活动类 action(`log_call`/`log_meeting`/`schedule_meeting` ×
lead/contact/account/opportunity/case 表面 + 全局)。每个:入口可见 → 参数弹窗 → 执行 →
数据联动正确 → 失败时有可见报错(rc.0 P3 静默吞错的回归点)。

| 组 | Action |
|---|---|
| 工单 | `escalate_case`、`close_case`(#521 FORBIDDEN 场景回归) |
| 线索 | `convert_lead`(screen flow)、`schedule_followup`、`create_campaign` |
| 商机 | `clone_opportunity`、`mass_update_stage`(列表批量,#508 回归)、`generate_quote` |
| 联系人 | `send_email`、`mark_primary` |
| 市场活动 | `enroll_leads` |
| 活动类 | 各对象 `log_call`/`log_meeting`/`schedule_meeting` 至少每 action 名一测,全局入口单测(#522/#509 回归);产物落 `sys_activity`/`crm_event` 并出现在时间线 |

## 4. 仪表盘(5)与报表(10)(只读,可并行)

- 仪表盘:`crm_overview` / `executive` / `sales` / `service` / `sales_activity`(新)。
  每个:渲染、KPI 出数、图表出数;全局过滤器(Owner、日期范围)改变后数字变化;
  `service` 仪表盘为 #520 datetime 过滤的判定现场
- 报表:10 个全量打开、图表按度量出数;矩阵日期报表(`lead_inflow_by_month_source`、
  `pipeline_coverage_by_quarter`、`cases_opened_by_day_priority`)为 #523 粒度问题判定现场

## 5. Flows(24 个全量;写,串行)

每条构造触发条件并留证(记录前缀 `RC1ACC-`)。按触发方式分组:

- **record-change(即时可测)**:`lead_assignment`、`lead_conversion`(screen)、
  `contact_welcome`、`opportunity_won_alert`、`opportunity_stagnation`(条件版)、
  `opportunity_approval`/`opportunity_approval_on_create`(审批,岗位需有人:#652 已配)、
  `case_escalation`/`case_escalation_on_create`、`case_csat_followup`、
  `campaign_enrollment`、`campaign_completion`、`quote_generation`、`escalate_case`、
  `close_case`、`schedule_followup`、`task_urgent_alert`
- **scheduled(构造到期数据 + 触发一次调度或断言注册)**:`case_sla_monitor`、
  `contract_expiration`、`contract_renewal`、`quote_expiration`、`task_due_reminder`、
  `forecast_snapshot`、`opportunity_stagnation`(定时分支)
- **bootstrap**:`demo_bootstrap`(冷启动日志断言,#663 修复回归)

判据:目标写入发生(任务/事件/字段变更/通知),或调度注册可见;失败必须有服务端日志佐证。

## 6. 【新增】Profile 权限矩阵实测(写,串行,置于 CRUD/Action 之后)

为 5 个 profile 各建一个测试用户(用户名前缀 `RC1ACC-`):`sales_rep` / `sales_manager` /
`service_agent` / `marketing_user` / `system_admin`,逐一登录(或带 token 调 REST)实测:

1. **对象级 CRUD**:每用户 × 17 对象,读/建/改/删与 6 个权限集声明(`src/profiles/`)一致
2. **readScope / OWD**:own-only(如 rep 的 forecast)、org-wide、`controlled_by_parent`
   三类各取代表对象验证行集
3. **sharing 规则**:territory/team/岗位共享(`src/sharing/`)——#549 已知缺口对照,
   private 商机(`is_private`)对 org-wide 读者隐藏(#547 回归)
4. **字段级权限**:`crm_account.health_score`、`crm_case.internal_notes`、
   `crm_quote.internal_notes`、`crm_opportunity.amount` 的掩码/只读按 #547 声明生效
5. **owner 重指派**:改 Owner 后访问是否随动 —— #548(p0,已立案)判定现场,结果记录到
   该 issue,不重复立案

## 7. i18n 四语言抽查(只读,可并行)

`en` / `zh-CN` / `es-ES` / `ja-JP` 各:主导航 + 核心对象列表/表单 + **action 标签** +
**校验错误文案**(重点,rc.0 的 P6 附带项)。已知台账:#494(--skip-i18n 隐藏 205 警告)、
#645(34 个选项未译)、#661(列表 tab 标签无翻译面)——只验证是否恶化,不重复立案。

## 8. 【关键】平台阻塞 issue 复测(在 rc.2 逐条重跑复现步骤)

上游 #3912/#3913/#3914/#3915/#3955 的修复已随 rc.1/rc.2 到达;每条按原 issue 复现步骤重跑,
在 issue 评论:**已解除(附证据,可关闭)** 或 **仍复现(注明 rc.2 + 新证据)**。

| issue | 内容 | 上游修复 | 预期 |
|---|---|---|---|
| #520 | datetime 时间窗过滤空集(客服仪表盘) | #3912(closed) | 解除 |
| #521 | script action 写库 FORBIDDEN | #3914(closed) | 解除 |
| #522 | 全局 action 无法派发 + 200 信封吞错 | #3913(closed) | 解除 |
| #524 | flow 型 action 死菜单 + screen flow 失败静默 | #3915(closed)+ objectui#2958/#2960 | 部分解除 |
| #525 | 多 tab 表单丢值(objectui#2959) | 待验 | 待验 |
| #526 | migrate 占用检测(#3917) | 待验 | 待验 |
| #528 | 9 个孤儿 `__search` 列(#3955 closed) | #3955 | 解除/可清理 |
| #508 | 批量 action 全路径不可执行(16.1 console) | 17.0 console | 待验 |
| #509 | 全局 body action 注册键 'global' vs '*' | #3913 | 解除 |
| #510 | 仪表盘查询无用户 token,"my" widget 不可能 | 待验 | 待验 |

## 9. 产出

1. `docs/acceptance-17/test-report.md`:结论 / 结果矩阵 / 平台问题 / CRM 遗留 / 诚实记录
   (结构沿用 rc.0 报告),提交 PR(附空 frontmatter changeset;Refs 不用 Closes)
2. 新发现逐条建 issue,与 §7/§8 台账及 #664/#661/#656/#650/#620/#617 等既有 issue 去重
3. **GA 发布时需重跑的最小回归清单**(报告附录):从本轮失败/解除项中提炼
