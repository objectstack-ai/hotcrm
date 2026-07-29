# HotCRM × ObjectStack 17.0.0-rc.0 升级测试报告

- **日期**：2026-07-29
- **环境**：worktree `.claude/worktrees/upgrade-objectstack-17`（分支 `upgrade/objectstack-17`），独立 dev server（端口 4004）、独立数据库（全新种子数据）；主仓库与其它会话未受影响
- **版本**：`@objectstack/*` 11 个包 16.1.0 → **17.0.0-rc.0**（`latest` 仍为 16.1.0，本轮为 RC 预发验证）
- **测试计划**：见 [test-plan.md](./test-plan.md)。浏览器阶段发现的问题**只记录未修复**（升级必需的适配修改除外，见 §1）

## 结论（TL;DR）

- **HotCRM 侧适配已完成**，静态链（validate/typecheck/build）、单元测试 68/68、e2e、13 个对象的列表/详情、表单+L2 hook、Flow 触发、3/4 仪表盘、大部分报表、i18n（zh-CN/en）、AI 元数据注册全部正常。
- **发现 6 个平台（RC）问题**，其中 3 个属阻断级：datetime 时间窗过滤全空、script action 写入被 FORBIDDEN、全局 action 无法派发。**建议在这些问题修复前不要升级生产**，并将问题反馈给平台方。
- CRM 自身遗留问题 4 项（多为 16.1 已存在，非本次升级引入）。

## 1. 升级所做的适配（已提交到升级分支）

17.0 的 breaking changes 与对应修改：

| # | 平台变更 | HotCRM 修改 |
|---|---|---|
| 1 | `knowledge.topics` 移除（#3855）→ `knowledge.sources` | 2 个 agent 定义改键名 |
| 2 | `apiMethods` 六原语化（#3543），`search/export/aggregate` 退役（派生自 `list`） | 9 个 object 移除 legacy 值 |
| 3 | 非 script action 带 `body` 由静默忽略改为硬报错 | 7 个 modal+body action 改 `type: 'script'` 并删除 `target`（16.1 下这些按钮本就是死的） |
| 4 | 过滤器占位符词汇表收紧（#3574），未知 token 直接报错 | `{current_user}`→`{current_user_id}`（service 仪表盘）；`{this_quarter_start}`→`{current_quarter_start}`（forecast 视图） |
| 5 | 引用完整性检查（#3583）升级为错误 | 4 个仪表盘 Owner 过滤源 `user`→`sys_user`；lead 视图删除未定义的 `edit/delete/mass_*` 行/批量操作（编辑/删除由控制台内置提供，无功能损失）；4 个报表图表 yAxis 改绑度量名（`total_amount`/`case_count`，ADR-0021） |
| 6 | skill 层 `permissions` 移除（ADR-0049，未强制执行的安全假象） | 6 个 skill 删除该字段（权限本就在 agent 层与 tool 层强制） |
| 7 | i18n `fileOrganization` 配置项移除 | config 删除该行 |
| 8 | 图表 `interaction.zoom` 移除 | 4 个仪表盘删除该键 |
| 9 | 遗留全局唯一索引 → 按租户唯一（#3696） | `os migrate apply` 已在测试库应用（3 项安全变更） |

另：平台新增 ADR-0087 协议兼容检查，提示 `package 'app.objectstack.hotcrm' declares no engines.protocol range` —— 建议在 `objectstack.manifest.json` 补充 `engines.protocol` 声明（遗留事项 L3）。

## 2. 测试结果矩阵

| 计划项 | 结果 | 说明 |
|---|---|---|
| S1-S3 validate/typecheck/build | ✅ | 全绿（16 对象/318 字段/13 视图/15 页面/4 仪表盘/10 报表/13 action/20 flow/2 agent） |
| S4 vitest 68 例 | ✅ | 全过（含元数据守卫） |
| S5 Playwright e2e | ✅ | 4 过 2 条件跳过（API 鉴权自动跳过项已在 UI/REST 补测，见 C2） |
| S6 冷启动+种子 | ✅ | 无 ERROR，登录正常 |
| S7 migrate | ✅ | 3 项安全变更应用；9 项孤儿 `__search` 列 drop 未执行（无害，见 L2） |
| 1. 13 对象列表+详情 | ✅ | 全部渲染有数：客户/联系人/线索/商机/产品/报价/合同/工单/竞争对手/营销活动/预测/知识库/任务；账户详情含字段分组、公式字段、相关列表、时间线 |
| C1 客户新建/编辑 | ✅（部分） | 表单机制在商机/工单上验证；客户未单独重复验证 |
| C2 商机生命周期 hook | ✅ | 新建 proposal/10000 → probability=60、expected_revenue=6000；改 closed_won → probability=100、close_date 盖章、expected_revenue=10000；并触发 Flow 自动创建任务 |
| C3 线索转化 | ❌ 平台+CRM | 提交链路通，服务端因 industry 枚举越界失败且 UI 静默（见 P5/L5） |
| C4 工单新建 | ✅（REST）/ ❌ UI | REST 建单+自动编号+hook 正常；UI 多 tab 表单有 bug（P6） |
| C5 合同状态看板 | ✅ 渲染 / ⚠ 拖拽未验证 | 看板渲染正常；合成拖拽事件不触发 dnd，需人工复核（O1） |
| 3. Actions ×13 | ❌ 平台 | 参数弹窗/确认框/可见性谓词全部正常；**执行层三类平台问题**（P2/P3/P5） |
| 4. 仪表盘 ×4 | 3✅ 1❌ | CRM 总览/高管/销售全部出数，Owner 过滤（sys_user 修复件）验证到 SQL 层生效；客服仪表盘因 P1 全空 |
| 4. 报表 ×10 | 7✅ 3❌ | 度量名修复件（total_amount/case_count）验证通过；3 个日期矩阵报表因 P4 列乱序/粒度失效 |
| 5. Flows 抽样 | ✅ | 种子触发（large deal won 通知 ×5）；closed_won 触发建任务流 |
| 6. i18n | ✅ | zh-CN 全站正常；切 en 词条完整；切回正常。部分 action 标签无中文（O2） |
| 7. AI 元数据 | ✅ | `/meta/agents`、`/meta/skills` 正常返回 2 agents/6 skills；`knowledge.sources` 迁移无恙 |

## 3. 平台问题（17.0.0-rc.0，建议反馈给平台方）

**P1（阻断）datetime 字段的时间窗过滤返回空集**
现象：客服仪表盘所有 widget 为 0/空，而库里有 38 条工单（30 条未关闭、全部在 30 天窗口内）。
定位：widget SQL `WHERE ... created_date >= $2 AND created_date <= $3`；SQLite 列内容为 ISO 文本（`2026-07-26T00:00:00.000Z`），17.0 驱动把 datetime 比较参数转成 epoch 毫秒 → 文本比较永假。同一查询手工用 ISO 参数返回 29 行、epoch 参数返回 0 行。`date` 字段（如 close_date）不受影响。库是 17.0 自己新建的，属写入端(ISO)/读取端(epoch) 不一致（对应 spec 中 `SqlDriver.temporalFilterValue` 的改动）。
影响：一切 datetime 字段上的 dateRange/时间窗过滤（客服仪表盘、`{30_days_ago}` 类宏、SLA 相关视图）。

**P2（阻断）script action 的 body 写库被 FORBIDDEN**
现象：关闭工单 action：确认框→参数弹窗→执行，报 `FORBIDDEN: insufficient privileges to update crm_case <id>`（admin 用户）。
定位：服务端审计行声称 `body executes TRUSTED (context-less engine, RLS/FLS-bypassing)`，但 body 内 `ctx.api.object(...).update` 仍被权限层拒绝——疑似 context-less 引擎无用户身份，权限检查全拒，与审计声明自相矛盾。16.1 有类似「sandbox updates sharing-blocked」怪癖，RC 未修复。
影响：所有带写库 body 的对象级 action（close_case/escalate_case/send_email/mass_update_stage/create_campaign/clone_opportunity/generate_quote…）。

**P3（阻断）全局（无 objectName）action 无法派发**
现象：`POST /api/v1/actions/<obj>/log_call` 返回 HTTP 200，内层 `{"success":false,"error":"Action 'log_call' on object '*' not found"}`。log_meeting/export_csv 同样。flow 型 action 走此端点时也报同样错误（错误信息有误导）。
附带：**UI 把内层失败当成功静默吞掉**——弹窗直接关闭、无任何报错提示（双重问题：派发 + 错误呈现）。

**P4（高）报表矩阵日期列粒度失效且乱序**
现象：`lead_inflow_by_month_source`（按月）与 `pipeline_coverage_by_quarter`(按季) 的列变成每个原始日期一列；`cases_opened_by_day_priority`（按日，粒度正确）列序乱（07-01, 07-05, …, 07-02, …）且出现「—」列。16.1 的默认按月分桶行为丢失。

**P5（高，已修订）flow 型 action 菜单项失灵 + screen flow 失败静默**
现象：① 线索行菜单「Convert Lead」（flow 型 action）点击后无任何网络请求（死菜单项）；② 「转化线索」能弹出流程首屏（Conversion Details），Submit 后服务端日志证实流程确实执行了（`Insert operation failed {"object":"crm_account","error":"industry must be one of: ..."}`，02:17:49），即提交链路是通的，**但服务端失败没有任何 UI 回显**——弹窗关闭、无提示、线索未转化。失败本身的根因是 CRM 侧数据映射问题（见 L5），静默吞错是平台侧问题（与 P3 的错误呈现问题同源）。

**P6（中）多 tab 新建表单校验失败后丢状态**
现象：工单新建弹窗（Case/SLA/Resolution 三 tab）：首次提交报 `description is required`（该必填字段在第三个 tab 上）；切到 Resolution 填好再提交，报 subject/status/priority/description 全部缺失——已填值全部丢失，且弹窗布局错乱（tab 头消失）。
附带：校验错误不指示字段所在 tab；错误文案为英文原文（未走 i18n）。

**P7（低/运维）`os migrate apply` 缺少「库占用」保护**
对运行中的 dev server 正在使用的 SQLite 库执行 apply 时无告警（本次测试中未复现实际数据损坏，但 CLI 与运行中服务并发改库的场景缺少防护/提示，建议平台加占用检测）。

## 4. CRM 侧遗留问题（多为 16.1 已存在，未在本轮修复）

- **L1** 仪表盘 16 个 widget 的 `actionUrl` 指向死路由（`/objects/opportunity`、`/reports/win-rate` 等，对象名/报表名不存在）——validate 已降级为警告逐条列出，建议按清单修正为 `crm_*` 路由或删除。
- **L2** 9 个孤儿 `__search` 列（17.0 收紧搜索伴生列供给条件后遗留）——可择机 `os migrate apply --allow-destructive` 清理，不影响功能。
- **L3** `objectstack.manifest.json` 未声明 `engines.protocol`（ADR-0087 警告）。
- **L5** 线索转化流 industry 映射越界：`lead-conversion.flow.ts:61` 直接透传 `{leadRecord.industry}`，但 `crm_lead.industry` 有 12 个枚举值（media/logistics/energy/hospitality/real_estate/other…），`crm_account.industry` 只允许 6 个（technology/finance/healthcare/retail/manufacturing/education）——凡 industry 超出客户枚举的线索转化必然失败（服务端 ValidationError）。需要在流程里做映射或收敛两侧枚举。
- **L4** Forecast「This Quarter」视图恒为空：种子数据 `period_start=2026-06-13/03-15` 不落在季度边界，视图按 `period_start = {current_quarter_start}`（=2026-07-01）精确匹配。占位符解析本身正常（16.1 下该视图同样为空，只是当时占位符根本不解析）。建议改种子数据或把过滤改为范围匹配。

## 5. 观察项（低优先/待人工复核）

- **O1** 看板拖拽（商机/合同）无法用自动化合成事件验证（dnd 库不吃合成拖拽，未发出请求）——需人工拖一次确认；非确定性 bug。
- **O2** 部分 action/流程标签无中文翻译（"Schedule Follow-up"、"Convert Lead"、"Close Case"、"Log a Call"、"Conversion Details"）。
- **O3** 记录时间线中 owner 变更显示原始用户 ID（`Account Owner: ∅ → kBJxBs…`）而非用户名。
- **O4** Forecast 列表达成率/覆盖倍数显示原始浮点（54.666666666666664），预期金额未按千分位格式化。
- **O5** 查找（lookup）下拉的副标题模板显示原始 Markdown 星号（`**Strategic Customer - Enterprise Tier**`）。

## 6. 测试过程说明（诚实记录）

- 测试中段本人 shell 工作目录曾意外重置回主仓库，导致一段时间内 4004 端口跑的是主仓库 16.1 代码：期间得出的「close_case 400 Bad Request」「数据库 inode 分叉/写入不落盘」两条结论均为误判，已全部撤回并在正确的 17.0 环境重测；本报告所有结论均基于确认过进程工作目录的 17.0 worktree 服务器。主仓库未留下任何修改（期间仅产生登录会话记录写入主仓库本地 dev.db）。
- 测试数据（1 个商机、1 个工单、若干 action 尝试）都只写入 worktree 的独立数据库。

## 7. 建议的下一步

1. 将 P1–P6 反馈平台（每条含上文复现步骤；P1/P2/P3 阻断生产升级）。
2. L1–L4 可在本分支或主分支按常规 issue 处理（与 17.0 无耦合）。
3. 平台出下一个 RC 后在本 worktree `pnpm update` 重跑本计划（静态链+重点回归 P1-P6 的复现步骤即可，半自动化）。
4. 第二步（可选）：对象级 CRUD 全字段矩阵、20 条 Flow 逐条触发、配置 LLM key 后的 AI 对话链路。

---

## 附录 A：源码级终判与 issue 台账（2026-07-29 复核）

对 §3 的 7 条疑似平台问题，用 objectstack@fc156fa4a（17.0.0-rc.0 tag）与 objectui@4a4829d0（console 锁定 commit）源码逐条复核后的终判：

| 原编号 | 终判 | 上游 issue | hotcrm issue |
|---|---|---|---|
| P1 datetime 过滤空集 | 平台 bug（写存 ISO TEXT / 读转 epoch；17.0 占位符解析引爆 9.10.0 旧雷） | objectstack#3912 | #520 |
| P2 action 写库 FORBIDDEN | 平台 bug（ctx.api 无执行上下文；hook 有 isSystem 兜底而 action 没有） | objectstack#3914 | #521 |
| P3 全局 action 派发 | 平台 bug ×2（注册键 'global' vs 查找键 '*'；失败包 200 信封） | objectstack#3913 | #522 |
| P4 报表日期粒度 | **改判 CRM 为主**（v9 迁移丢 dateGranularity，见 #523）；列乱序是平台缺口；「—」列是有意 breaking（#3839） | objectstack#3916 | #523 |
| P5 flow action | 拆三：死菜单项 = CRM 冗余字符串 rowActions（#535）+ objectui 字符串路径静默 no-op（objectui#2960）；launch 失败误判成功 = objectui#2958；REST 端点无 flow 分派 = objectstack#3915 | 见左 | #524、#535 |
| P6 多 tab 表单丢值 | objectui console bug（每 tab 独立 form + Radix 卸载销毁状态；#2153 关闭但显式路径未修）；另发现 dispatcher 丢 ValidationError fields[] | objectui#2959、objectstack#3918 | #525 |
| P7 migrate 占用 | 事实成立（零占用检测 + 确认前即发 DDL）；原「inode 被替换」猜测经源码否定并已修正 | objectstack#3917 | #526 |

结论修正：升级阻断项仍是 3 个（P1/P2/P3，全部坐实为平台 bug）；P4 主因回收为 CRM 侧待办；P5/P6 为平台（console）UI 层问题、其中错误静默机制横跨服务端信封设计与客户端信封检查两层。
