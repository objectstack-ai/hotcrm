# rc.2 验收:可并行执行的任务包

本轮验收由单一会话串行编排(写数据的阶段互斥执行)。本文件是**备选投放方式**:
每个任务包自带数据隔离约定,可分别开一个 chat 并行跑,互不干扰。

## 通用前置(每个包都要做)

```bash
cd /home/user/hotcrm
# dev server 若未运行:
pnpm dev            # 端口 4001;等 /api/v1/health 返回 200(约 30s)

# 鉴权(注意:不是 /auth/login,那个路径会返回 500)
TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@objectos.ai","password":"admin123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
# 之后所有请求带:-H "Authorization: Bearer $TOKEN"
```

浏览器测试:Playwright,`executablePath: '/opt/pw-browsers/chromium'`;用
`context.request.post` 打同一鉴权端点,让 cookie 落到浏览器上下文。

## 数据隔离总则

| 约定 | 说明 |
|---|---|
| **记录前缀** | 每个包用**自己的前缀**(下表 P1–P5),写进记录的名称/主题/标题字段 |
| **禁止改种子** | 不修改、不删除任何种子记录;只删自己建的 |
| **台账** | 每包维护 `LEDGER.md`(对象 + id + 名称),结束时按台账清理并记录 DELETE 状态码 |
| **共享 dev server** | 所有包共用 4001 的同一个库。**不要重启 server、不要 `demo:reset`、不要 `os migrate apply`** —— 会毁掉其它包的在途数据 |
| **只读包例外** | P5 只读,可与任意包同时跑 |

> 若要真正物理隔离,改用各自的库与端口:
> `pnpm exec objectstack dev -p 40NN -d file:/tmp/rc2-PN/data.db`(首启会自动灌种子)。
> 代价是每包一次冷启动(约 30s)+ 各自的种子基线数字不同。

---

## P1 — 对象 CRUD 全量(17 对象)

- **前缀**:`RC1ACC-P1-`
- **写入**:是
- **范围**:17 个对象各跑 Create→Read→Update→Delete;REST 为主证据,6 个核心对象
  (account/opportunity/case/lead/contract/event)加测 UI 表单
- **重点**:
  - 商机 hook:stage=proposal + amount=10000 → probability/expected_revenue 派生;
    改 closed_won **必须带 `win_reason`**(否则 400,e2e 已固化该规则)
  - 工单多 tab 表单(#525 现场):记录当前 tab 结构与必填字段所在 tab;若因 #515 已把
    `description` 移到第一个 tab 而**无法构造**跨 tab 校验失败,如实说明并给出当前布局证据
  - `crm_event` / `crm_event_attendee` 种子为 0 行(#671),需自建记录才能测详情页
  - 合同看板拖拽:必须用 `mouse.move/down/up` 真实鼠标事件(合成事件 dnd 库不吃);
    若确实无法自动化,写"不可自动化验证",不得判通过或失败

## P2 — Actions 全量(26 个)+ 相关阻塞项复测

- **前缀**:`RC1ACC-P2-`
- **写入**:是
- **范围**:12 个业务 action + 14 个活动类 action(log_call/log_meeting/schedule_meeting ×
  lead/contact/account/opportunity/case + 全局入口)
- **同时复测**:#521(script action 写库 FORBIDDEN)、#522/#509(全局 action 派发 +
  200 信封吞错)、#508(批量 action 三条调用路径)、#524(flow 型 action)
- **判据**:入口可见 → 参数弹窗 → 执行 → 数据联动正确 → **失败时 UI 必须有可见报错**
  (rc.0 的静默吞错是重点回归点:HTTP 200 但内层 `{"success":false}` 且弹窗直接关闭)

## P3 — Flows 全量(24 条)

- **前缀**:`RC1ACC-P3-`
- **写入**:是
- **范围**:按触发方式分三组(record-change 16 条 / scheduled 7 条 / bootstrap 1 条),
  逐条构造触发条件并留服务端日志证据
- **重点**:已立案的 **#684** —— 7 条记录变更流未声明 `runAs: 'system'`,被系统写入触发时
  数据操作被拒。**必须验证用户会话驱动的写入路径是否正常**,这决定 #684 的严重度;
  结论请回填到 #684 的评论
- **注意**:`case_escalation` 有自触发重入警告(与已关闭的 #507 同形),留意是否复发

## P4 — Profile 权限矩阵(5 profiles)

- **前缀**:`RC1ACC-P4-`(含测试用户名)
- **写入**:是(建用户 + 建记录)
- **范围**:sales_rep / sales_manager / service_agent / marketing_user / system_admin
  各建一个用户,实测对象级 CRUD、readScope/OWD、sharing 规则、字段级权限
- **建用户方式**:`POST /api/v1/auth/admin/create-user` + `sys_user_position` 绑定
  (profile 绑定即 position 绑定,权限集名 = position 名),之后**必须触发 sharing 规则重算**;
  `system_admin` 无对应 position,断言请用 dev-admin 种子账号
- **已知缺口(不要重复立案)**:#548(owner 重指派不移动访问权)、#549(territory/team 共享
  的客户,其报价/任务/合同相关列表 rep 读不到 —— 这是**现状即预期**,per #549 台账)
- **易错点**:17.0 的 `allowExport` 反转 —— 即便 system_admin 对 crm_quote/campaign/task
  也会得到 `EXPORT_NOT_PERMITTED`;唯一被掩码的字段是 `crm_case.internal_notes`(对 sales_rep)

## P5 — 只读复核(可与任何包并行)

- **前缀**:无(不写数据)
- **范围**:#510(分析查询路径解析不到用户 token,"我的…" widget 不可能)、
  #528(孤儿 `__search` 列)、#520/#523 的二次确认
- **已知**:全新 rc.2 库上 PRAGMA 扫描得到 **5 个 `__search` 列**
  (crm_event / crm_opportunity / crm_opportunity_line_item / crm_quote_line_item / crm_task),
  且都是 rc.2 运行时自建、非旧版遗留
- **注意**:`os migrate plan` 默认打到 `standalone.db`,**不是** dev server 用的 `dev.db`;
  要复测 #528 必须 `--database-url file:/home/user/hotcrm/.objectstack/data/dev.db`。
  **只跑 `plan`,绝不跑 `apply`**(#526 未验;且会破坏其它包的数据)

---

## 证据规范(所有包一致)

每项判定必须附以下之一,不接受"看起来正常":

1. **HTTP 状态码 + 响应体**(REST 路径的首选证据)
2. **服务端日志行**(`/tmp/.../scratchpad/devserver.log`,按时间戳定位)
3. **截图**(UI 路径必须有)

判定值:**通过 / 失败 / 阻塞**(阻塞 = 被其它缺陷挡住,无法执行到判定点)。

宣告"缺失/损坏/不可达"这类严重结论前,必须用截图或服务端权威响应复核 ——
导航后立即做 DOM 查询会因 React 未水合返回空结果,rc.0 那轮就因此产生过误判。
