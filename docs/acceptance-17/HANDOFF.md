# rc.2 验收 —— 交接说明

> ✅ **本轮验收已全部完成(8/8 节)。** 本页最初为中途交接而写,现保留作为"如何重跑/续验"
> 的操作指南与踩坑清单。结论看 [test-report.md](./test-report.md);GA 复归清单看其 §11。
> **一句话结论:当前状态不建议 GA 放行** —— 权限模型默认开放(#703/#704 p0)、线索 UI 无法
> 创建(#688 p0)、所有权/写模型破碎(#548/#700/#705)、系统驱动自动化全断含审批绕过(#684)。

给接手复验或修复的下一位(或下一个会话)。**先读这一页,再读别的。**

- **PR**:[#676](https://github.com/objectstack-ai/hotcrm/pull/676)(draft),分支
  `claude/hotcrm-17-rc1-acceptance-hj869o`,基于 `main` @ 5a78f88
- **被测版本**:`@objectstack/*` **17.0.0-rc.2**(任务原文说 rc.1,但 main 已由 #663 升到 rc.2)
- **纪律**:**只测不修** —— 不改 `src/`,发现问题建 issue。上一轮 `src/` 零改动,请保持

## 一、这一页之外该读什么

| 文件 | 用途 |
|---|---|
| [test-plan.md](./test-plan.md) | 验收计划(8 节),已按 rc.2 修订 |
| [test-report.md](./test-report.md) | 报告。**§10 列出未执行项,§11 是 GA 最小回归清单** |
| [parallel-task-packages.md](./parallel-task-packages.md) | 剩余工作的 P1–P5 任务包,**直接照着投** |
| [evidence/](./evidence/) | 上一轮的执行记录与准备资产(见下) |

## 二、进度:8/8 节全部完成

| 计划节 | 状态 |
|---|---|
| 0 自动化基线 | ✅ verify 1280 例、e2e 16/16、冷启动 0 ERROR |
| 1 对象列表/详情 | ✅ 15/17 通过(2 项曾因无种子阻塞,W1 自建记录后补测通过) |
| 2 对象 CRUD | ✅ REST 17/17 全量通过 |
| 3 actions 全量(26 个) | ✅ 25 通过 / 1 失败(#508) |
| 4 仪表盘/报表 | ✅ 5 仪表盘 56 widget、10 报表全部出数 |
| 5 flows 全量(24 条) | ✅ 24/24 通过;#684 判定:用户路径健康/系统路径全断 |
| 6 profile 权限矩阵 | ✅ 188 探针,**矩阵不成立**,5 平台根因(#703-707) |
| 7 i18n 四语言 | ✅ zh-CN 完整,ja/es 有实质缺口 |
| 8 阻塞 issue 复测 | ✅ 10/10:9 解除 / 1 仍复现(#508) |

**若要复验或修复后回归**,按 [parallel-task-packages.md](./parallel-task-packages.md) 的
P1–P5 包重跑对应部分即可;每包自带记录前缀与隔离约定。

## 三、上手三步

```bash
cd /home/user/hotcrm            # 若是新容器,先 clone 并 checkout 上述分支
pnpm install
pnpm dev                        # 端口 4001,等 /api/v1/health 返回 200(约 30s)
```

鉴权(**这一条能省你半小时**):

```bash
TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@objectos.ai","password":"admin123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
```

然后照 [parallel-task-packages.md](./parallel-task-packages.md) 投 **P2 → P3 → P4 → P5**。
写数据的包之间要么串行,要么各用各的前缀(P2 用 `RC1ACC-P2-`,依此类推)。

## 四、踩过的坑,别再踩一遍

1. **鉴权端点是 `/api/v1/auth/sign-in/email`**。直觉的 `/api/v1/auth/login` 返回 **500**
   而不是 404,极易误判成"服务挂了"。
2. **三个入口默认三个不同的 SQLite 库**:`objectstack dev` → `dev.db`;
   `objectstack start` → `objectstack.db`;migrate CLI → `standalone.db`。
   所以 `os migrate plan` **默认根本没看 dev server 的库**;复测 #528 必须显式传
   `--database-url file:/home/user/hotcrm/.objectstack/data/dev.db`。
   另:`migrate plan` 自称 dry-run,却会**新建** `standalone.db` 文件。
3. **控制台 SPA 首次导航要等 8–10 秒**。等太短会读到"列表页没有 New 按钮"这类假象 ——
   上一轮踩过,是测试假象不是缺陷。
4. **看板拖拽必须用真实鼠标 API**(`mouse.down` + 多步插值 `move` + `up`);
   合成 `dispatchEvent` 不触发 dnd 库。用真实 API 是**可以**自动化验证的
   (rc.0 报告说"不可自动化",已被本轮推翻)。
5. **行项目 rollup 是 async**,别在写入的同一 tick 断言父记录金额。
6. **表单弹窗是 `[role="dialog"]`,lookup 选择器会再开一层**,要 `.last()`。
7. **删除测试数据要按子→父顺序**,而且:报名过市场活动的线索删不掉(#696),
   得先删 campaign member。
8. **别做这三件事**:重启/重建 dev server(会毁掉别人的在途数据)、`pnpm demo:reset`、
   `os migrate apply`。#526 的验证要另起独立端口 + 独立库。

## 五、必须先看的两条判定

- **#688(p0)** console 表单无视 `visibleOn` 却强制其 `required` ——
  **`crm_lead` 在界面上完全无法创建**。这是应用的头号演示路径,GA 前必须修。
- **#684** 记录变更流缺 `runAs: 'system'`,系统驱动的写入下自动化被拒。
  **P3 包的关键任务**:验证**用户会话驱动**的写入路径是否正常 —— 这决定 #684 是
  "系统写入下自动化失效"还是更严重。结论请回填到 #684 评论。

## 六、一条悬而未决、**故意没立案**的观察

admin 删除部分记录返回 **403 FORBIDDEN "insufficient privileges to delete"**,
尤其是活动类 action 创建的 `crm_event`(而 W1 用 REST 自建的 event 删除是 200,
差别在创建路径)。

**没立案的原因**:它很可能是既有 **#548**(app `owner` lookup 与平台 `owner_id` 不一致)
的症状,未做隔离验证前立新案有重复风险。**做 P4 时请优先验证这一条**,
然后要么回填 #548,要么据此另立新案。

## 七、evidence/ 里有什么

| 文件 | 内容 |
|---|---|
| `retest-playbook.md` | 10 条阻塞 issue 的可执行复现手册。**注意:它的 auth 章节是错的**(猜了 `/auth/login`),用本页第三节的端点 |
| `permission-matrix.md` | 5 profile × 17 对象的权限期望矩阵 + 测试用户创建方式,**P4 的输入** |
| `r1-objects.md` | 对象列表/详情逐项结果 |
| `r2-analytics.md` | 仪表盘 widget 级 + 报表逐项结果,含 #520/#523 的判定依据 |
| `r3-i18n.md` | 四语言矩阵、lint 量化、locale 切换机制 |
| `w1-crud.md` | 17 对象 CRUD 矩阵 + C1–C6 定向检查全文 |
| `w1-ledger.md` | W1 的数据台账(已全部清理,留作格式范例) |

**截图没有入库**:约 200 张、33MB,留在上一轮容器的 `/tmp` 里,**已随容器回收丢失**。
报告与 issue 里按文件名引用它们,那些引用现在只表示"当时拍过",无法再打开。
需要视觉证据的判定(尤其 #688)请在你的环境重拍。

## 八、上一轮结束时的环境状态

- 上一轮在 W2(actions)开始不久因额度耗尽终止,W2 留下的测试记录已尽力清理,
  仍有少量 `RC1ACC-W2-` 残留(6 event / 2 case / 2 opportunity / 4 contact / 5 lead / 1 account)。
  那个库是容器内临时 SQLite,**已随容器回收**,你会拿到全新种子库。
- PR #676 的订阅已退订(避免 Vercel bot 反复唤醒会话消耗额度)。你若要盯 CI,自行重新订阅。
