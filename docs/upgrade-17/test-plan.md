# HotCRM × ObjectStack 17.0.0-rc.0 升级测试计划

- **环境**：worktree `.claude/worktrees/upgrade-objectstack-17`（分支 `upgrade/objectstack-17`），独立数据库（全新种子数据），dev server 端口 4004
- **版本**：`@objectstack/*` 全部 17.0.0-rc.0（正式版未发布时的预发验证）
- **原则**：浏览器功能测试阶段发现的问题**只记录、不修改**；每条记录描述现象与复现步骤，能低成本判断时标注疑似归属（平台 / CRM 元数据），不强求
- **深度（第一步）**：所有模块过「列表 + 详情」，核心对象加测「新建 + 编辑」，Action / 仪表盘 / 报表全量过一遍；第二步按需加深

## 0. 静态与自动化（已完成，随升级提交）

| 项 | 内容 | 结果判据 |
|---|---|---|
| S1 | `pnpm validate` | 退出码 0 |
| S2 | `pnpm typecheck` | 退出码 0 |
| S3 | `pnpm build` | 产物生成 |
| S4 | `pnpm test`（vitest 68 例，含元数据守卫） | 全部通过 |
| S5 | `pnpm test:e2e`（Playwright 6 例） | 通过（鉴权跳过项除外） |
| S6 | dev server 冷启动 + 种子数据加载 | 无 ERROR，登录可用 |
| S7 | `os migrate plan/apply`（schema 漂移收敛） | 安全变更已应用，遗留项记录 |

## 1. 核心对象：列表 + 详情（13 个带视图的对象）

每个对象验证：① 列表视图渲染且有种子数据 ② 打开一条详情不报错 ③ 控制台无新增报错。

客户 crm_account ｜ 联系人 crm_contact ｜ 线索 crm_lead ｜ 商机 crm_opportunity ｜ 产品 crm_product ｜ 报价 crm_quote ｜ 合同 crm_contract ｜ 工单 crm_case ｜ 竞争对手 crm_competitor ｜ 市场活动 crm_campaign ｜ 预测 crm_forecast ｜ 知识库 crm_knowledge_article ｜ 任务 crm_task

## 2. 核心对象：新建 + 编辑（5 个核心对象）

| 项 | 对象 | 验证点 |
|---|---|---|
| C1 | 客户 | 新建保存成功、编辑字段回显 |
| C2 | 商机 | 新建时 stage→probability/expected_revenue 派生（L2 hook）；改 closed_won 后 probability=100、close_date 盖章 |
| C3 | 线索 | 新建 + convert_lead 转化流程（screen flow） |
| C4 | 工单 | 新建 + 升级/关闭 action 联动字段 |
| C5 | 合同 | 新建 + 状态看板拖动改状态 |

## 3. Actions（13 个，重点：7 个 modal→script 迁移件）

| 项 | Action | 位置 | 验证点 |
|---|---|---|---|
| A1 | escalate_case（迁移件） | 工单详情头 | 参数弹窗弹出→执行→is_escalated/priority 更新 |
| A2 | close_case（迁移件） | 工单详情头 | 弹窗→执行→status=closed |
| A3 | log_call（迁移件） | 任意记录头 | 弹窗→活动时间线出现通话记录 |
| A4 | log_meeting（迁移件） | 任意记录头 | 弹窗→时间线出现会议记录 |
| A5 | send_email（迁移件） | 联系人详情 | 弹窗→sys_email 入队 + 时间线事件 |
| A6 | mass_update_stage（迁移件） | 商机列表 | 弹窗→批量改 stage |
| A7 | create_campaign（迁移件） | 线索列表 | 弹窗→新市场活动生成 |
| A8 | export_csv | 列表工具栏 | 导出内容非空 |
| A9 | convert_lead | 线索 | screen flow 四步跑通 |
| A10 | clone_opportunity / generate_quote / mark_primary / schedule_followup | 各自表面 | 按钮可见、执行不报错 |

## 4. 仪表盘（4 个）与报表（10 个）

- 每个仪表盘：打开渲染、KPI 出数、图表出数；全局过滤器（Owner=sys_user 修复件、日期范围）改变后数字变化；`{current_user_id}`/`{current_quarter_start}` 修复件 widget 不再空
- 每个报表：打开、图表按度量名出数（total_amount/case_count 修复件重点）

仪表盘：CRM 总览 / 高管总览 / 销售 / 客服；报表：account×?、case×2、churn、lead×?、opportunity×4 等 10 个

## 5. 自动化（Flows 20 个 — 抽样）

- 种子数据触发迹象（如 large deal won 通知）
- C2/C3/C4 中随写操作联动的 trigger/approval 至少覆盖 3 条

## 6. 国际化

- zh-CN 界面抽查主要模块无生硬 key 裸奔
- 切 en 后同页面无缺词条告警

## 7. AI（2 agents / 6 skills）

- 无 LLM key：仅验证元数据加载无错、agent/skill 列表可见（对话功能不在本轮范围）

## 8. 结果与遗留

- 输出 `test-report.md`：逐项结果、问题清单（现象+复现+疑似归属）、遗留风险
