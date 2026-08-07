---
name: crm-acceptance
description: >
  HotCRM 业务验收走查技能 — 按 persona × 旅程清单在真实浏览器里全功能验收一个
  发布候选(rc)版本:五角色账号开通、常驻 Playwright 驱动、反假阳性纪律、
  三态重测协议、分仓立单路由。Use whenever the task is "全功能走查/验收 rc.x"、
  "按角色实测 CRM"、"重测已立案的浏览器问题"。方法论(环境隔离/构建模型/验证纪律)
  沿用 objectstack 仓库的 dogfood-verification 技能,本技能补充 HotCRM 特有的
  范围(checklist.md)与流程约定。NOT a customer-published skill — internal
  agent tooling(lives in .claude/,never in a published skills dir)。
metadata:
  internal: true
---

# CRM 业务验收走查(crm-acceptance)

三份附件,缺一不可:

- **[checklist.md](./checklist.md)** — persona × 旅程业务清单。走查按单勾销,
  报告里给出每条的 通过/失败/跳过(说明原因),漏测必须可审计。
- **[known-issues.md](./known-issues.md)** — 已知问题排除表。走查前读,防重复报告;
  **每轮走查结束后必须更新**(新立的单加进去,确认修复的移走)。
- **[harness/](./harness/)** — 浏览器驱动脚手架(常驻 driver + 角色开通脚本)。

## 0. 环境与账号(每轮走查的固定前置)

1. 按 objectstack 仓库 `.claude/skills/dogfood-verification` 的 §0-§2 隔离环境并启动:
   自选空闲端口(非 3000/3001/3210/4001),`pnpm dev`(objectstack dev)+ 健康检查
   `GET /api/v1/health` → 200。
2. `pnpm demo:staff -- --url http://localhost:<port>` — 开通 na.rep / eu.rep /
   sales.manager(密码见 `src/sharing/demo-staffing.ts`)。
3. `node .claude/skills/crm-acceptance/harness/staff-extra.mjs <port>` — 临时开通
   service.agent@objectos.ai / marketing.user@objectos.ai(demo1234)并重估共享规则。
   (这两个角色暂不进 demo-staffing.ts:那张表有"每个 position 必须被规则或权限集
   引用"的测试锚,入表需单独评审。)
4. 启动 harness driver(见 harness/README),五角色各自独立浏览器上下文。

## 1. 走查纪律(rc.4 实战验证过的规则,违反过就误报过)

- **截图 + API 双证**:任何 "缺失/坏了/打不开" 的断言,必须同时有渲染后截图和
  权威 API 响应佐证。导航后等 2-3s 再查 DOM;单次 DOM dump 不作数。
- **空列表 ≠ 缺陷**:先用该角色身份查 API(`total` 多少)。sharing 按设计收窄
  可见性;UI 与 API 一致的空列表是观察项,不是缺陷。
- **门控测两侧**:visibleOn / requiredWhen / 权限门,依赖存在与不存在各验一次。
- **每条旅程用清单标注的角色跑**:admin 测过 ≠ 该角色能用(教训:#1033,
  rep 转化线索被 FLS 拒死,admin 路径完全正常)。
- **写操作数据前缀**:`<ROLE>-RC<x>` (REP-RC4 / MGR-RC4 / AGT-RC4 / MKT-RC4),
  便于事后清点与排除。
- **并发走查**:五角色可并发(每角色一个子 agent、一个浏览器上下文),但每个
  persona 上下文只能属于一个 agent;给每个子 agent 附 known-issues 排除表。

## 2. 三态重测协议(对已立案问题)

对指定重测清单里的每一单,在新 rc 上按原步骤(或注明的替代路径)复现,结论三选一:
**已修复 / 仍复现 / 回归**,外加"部分修复"时逐子症状拆表。

- 结论以**评论追到原 issue**:环境行(commit、rc 版本、账号)、复测步骤、
  证据(API 状态码/服务端日志/截图文件名)。
- ⛔ **不重复立单**;是否关单留给分诊 PM(评论里可以建议)。
- 原复现路径不可构造时(前置 bug 已修等),找等价路径并在评论里说明
  (先例:#525 在 crm_case 不可构造,改用 crm_contract 跨 tab 复现)。

## 3. 新缺陷立单路由

先在 hotcrm + objectstack + objectui 三仓查重(`search_issues`,关键词换两三组),
再按层立单:

| 层 | 仓库 | 判别 |
|---|---|---|
| 引擎/API/数据 | objectstack | 服务端行为、数据 API、analytics、审计、autonumber、权限解析 |
| console 渲染/交互 | objectui | 表单/视图/弹窗/i18n chrome、乐观更新回滚 |
| 应用元数据/flow/翻译包 | hotcrm | src/ 下可修的对象、视图、flow、translations |

- 标题前缀 `[rc.x]`;拿不准层时在报告里给依据、立到最可能的仓,正文注明
  "修复时先确认层归属"。
- 正文必含:复现步骤、预期 vs 实际、persona、版本号(commit + rc)、证据。
- 不动 `pm:*` 标签、不 assign(分诊 PM 另行处理);**除非**本会话就要自己实现,
  那才走 AGENTS.md 的认领流程。

## 4. 收尾产物

1. 角色走查结果表(每角色:主流程结论 + 亮点/阻断)。
2. 重测三态表。
3. 新单清单(按仓库分组,含判重不立的说明)。
4. 本 rc 对上一轮的总评 + 下一 rc 的门槛建议(按序,区分"必须收掉"与"可带病")。
5. **更新 known-issues.md 并随本轮改动提交。**
