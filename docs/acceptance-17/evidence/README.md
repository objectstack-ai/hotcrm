# evidence/ —— rc.2 验收的执行记录与准备资产

本目录是 2026-08-05 那轮验收的原始产物,供复核判定、或接手时直接复用。
入口页是 [../HANDOFF.md](../HANDOFF.md),结论页是 [../test-report.md](../test-report.md)。

## 准备资产(下一轮可直接用)

| 文件 | 内容 | 用途 |
|---|---|---|
| `retest-playbook.md` | 10 条阻塞 issue 的可执行复现手册,逐条给出 REST 命令、FIXED/仍复现 的判据、上游 issue 关联、是否写数据 | P2/P5 包的输入。**其 auth 章节有误** —— 它猜测端点是 `/auth/login`,实际是 `/api/v1/auth/sign-in/email` |
| `permission-matrix.md` | 5 profile × 17 对象的声明期望矩阵、字段级权限、sharing 规则、可 API 校验的断言清单、测试用户创建方式 | P4 包的输入 |

## 执行记录

| 文件 | 执行者 | 范围 |
|---|---|---|
| `r1-objects.md` | R1(只读) | 14 个带视图对象的列表/详情 + 3 个子对象经父相关列表 |
| `r2-analytics.md` | R2(只读) | 5 仪表盘(widget 级)+ 10 报表;含 #520 与 #523 的解除判定依据 |
| `r3-i18n.md` | R3(只读) | en / zh-CN / ja-JP / es-ES 四语言矩阵、lint 量化、locale 切换机制 |
| `w1-crud.md` | W1(写) | 17 对象全量 CRUD 矩阵 + C1–C6 定向检查 + 6 条新发现的完整论证 |
| `w1-ledger.md` | W1(写) | 数据台账。记录已全部清理,保留作为台账格式范例 |

W2(actions + 阻塞复测)在开始不久后因额度耗尽被终止,无有效结论,故无记录文件。

## 关于截图

四位执行者共产出约 **200 张截图(33MB)**,**未入库**,留在当时容器的 `/tmp` scratchpad 中,
**已随容器回收而丢失**。

上述记录文件、[../test-report.md](../test-report.md) 以及本轮所立的 issue 中,
仍按文件名引用这些截图(如 `shots/uif-crm_lead-02-after-submit.png`)。
这些引用现在只说明"当时确实拍过该证据",**无法再打开**。

需要视觉证据的判定 —— 尤其 **#688**(`crm_lead` UI 无法创建)—— 请在接手环境重新截取。
纯 REST 判定不受影响:状态码与响应体都完整写在记录里。
