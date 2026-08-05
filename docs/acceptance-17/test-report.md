# HotCRM × ObjectStack 17.0 GA 验收报告(rc.2)

- **日期**:2026-08-05
- **被测版本**:`@objectstack/*` **17.0.0-rc.2**(`engines.protocol ^17.0.0-rc.2`)。
  任务下达时的目标是 rc.1,但 `main` 已于 2026-08-03 由 #663 前进到 rc.2,**本轮以 rc.2 为准**,
  所有判定均注明 rc.2。rc.1 相关的上游修复(#3912/#3913/#3914/#3915/#3955)全部包含在内。
- **被测代码**:`main` @ 5a78f88(`feat(activity): first-class events…` #670)
- **环境**:远程沙箱,`objectstack dev -p 4001`,SQLite `.objectstack/data`(全新种子);
  登录 `admin@objectos.ai`,鉴权走 `POST /api/v1/auth/sign-in/email` → Bearer token
- **测试计划**:[test-plan.md](./test-plan.md);**接手请先读 [HANDOFF.md](./HANDOFF.md)**;原始记录见 [evidence/](./evidence/)
- **纪律**:只测不修 —— 未改动任何 `src/` 代码;新发现逐条立 issue;测试数据统一 `RC1ACC-` 前缀

## 结论(TL;DR)

> **全部 8 节执行完毕。**

- **平台侧:阻塞 issue 复测 10/10 完成 —— 9 条解除、1 条仍复现。** rc.0 的三个升级阻断项
  (#520 datetime 过滤、#521 action 写库 FORBIDDEN、#522 全局 action 派发)**全部解除**;
  仍复现的是 #508(批量 action 无任何可用调用路径,平台选择传递 + CRM body 签名两半都缺,
  但 rc.0 的假成功已消失、所有失败可见)。
- **基线全绿**:`pnpm verify` 退出码 0(vitest 1280 通过)、Playwright e2e 16/16、
  冷启动 0 ERROR。
- **数据层健康**:REST 层 **17/17 对象全量 CRUD 通过**,商机 hook 派生、行项目 rollup、
  线索转化(含 rc.0 失败的 industry 映射)、看板拖拽均正确。
- **UI 层有一个 p0 缺陷**:console 表单无视 `visibleOn` 却强制其 `required`,
  导致 **`crm_lead` 在界面上完全无法创建**(#688)——这是应用的头号演示路径。
- **分析层健康**:5 仪表盘 56 个 widget、10 报表全部出数;所有空值均经 REST 反查证实
  为数据本身如此,而非查询缺陷。
- **i18n 分化明显**:zh-CN 完整;ja-JP / es-ES 各缺 355 条,导航与详情页分节标题仍是英文;
  四语言的校验文案均已正确翻译。
- **26 个 action 25 通过 / 1 失败**(§6b):11 个业务 action 与 15 个活动类 action 均验证到
  真实数据产物;唯一失败即 #508。rc.0 的"静默吞错"标志性缺陷已专项探测、未复现。
- **24/24 flows 通过**(§6c),含审批全链与 7 条定时扫;**#684 判定**:用户路径健康、
  系统路径全断并实证**审批绕过**($150K 流建商机无审批直接放行)—— 建议升级该 issue 严重度。
- **权限矩阵大面积不成立(§6d)** —— 这是全场最重的结论:平台 `member_default` 通配授权把
  应用的对象门在建/读/改三轴上整体架空(任何 profile 都能在任何对象建记录,#703);
  `controlled_by_parent` 读取全组织开放,service_agent 在 0 个可见商机下读全部 74 条行项目
  价格(#704);`modifyAllRecords` 与 edit 级共享均不给写(#705);#547 验证过的 campaign
  写扩权回归失效(#706)。**完好的层**:FLS 100% 匹配、四个真实角色的导出位精确、
  private OWD 的读行集与 is_private RLS 精确。#548 系统化坐实:所有权分裂在三列上,
  完整移交不可能(已评论)。
- **本轮共立 23 个新 issue**(#680–#684、#688–#693、#696、#698、#700–#709),另给 15 个
  既有 issue 回填 rc.2 实测判定。

**对 GA 的建议:当前状态不建议放行。** rc.0 时代的平台阻断项虽已基本清空(唯 #508 待修),
但本轮新确立的阻断级问题更重:
1. **#703/#704(p0,平台)** 权限模型默认开放 —— 任何成员在任何对象上可建可读(含行项目价格
   泄漏),应用声明的安全姿态是纸面文章;
2. **#688(p0,console)** 线索 UI 完全无法创建;
3. **#548/#700/#705 一族** 所有权与写门破碎:owner 移交不可能、定时扫产物出生即不可改删、
   经理改不了下属记录;
4. **#684** 系统驱动写入下自动化全断,含审批绕过实证。
这四组修复并按 §11 清单复归前,17.0 GA 不应发布带权限声明的 HotCRM。

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
| 2. 17 对象 CRUD | ✅ REST 17/17 通过 / ❌ UI 1 项失败 | 见 §6;`crm_lead` UI 新建完全不可用(#688) |
| 3. 26 actions | ✅ 25 通过 / 1 失败 | 见 §6b;唯一失败是 `mass_update_stage`(#508 仍复现) |
| 4. 5 仪表盘 | ✅ 通过 | 56 widget 全渲染出数,见 §4 |
| 4. 10 报表 | ✅ 通过 | 见 §4 |
| 5. 24 flows | ✅ **24/24 通过** | 见 §6c;#684 判定:用户路径健康 / 系统路径全断且实证审批绕过 |
| 6. Profile 权限矩阵 | ❌ **矩阵不成立** | 188 探针:134 匹配 / **38 真实不匹配**,5 个平台根因,见 §6d;FLS 与导出位是唯二完好层 |
| 7. i18n 四语言 | ⚠ 部分通过 | 见 §5,zh-CN 完整,ja/es 有实质缺口 |
| 8. 阻塞 issue 复测 | ✅ **10/10 完成** | **9 解除 / 1 仍复现**(#508);逐条判定见 §7,均已评论到 issue |

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

## 6. 对象 CRUD 与定向检查(执行者 W1)

**REST 层 17/17 对象全量 C-R-U-D 通过**,无一对象在增删改查任一环节失败。
测试数据全部 `RC1ACC-W1-` 前缀,结束时 30 条台账记录 + 3 条 hook 派生任务全部删除,
**零残留、未触碰任何种子记录**。

UI 表单已验证可用:客户、商机、工单、事件(均创建成功);**线索 UI 新建失败**(#688)。

| 定向检查 | 结果 | 关键证据 |
|---|---|---|
| C1 商机 hook 派生 | ✅ 通过 | `proposal/10000` → probability=60、expected_revenue=6000;无 `win_reason` 关闭被 **400** 拒绝;补齐后 → probability=100、expected_revenue=10000、close_date 盖章 |
| C2 多 tab 表单(#525) | ✅ 通过 | **无数据丢失**,详见下文 |
| C3 线索转化(industry 映射) | ✅ 通过 | 两轮转化,`nonprofit` 与 `media` 均干净落到 `crm_account.industry`,rc.0 的枚举越界未复发 |
| C4 看板拖拽 | ✅ 通过 | 真实鼠标 API 触发真实 PATCH,hook 正确重算 |
| C5 行项目与 rollup(#547) | ✅ 通过 | 报价/商机 rollup 均正确;`controlled_by_parent` 写权限无阻碍 |
| C6 事件/与会人 | ✅ 通过 | 两个详情页渲染完好,R1 的阻塞纯属无种子数据(#671) |

**C2 —— #525 的结论是"不复现"**:`crm_case` 的原始复现路径已不可构造(#515 把 5 个必填
字段全移到第一个 tab)。W1 转而发现 `crm_contract` 仍存在真正的跨 tab 必填布局
(Parties: 客户/主要联系人/状态;Terms: 期限/起止日期/合同额),在那里跑了真复现:
**其它 tab 上已填的值在校验失败后全部存活**(哨兵字符串完好;lookup 值也存活——
第二次提交只报 `Status is required`,不再重报客户/联系人),失败提交零网络写入,tab 头未错乱。
残留问题是 lookup 控件重挂载后显示回 "Select..." 但值仍在(#692)。

**C4 的两点修正**(推翻 rc.0 的记录):① `crm_contract` **根本没有状态看板** ——
只有 Grid/Calendar/Gantt/Timeline,该前提在当前 main 不存在;② 看板拖拽**可以自动化验证**,
在 `pipeline_kanban` 上用真实鼠标 API(mouse.down + 30 步插值 move + up)触发了真实
`PATCH` 200,读回 `stage=needs_analysis / probability=40 / expected_revenue=10000`。
rc.0 的观察项 O1「合成事件不触发 dnd」成立,但由此得出的「不可自动化」结论应予撤回。

**新发现(已立案)**:#688(p0,`visibleOn` 被无视致 `crm_lead` UI 完全无法创建)、
#689(未声明字段由 SQL 失败兜底,hook 已先执行,完整 INSERT 连值落日志)、
#690(`crm_forecast.display_title` 全行为 null)、#691(缺失 master-detail 父记录返回 403 而非 400)、
#692(lookup 显示回退)、#693(级联删除报错指向错误对象)。

## 6b. Actions 全量(执行者 W2B)

**26 个 action:25 通过 / 1 失败。** 测试数据 `RC1ACC-W2B-` 前缀(96 行台账,逐行记录最终去向)。

- **11 个业务 action 全部通过**,每个都验证到真实数据效果:工单升级/关闭(字段联动 +
  按钮可见性规则)、线索转化(客户+联系人+商机三件套)、跟进任务 + `next_followup_date`
  盖章、报价生成(QTE-0003 + 商机 stage→proposal)、克隆、`send_email`(sys_email 落库
  status=sent + 时间线 + 双向 recency 盖章)、`mark_primary`、市场活动报名(含去重:二次
  执行 `count:0,skipped:1`)。
- **15 个活动类 action(3 种 × 5 对象)全部通过**:每个组合验证 `crm_event` +
  `sys_activity` + `crm_event_attendee` 三类产物;工单 `first_response_date` 首次通话
  盖章、后续不重复盖章;`schedule_meeting` 的日期+时间对拼成 UTC 精确无误。
- **唯一失败:`mass_update_stage`**(#508 仍复现,见 §7)。
- **rc.0 的标志性缺陷(200 包裹内层失败 + 弹窗静默关闭)已专项探测,未复现**:
  `/actions` 路径的失败现在返回 400/404 并显示红色错误 toast。
- 已知项确认:#673(`sys_activity.actor_name` 存原始用户 id)行为未变,且 UI 时间线
  直接显示该原始 id。

**W2B 的新发现**:#698(工单自动编号计数器落后于既有数据,REST 建单连续 409 且每次失败
烧号,实测重试 25 次才成功;另发现种子行 `organization_id=NULL` 的口径不一致)、
#682 追加(时间线钻取渲染原始 key `detail.viewSource`;Activity tab 计数只数审计行)、
**#548 的定量证据**(见 §8)。

**流程性限制**:`sys_activity` / `sys_email` 按设计拒绝 REST DELETE(405),本轮产生的
77 条时间线/邮件工件无法经 API 清理 —— 写阶段验收要想全清,需要管理员清除通道或测试租户隔离。

## 6c. Flows 全量(执行者 W3)

**24/24 通过。** 测试数据 `RC1ACC-W3-` 前缀;判定基座是 `GET /api/v1/automation/<flow>/runs`
返回的逐节点运行记录(含 `trigger.userId`)—— 每条"触发/拒绝"结论都有 run 行或日志行背书。

| 组 | 结果 |
|---|---|
| 6 条 screen flow(W2B 已深测,轻确认) | ✅ 全过,含报价折扣计算(200000×0.9)与转化联动 |
| 9 条 record-change(用户会话驱动) | ✅ 全过:trigger.userId=admin,数据操作全部执行,通知实际送达(sys_inbox_message + sys_email sent) |
| 2 条审批流 | ✅ 全过:批准/驳回双路径、`sys_approval_request` 创建、`RECORD_LOCKED` 锁定强制、批后解锁、≤$500K 跳过 director 签核的分层路由、阈值下不触发的对照 |
| 7 条 scheduled | ✅ 全过:cron 注册有据(当天 07:30/08:00 实际执行记录)+ 人工触发扫全部验证到效果(SLA 违约升级、到期任务提醒+去重、合同续约三件套+幂等、报价/合同过期、活动完结、预测快照);两条 00:00/01:00 槽位因服务器当时未运行仅注册可证 |
| demo_bootstrap | ✅ #663 修复确认:list+assignment 形态每 10 分钟全绿,无 findOne 报错 |

**审批流的环境保留**:本库 `sys_user_position` 为空(未跑 demo:staff),审批按声明的
`onEmptyApprovers: 'admin_rescue'` 由 admin 裁决 —— 岗位实际路由在本安装不可验,已按声明行为通过。

**#684 判定(已评论至 issue,建议升级严重度)**:用户会话路径**健康**(全部 record-change 流
trigger.userId 就位、零 REFUSED,且用户身份穿越多跳链与挂起恢复);系统路径**全断**,并在窗口内
实证**审批绕过**:$150K 的流建商机以 `approval_status='not_required'`、不锁定、无审批请求直接放行
—— 恰是 on-create 审批流存在的目的场景。潜在延伸:经 Close Case 按钮关闭的工单,其 CSAT 流以
无用户状态挂在 P1D 定时器上,到期通知可能被拒(#684 评论 N4)。

**W3 的新发现(已立案)**:**#700**(p1,自动化引擎系统扫插入的行 owner_id/organization_id/
created_by 全 NULL,出生即 admin 不可改删;demo_bootstrap 十分钟自愈是演示拐杖,真实安装没有)、
#701(记录变更流重入自身,拦住死循环的是引擎 loop-breaker 而非作者写的 start condition)、
#702(启动重播种 × 快照流互动产生无 owner 幻影预测行)。#698 的 409 风暴当日未再现
(计数器已被烧穿越过种子区,机制未修,新库仍会复现 —— 已评论)。

**清理**:36 条业务记录删除(200);**1 条定时扫创建的 crm_forecast 行被 #700 阻塞留存**
(demo_bootstrap 不认领 crm_forecast,故永不自愈 —— #700 最纯净的活体证据);按设计不可删的
sys_* 通知/审批工件与 2 条无用户的 CSAT 挂起 run 留存并记录;未触碰 W2/W2B 残留与种子数据。

## 6d. Profile 权限矩阵(执行者 W4)—— 矩阵不成立

**188 个探针(每用户各自 token):134 匹配 / 38 真实不匹配 / 13 信息项。**
测试用户 4 个(`rc1acc-w4-{rep,mgr,agent,mkt}@test.local`,留在库中未删);system_admin
断言以 dev-admin(org owner)执行 —— 纯 CRM system_admin 集用户无法经 create-user 构造,
该保留已记录。

**5 个根因解释全部 38 处不匹配(逐条已立案)**:

| # | 根因 | 后果 | issue |
|---|---|---|---|
| 1 | 平台 `member_default` 集带 `*` 通配 allowCreate/Read/Edit,并集合并进每个成员 | 对象门在建/读/改三轴失效:**21 个建拒探针全部 201**(含 service_agent 在显式全否商机上建单);public_read 对象对无授权者返回**全部行** | **#703(p0)** |
| 2 | `controlled_by_parent` 读取全组织开放(插入侧却正确按父门控) | service_agent 0 可见商机 → 读全部 74 行项目价格;rep 1 可见客户 → 读全部 14 联系人 | **#704(p0)** |
| 3 | `modifyAllRecords` 对行级写门无效;edit 级 `sys_record_share` 实际只给读 | sales_manager 改不了任何非本人创建的记录;团队/领地/升级三条 edit 共享全部只读 | **#705(p1)** |
| 4 | #547 验证过的 `marketing_campaign_updates` RLS 写扩权回归失效(member 扩权仍好) | marketing 改不了非本人建的 campaign;错误形状显示 sharing 中间件在 RLS 之前抢答 | **#706(p1)** |
| 5 | org-admin 路径绕过 17.0 allowExport 硬门 | admin 导出 quote/campaign/task 均 200(四个真实角色的导出位全部精确) | **#707(p2)** |

**完好的层(与声明 100% 一致)**:字段级安全(internal_notes 掩码、只读字段、过滤谓词拒绝
全部精确)、四个真实角色的导出位、private OWD 的读行集(own 与 viewAll 均为精确行集)、
is_private RLS(五角色列表+单记录 GET 双验)、共享规则的**读**扩权与撤销(含钩子即时命中
新建记录)、删除轴、审批 slate 解析。

**#548 系统化判定(已评论至 issue)**:所有权分裂在**三列** —— `owner`(仅 UI 与
is_private 谓词)、`owner_id`(可见性)、`created_by`(经 member_default 通配 RLS 共同门
控写)。改 `owner` 不移动任何访问;直接改 `owner_id` 只移动读;**完整所有权移交在任何 API
面上不可能**。NULL `owner_id` 行对 admin 的改删双 403 复现;demo_bootstrap 对 crm_task
数分钟自愈、对 crm_event 永不(留有活体标本 `m2amex4D0LZYYr16`)。

**连带发现**:**#708(p1)** demo_bootstrap 认领扫把 owner 未显式设置的用户新建记录改判给
第一个用户(rep 的报价 10 分钟内被静默没收 —— #620 的 owner 默认失效使用户记录与无主种子
在 `owner` 列上不可区分);**#709(p2)** 矩阵文档承诺了平台无法兑现的写权(marketing 的
contact 建被 master-detail 门拒;agent/mkt 的"可编辑"期望在 owner_id+created_by 写门下
不可实现)。#549 现状确认(领地共享客户的子相关列表为空 —— 但注意对 cbp 子对象该问题
方向相反:所有人读所有行,见根因 2)。

**环境注记**:后台演示流使种子计数在会话中漂移(无 W4 写入时 accounts 13→12 等),
故所有行集断言按记录 ID 隶属验证而非总数;≥100k 商机创建即自动送审并 RECORD_LOCKED
(admin 亦不可 PATCH,删除不受锁限);可能残留 1 条指向已删 fixture 的 sys_record_share。

## 7. 平台阻塞 issue 复测

**10/10 完成:9 条解除,1 条仍复现。** 每条判定已评论到对应 issue(含证据与建议)。

| issue | 判定 | 关键证据 |
|---|---|---|
| #520 | ✅ 解除 | 客服仪表盘 38 工单全部出数,时间窗序列正常 |
| #523 | ✅ 解除 | 矩阵报表按月/季/日正确分桶有序 |
| #521 | ✅ 解除 | 全程 **0 条 FORBIDDEN**;script body 对 crm_contact 与受共享治理的 crm_case 的 UPDATE 均持久化 |
| #522 | ✅ 解除 | 按对象派发全通;`/actions/global/...` 干净 404(ADR-0110 治理文案);失败非 200 + 红 toast |
| #509 | ✅ 解除 | 与 #522 同一证据基座;'global' vs '*' 幽灵消失 |
| #508 | ❌ **仍复现** | 多选零请求 + "select exactly one row";REST `selectedIds` 无法送达(顶层被忽略、params 被校验器拒);单选路径死于 CRM 侧 `update(id,{stage})` 签名 bug。**诚实性已修**(无假成功),功能仍缺 |
| #524 | ✅ 解除 | 菜单项活;工程化构造的服务端失败(amount=0)以红 toast 逐字回显,线索未变 |
| #510 | ✅ 解除 | `{current_user_id}` 解析为绑定参数(32 行 ≡ 字面 id ≡ 对照);未知 token 响亮报错并给建议。CRM 侧"My"widget 恢复仍是待办 |
| #526 | ✅ 解除 | plan 预警占用 + apply 拒绝 + `--yes` 确认门,全链验证 |
| #528 | ✅ 条件消失 | 新库 5 个 `__search` 列全活跃、plan in-sync;孤儿仅存于 rc.0 旧库 |

残留的上游小尾巴(不阻塞,已在各 issue 记录):automation resume 路径仍 200 包裹内层失败
(console 已会读内层信封,用户可见错误);migrate 占用拒绝退出码为 0。

> 已取得判定的细节:

- **#520(datetime 时间窗过滤返回空集)—— 已解除。** rc.0 下客服仪表盘全空;rc.2 下
  38 条种子工单全部出数:未结 30 / 紧急 7 / 平均解决 45.0h / SLA 违约 3,30 天日粒度
  时间序列有数,与 REST 直查结果一致。上游 objectstack#3912 已关闭。
- **#523(矩阵报表日期粒度缺失)—— 已解除。** `lead_inflow_by_month_source` 正确按月分桶
  (2026-02…2026-08),`pipeline_coverage_by_quarter` 按季(2026-Q3/Q4),
  `cases_opened_by_day_priority` 按日(2026-07-06…2026-08-04),均按时间正序且同期记录
  聚合入同一列,rc.0 的"逐原始日期爆列"现象消失。
- **#526(migrate 对占用中的库缺少保护)—— 已解除。** 隔离环境(4009 端口独立库)全链验证:
  ① `plan` 对运行中的库**预警占用**(报出持有 pid 与 wal/shm 证据);② `apply --allow-destructive`
  在任何 DDL 前**拒绝执行**并提示 `--force` 逃生门,已植入的漂移列未被触碰;③ 即便服务已停,
  apply 也要求显式 `--yes` 确认 —— rc.0 的"确认前即发 DDL"行为消失;④ 停服 + `--yes` 后正确
  应用并删除漂移列。残留小缺口:占用拒绝的退出码为 0(脚本会误判成功),已在 issue 评论中记录。
- **#528(孤儿 `__search` 列)—— 新库上条件已不存在。** 全新 rc.2 库 5 个 `__search` 列
  全部活跃,`migrate plan` 对运行中的库报 in-sync、零孤儿(对照:故意植入的垃圾列**被**正确
  标记为 destructive,证明检测器本身工作正常)。上游 #3955 修复确认;issue 里的"9 个孤儿"
  仅存在于 rc.0 时代的旧库,建议按"仅限遗留库"重新界定或关闭。

## 8. CRM 侧遗留与新发现

> 本节在全部阶段完成后定稿。已立案:

- **#684**(本轮新立,p1)记录变更流漏了 `runAs: 'system'`:10/21 个流文件已为**定时流**
  加上该声明并附相同注释,但**记录变更流被系统写入触发时同样没有用户**这一情形被漏掉。
  单次启动+种子+一轮 CRUD 写入即产生 **73 条 `[runAs]` 拒绝警告与 12 次运行失败**
  (`case_escalation` 38/3、`opportunity_approval` 23/9)。影响:种子加载、流触发流、
  未来的集成/webhook 写入都会静默丢失这些自动化。用户会话路径的判定由 flows 阶段(W3)补齐。
- **#548 在本轮取得定量证据**(已评论到 issue):action 沙箱 `ctx.api` 插入只盖 app 层
  `owner`,从不盖平台 `owner_id` —— 19 条 action 创建的 `crm_event` 全部 `owner_id=NULL`,
  admin 对其 DELETE 与修复性 PATCH 均 403;级联进一步使 9 条父记录(2 商机/1 工单/2 联系人/
  1 客户/2 线索)不可删除。**实际语义:任何被记录过通话/会议的记录,对所有人永久不可删除。**
  对照:REST 直建的 event 删除 200 —— 差别就在创建路径是否走平台 owner 盖章。
- **#696**(本轮新立)报名过市场活动的线索/联系人无法删除(级联置空 campaign_member 引用
  后违反其自身校验);#698(本轮新立)工单自动编号计数器落后 + 失败烧号。
- **权限/所有权模型一族(本轮最重,§6d 详述)**:#703(通配授权架空对象门,p0)、
  #704(cbp 读全组织开放,行项目价格泄漏,p0)、#705(modifyAllRecords 与 edit 共享不给写)、
  #706(#547 的 campaign 写扩权回归)、#707(admin 绕过导出硬门)、#708(demo_bootstrap
  没收用户记录)、#709(矩阵文档承诺平台无法兑现的写权)。#700(定时扫产物 owner_id=NULL,
  与 #548 同根不同写入方)。
- **rc.0 遗留观察项本轮状态**:O3(时间线显示原始用户 id)= 既有 #673,确认未变且 UI 可见;
  O4/O5(浮点/Markdown 格式)未专门复验;L1–L4 未在本轮范围。

## 9. 诚实记录(测试过程说明)

- **一个假设先被证伪、随后又被翻转过来 —— 完整经过如下**,因为中途任一步停手都会写出错误结论:
  1. dev 日志出现 `SqliteError: … table crm_forecast has no column named name`
     并以 `[REST] Unhandled error` 抛出,我推断"未声明字段被直送 SQL 层"。
  2. 用对照探针**证伪**:`POST /api/v1/data/crm_account` 带虚构字段返回干净的
     **400 `INVALID_FIELD`**;`crm_forecast` 带 `name` 同样 **400**。看上去校验是正确的,
     我据此撤回了假设,并明确不立案。
  3. 但随后核对 W1 的精确请求记录发现:那次 400 的时间戳是 02:26:22.917,SqliteError 是
     .994 —— **同一次请求的两个层次,不是两次请求**。回查我自己那次探针的日志,
     同样留下了完整的 `SqliteError` + `[REST] Unhandled error`。
  4. **结论**:原假设方向是对的,但症状判断错了 —— 客户端拿到的 400 **是 SQL 失败被翻译后的产物**,
     而非 schema 校验的结果。佐证:失败的 INSERT 里含有调用方从未提交的 `period_label`
     (由 `forecast.hook.ts:89` 派生),证明 **beforeInsert hook 在请求被判定非法之前就已执行**。
     已按此立案 **#689**(含 hook 副作用暴露、日志噪声、字段值明文落日志三点后果)。
- 教训:一次"干净的 400"不足以证明校验发生在正确的层次;必须同时看服务端日志。
- 上述探针创建的 2 条记录(1 客户、1 预测)已 `DELETE` 并经 GET 404 验证清除;
  W1 的 30 条台账记录 + 3 条 hook 派生任务同样已清理,全库零残留。
- **未予断言的一点**:被拒绝的那次 INSERT 中自动编号取值为 `ACC-000003`,而该编号已被种子
  客户占用。这暗示自动编号是插入时计算而非预留,但我没有隔离验证,因此**没有**把它写成缺陷,
  只在 #689 里留了一句提示。
- `display_title` 是公式字段,写入时被拒为 `Unknown field` —— 报错措辞对只读计算字段有误导性
  (低优先观察项,未单独立案)。
- **rc.0 报告的两处记录经本轮推翻**,已在 §6 注明:合同状态看板在当前 main 并不存在;
  看板拖拽**可以**自动化验证(rc.0 结论「不可自动化」应撤回)。
- **W1 的一条发现被 W2B 推翻并撤回**:W1 曾报告"screen flow 在条件显隐的必填字段留空时
  静默无操作"(0 请求、0 提示)。W2B 复跑同一场景:客户端以红 toast「Please fill:
  Opportunity Name」拦截、弹窗保持打开 —— **不静默、不可复现**。已在 #524 评论中声明撤回,
  以 rc.2 行为为准。两次观察相隔数小时、同一构建,差异原因未明(W1 可能受当时表单状态干扰);
  按证据规则,不可复现的发现不予保留。

## 10. 阶段完成度(续跑更新)

首轮在 W2 开始后因额度耗尽中断;额度恢复后续跑,当前状态:

| 项 | 状态 |
|---|---|
| 26 个 actions 全量 | ✅ 已完成(W2B,§6b)—— 中断的 W2 无有效结论,已由 W2B 全量重做 |
| 阻塞 issue 复测 10 条 | ✅ 已完成(§7,9 解除 / 1 仍复现) |
| #526 / #528 CLI 复测 | ✅ 已完成(隔离端口+独立库,§7) |
| 24 条 flows 全量 | ✅ 已完成(W3,§6c)—— 24/24 通过,#684 判定已评论 |
| 5 profile 权限矩阵 | ✅ 已完成(W4,§6d)—— 矩阵不成立,5 根因 7 新 issue |

若本会话再次中断,剩余工作按 [parallel-task-packages.md](./parallel-task-packages.md)
的 P3/P4 包投放即可。

### 终止时的环境状态(诚实记录)

- W2 被终止时留下了测试记录,已尽力清理:campaign member 8 条、部分线索/联系人/市场活动
  已删除(200)。**仍有残留**:6 条 `crm_event`、2 条 `crm_case`、2 条 `crm_opportunity`、
  2 条 `crm_contact`、5 条 `crm_lead`、1 条 `crm_account`,均带 `RC1ACC-W2-` 前缀。
  该库是容器内的临时 SQLite(`.objectstack/data/dev.db`,已 gitignore),随容器回收,
  不影响仓库与其它环境。
- **清理受阻本身暴露了两个问题**,其一已立案:
  - **#696**(已立案):报名过市场活动的线索/联系人无法删除 —— 级联把 campaign_member
    的引用置空后违反其自身校验规则。删掉 campaign member 后线索即可删除(400 → 200),
    机制已证实。
  - **当时未立案的观察,后经 W2B/W4 坐实**:admin 对活动类 action 创建的 `crm_event` 删除
    返回 **403 FORBIDDEN**。W2B 与 W4 隔离验证确认这是 **#548 的机制**(action 沙箱与
    自动化引擎的系统上下文插入都不盖 `owner_id`,而访问键控 `owner_id`),证据已系统化
    评论到 #548,并把"不同写入方"的自动化引擎路径单列为 #700。当初"先不立案、避免重复"
    的判断被后续证据证明是对的 —— 它确实是 #548 而非新缺陷。

## 11. 附录 A:GA 发布时需重跑的最小回归清单

从本轮结果提炼。**打 ★ 的是本轮已验证通过、GA 时只需确认未回归的项;打 ⚠ 的是本轮未验证或
已知失败,GA 前必须真正跑通。**

### A. 自动化闸门(必须全绿,约 3 分钟)

1. ★ `pnpm verify` —— 退出码 0,vitest 52 文件 / 1280 通过
2. ★ `pnpm test:e2e` —— 16/16(含冷启动 + 种子)

### B. 平台阻塞项回归(rc.0 的三个升级阻断项)

3. ★ **#520** 客服仪表盘出数:未结工单、紧急数、SLA 违约数非零,30 天时间序列有数
   —— datetime 时间窗过滤的判定现场
4. ★ **#523** 三个矩阵报表的日期列按月/季/日正确分桶且有序,无"逐原始日期爆列"
5. ★ **#521** 带写库 body 的 script action(如 `close_case`)执行后**写入确实落库**
   (本轮:全程 0 FORBIDDEN,已解除)
6. ★ **#522 / #509** 全局 action 派发 + 失败非 200 + UI 可见报错(本轮已解除)
7. ⚠ **#508** `mass_update_stage` 三条调用路径 —— **唯一仍复现的阻塞项**,GA 前须修
   (平台不传 `selectedIds` + CRM `update(id,{stage})` 签名 bug 两半都缺)

### C. 核心业务链路(每条都有真实数据效果判据)

8. ★ 商机生命周期:`proposal/10000` → probability=60、expected_revenue=6000;
   无 `win_reason` 关闭被 400 拒绝;补齐后 probability=100、close_date 盖章
9. ★ 线索转化 screen flow 端到端:线索标记 converted,客户/联系人(按需商机)真实生成,
   **industry 枚举跨对象映射不报错**(rc.0 的失败点)
10. ★ 行项目 rollup:报价/商机行项目增改后父记录金额重算(注意 rollup 是 **async**,
    勿在同一 tick 断言)
11. ★ 24 条 flows 用户会话驱动路径(本轮 24/24 通过);⚠ **#684** 系统驱动路径仍全断,
    含审批绕过 —— 修复后须复验 `runAs:'system'` 缺失的 7 条记录变更流

### C2. 权限与所有权模型(本轮最重的失败区,GA 前必须逐条复归)

12. ⚠ **#703(p0)** 任何 profile 不能在其被拒对象上建记录(当前 21/21 建拒探针都 201)
13. ⚠ **#704(p0)** `controlled_by_parent` 读取须随父可见性,不得全组织开放
    (当前 service_agent 在 0 可见商机下读全部 74 行项目价格)
14. ⚠ **#705** sales_manager 的 `modifyAllRecords` 与 edit 级共享须真正给写(当前全 403)
15. ⚠ **#706** marketing 的 campaign 写扩权(#547 曾验证通过,rc.2 回归)
16. ⚠ **#548 / #700 / #708** 所有权:owner 重指派应移动访问;定时扫/action 创建的记录
    不得 owner_id=NULL 而对 admin 不可改删;用户记录不被 demo_bootstrap 没收
17. ★ FLS(掩码/只读/过滤谓词拒绝)、private OWD 读行集、is_private RLS、四角色导出位、
    共享**读**扩权与撤销 —— 本轮 100% 匹配,GA 时确认未回归

### D. UI 可用性(本轮发现的重灾区)

18. ⚠ **#688(p0)** 从界面新建线索必须能成功 —— 当前完全不可用
19. ★ 多 tab 表单校验失败后,其它 tab 已填值不丢(在 `crm_contract` 上测,
    `crm_case` 已无跨 tab 必填布局)
20. ★ 看板拖拽触发真实 PATCH 且 hook 重算(用真实鼠标 API,合成事件无效)
21. ⚠ 删除链路:报名过市场活动的线索可删除(#696);action 创建的记录 admin 能删除
    (当前被 #548/#700 阻塞)

### E. i18n(抽查即可)

22. ⚠ 四语言的 **action 标签与校验文案**(本轮:标签与文案均正确,
    但参数弹窗标题仍是英文 #680)
23. ⚠ `objectstack lint` 不带 `--skip-i18n` 的警告数**不高于 710**(本轮基线),
    确认债务未继续增长

### 执行顺序建议

A → B → C → C2 → D → E。A 不绿则其余不必开始;B 或 C2 中任一 p0 失败即为**升级阻断**,
应在 GA 前解决或明确接受。
