# HotCRM × ObjectStack 17.0 GA 验收报告(rc.2)

- **日期**:2026-08-05
- **被测版本**:`@objectstack/*` **17.0.0-rc.2**(`engines.protocol ^17.0.0-rc.2`)。
  任务下达时的目标是 rc.1,但 `main` 已于 2026-08-03 由 #663 前进到 rc.2,**本轮以 rc.2 为准**,
  所有判定均注明 rc.2。rc.1 相关的上游修复(#3912/#3913/#3914/#3915/#3955)全部包含在内。
- **被测代码**:`main` @ 5a78f88(`feat(activity): first-class events…` #670)
- **环境**:远程沙箱,`objectstack dev -p 4001`,SQLite `.objectstack/data`(全新种子);
  登录 `admin@objectos.ai`,鉴权走 `POST /api/v1/auth/sign-in/email` → Bearer token
- **测试计划**:[test-plan.md](./test-plan.md)
- **纪律**:只测不修 —— 未改动任何 `src/` 代码;新发现逐条立 issue;测试数据统一 `RC1ACC-` 前缀

## 结论(TL;DR)

> 本节在全部阶段完成后定稿。

## 1. 自动化基线

| 项 | 命令 | 结果 | 证据 |
|---|---|---|---|
| S1 | `pnpm verify`(validate+typecheck+lint+hygiene+build+vitest) | ✅ 通过 | 退出码 0;vitest **52 文件 / 1280 通过 / 1 跳过**,耗时 26.24s |
| S2 | `pnpm test:e2e`(Playwright headless,同 CI `e2e.yml`) | ✅ 通过 | **16/16 通过**,耗时 1.0m,含 `pnpm build` + `objectstack start` 冷启动 |
| S3 | dev server 冷启动 + 种子 + 登录 | ✅ 通过 | `/api/v1/health` 200;启动日志 **0 条 ERROR**;登录返回 token,`/api/v1/data/crm_account` 200 |

`pnpm validate` 元数据普查(rc.2):**17 对象 / 344 字段 / 1 应用 / 14 视图 / 8 页面 /
5 仪表盘 / 10 报表 / 26 actions / 24 flows / 12 岗位 / 6 权限集**。

validate 的 5 条警告均为既有已知项(2 个审批流的岗位空槽风险 ×4、`crm_campaign_member`
的 basic 分组全被提升到高亮条),非本轮新增。

## 2. 结果矩阵

| 计划项 | 结果 | 说明 |
|---|---|---|
| 0. 自动化基线 | ✅ 通过 | 见 §1,全绿 |
| 1. 14 对象列表 + 详情 | ✅ 12 通过 / 2 阻塞 | 见 §3 |
| 1. 3 子对象(经父相关列表) | ✅ 通过 | 见 §3 |
| 2. 17 对象 CRUD | *(填充中)* | |
| 3. 26 actions | *(填充中)* | |
| 4. 5 仪表盘 | ✅ 通过 | 56 widget 全渲染出数,见 §4 |
| 4. 10 报表 | ✅ 通过 | 见 §4 |
| 5. 24 flows | *(填充中)* | |
| 6. Profile 权限矩阵 | *(填充中)* | |
| 7. i18n 四语言 | ⚠ 部分通过 | 见 §5,zh-CN 完整,ja/es 有实质缺口 |
| 8. 阻塞 issue 复测 | *(填充中)* | 已确认解除:#520、#523,见 §6 |

## 3. 对象:列表与详情(执行者 R1)

**15/17 通过,2 阻塞;全站零应用层控制台错误、零 pageerror。**

14 个带视图对象中 12 个完全通过:列表渲染有数据、详情页字段分组/相关列表/时间线正常。
逐对象 REST 行数与截图见执行记录。

**阻塞 2 项**:`crm_event`、`crm_event_attendee` —— REST 200 但种子 **0 行**,列表空状态
渲染正确,详情页无记录可开故无法测试。对应既有 issue **#671**(活动模型缺演示种子,
#592 的后续),不重复立案;详情页由写阶段自建记录后补测。

3 个子对象经父记录相关列表验证通过:`crm_opportunity_line_item`(74 行,商机详情
Products 列表)、`crm_quote_line_item`(16 行)、`crm_campaign_member`(51 行,分页 1/3)。

**环境噪声(非应用缺陷,已排除)**:Sentry 遥测被沙箱代理拦截(`ERR_TUNNEL_CONNECTION_FAILED`)。

**新发现(低)**:
- `GET /assets/crm-favicon.ico` → 404,应用品牌声明的 favicon 未被服务(打包疏漏,无功能影响)
- 商机详情右侧 Products 汇总侧栏显示原始记录 ID(如 `-PBylY-NARjgK6dS`)而非显示名

## 4. 仪表盘与报表(执行者 R2)

**5/5 仪表盘(共 56 widget)、10/10 报表全部通过。** 所有 widget 经
`POST /api/v1/analytics/dataset/query` 取数,全部 200,无应用控制台错误。

**关键:所有为空的 widget 均经 REST 反查证实"数据本就如此",不是渲染或查询缺陷** ——
`sales_activity` 的事件类 widget 为空是因 `crm_event` 0 行(#671);SLA 达标率 0.0% 是因
3 条违约工单均未关闭而该仪表盘按 `is_closed:true` 取数,逻辑自洽。

**全局过滤器实测通过**(2 个仪表盘,前后截图):CRM 总览日期范围 This quarter→This year,
营收 610,000→1,290,000、成交数 7→10、赢单 4→8;客服仪表盘 Priority→Critical,
未结工单 30→7。Owner 过滤器经捕获的查询载荷证明已注入(种子数据仅单一 owner,
故数字不变属预期)。

**报表**:10 个全部渲染、度量解析正确、坐标轴有数。`customer_churn_signals` 的两个空区块
经反查证实为数据正确(所有客户 21 天内均有活动)。

**低优先观察**:`forecast_metrics` 的 owner 标签显示 "—"(种子 `crm_forecast.owner` 为 null);
一个报表图表的坐标轴显示原始度量名 `total_amount`。

## 5. i18n 四语言(执行者 R3)

**zh-CN 完整,ja-JP / es-ES 有实质缺口,校验文案四语言均正确翻译。**

locale 切换路径(实测发现,非猜测):头像菜单 → Preferences → Language;控制台用短码,
服务端映射(`GET /api/v1/i18n/translations/zh` → `{"locale":"zh-CN"}`);
`GET /api/v1/i18n/locales` 返回 en/zh-CN/ja-JP/es-ES,与 `src/translations/crm.translation.ts` 一致。

| 检查项 | zh-CN | ja-JP | es-ES |
|---|---|---|---|
| 主导航 | ✅ 全译 | ❌ 23 个条目全英文 | ❌ 同左 |
| 列表视图 tab 标签 | ✅ | ✅ | ✅ |
| 列表列头 | ✅ | ⚠ 缺 Health Score / Next Renewal Date | ⚠ 同左 |
| 详情页 tab / 分组标题 | ✅ | ❌ 英文 | ❌ 英文 |
| Action 按钮标签 | ✅ | ✅ | ✅ |
| **校验错误文案** | ✅ 主题不能为空 | ✅ 件名は必須です | ✅ Asunto es obligatorio |
| Action 参数弹窗 | ⚠ 标题英文 | ⚠ 标题英文 | ⚠ 标题英文 |

**量化**:`objectstack lint` 关闭 `--skip-i18n` 后 **710 条 i18n 警告**(ja-JP 355 + es-ES 355,
zh-CN 0),远超 #494 记录的 205 条。缺失选项键 **169 个/语言**,远超 #645 记录的 34 个。
根因:`ja-JP.ts` / `es-ES.ts` 按 `en.ts` 的形状编写(~926 行),从未同步 `zh-CN.ts`(1345 行)
后来新增的导航映射、`pages`、11 个 `_sections` 中的 10 个、CS 字段与工单状态/优先级选项集。

**既有 issue 复核结果**:
- **#661 未复现,疑似已修** —— 列表视图 tab 标签在 zh/ja/es 三语言下均已翻译(已在 issue 评论,建议 owner 确认后关闭)
- **#645 确认仍在**(ja/es),计数已更新至 169/语言(已评论)
- **#494 确认仍在**,计数已更新至 710(已评论),并发现 lint **完全没有 `_sections` 检查**这一盲区

**本轮新立 issue**:#680(action 参数弹窗标题不翻译)、#681(语言选择不持久化,刷新即回退
英文,使非英语 locale 实际只能演示)、#682(控制台 chrome 层 i18n 缺陷:lookup 占位符泄露
原始 API 名 `crm_account`、视图/工具栏字符串、en 文案误用顿号、es 性数不一致)、
#683(创建表单分节 tab 无翻译面 + lint `_sections` 盲区)。

## 6. 平台阻塞 issue 复测

> 本节在复测阶段完成后定稿。已取得的确认:

- **#520(datetime 时间窗过滤返回空集)—— 已解除。** rc.0 下客服仪表盘全空;rc.2 下
  38 条种子工单全部出数:未结 30 / 紧急 7 / 平均解决 45.0h / SLA 违约 3,30 天日粒度
  时间序列有数,与 REST 直查结果一致。上游 objectstack#3912 已关闭。
- **#523(矩阵报表日期粒度缺失)—— 已解除。** `lead_inflow_by_month_source` 正确按月分桶
  (2026-02…2026-08),`pipeline_coverage_by_quarter` 按季(2026-Q3/Q4),
  `cases_opened_by_day_priority` 按日(2026-07-06…2026-08-04),均按时间正序且同期记录
  聚合入同一列,rc.0 的"逐原始日期爆列"现象消失。

## 7. CRM 侧遗留与新发现

> 本节在全部阶段完成后定稿。已立案:

- **#684**(本轮新立,p1)记录变更流漏了 `runAs: 'system'`:10/21 个流文件已为**定时流**
  加上该声明并附相同注释,但**记录变更流被系统写入触发时同样没有用户**这一情形被漏掉。
  单次启动+种子+一轮 CRUD 写入即产生 **73 条 `[runAs]` 拒绝警告与 12 次运行失败**
  (`case_escalation` 38/3、`opportunity_approval` 23/9)。影响:种子加载、流触发流、
  未来的集成/webhook 写入都会静默丢失这些自动化。

## 8. 诚实记录(测试过程说明)

- **一次被证伪的假设**:dev 日志出现 `SqliteError: … table crm_forecast has no column named
  name`(REST 未捕获错误),我最初推断为"未声明字段被直送 SQL 层"。随后用对照探针证伪:
  `POST /api/v1/data/crm_account` 带虚构字段返回干净的 **400 `INVALID_FIELD`**,
  `POST /api/v1/data/crm_forecast` 带 `name` 同样返回 **400**(该对象用
  `nameField: 'display_title'`,不声明 `name`)。即**单条 REST 插入路径的校验是正确的**,
  该 SqliteError 走的是另一条路径。归属与复现留给写阶段的精确请求记录,未据此立案。
- 上述探针创建的 2 条记录(1 客户、1 预测)已 `DELETE` 并经 GET 404 验证清除。
- `display_title` 是公式字段,写入时被拒为 `Unknown field` —— 报错措辞对只读计算字段有误导性
  (低优先观察项,未单独立案)。

## 附录 A:GA 发布时需重跑的最小回归清单

> 本节在全部阶段完成后定稿。
