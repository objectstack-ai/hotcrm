# 已知问题排除表(走查前必读,走查后必更新)

用途:走查 agent 观察到下列现象时**不再报告/立单**(重测清单点名的除外)。
每轮走查结束:新立的单加入;评论确认修复的移出。
最近更新:2026-08-07(rc.4 走查会话,session_01XnUN9e2ZYhp8b6nJbPqwas)。

## 仍开放的已立案问题(rc.4 实测状态)

### 平台/console 侧

| 单 | 现象 | rc.4 状态 |
|---|---|---|
| hotcrm#664 | 详情页地址字段渲染原始 JSON(表单侧正常) | 仍复现 |
| hotcrm#680 | 参数弹窗标题渲染原始英文 label,弹窗内其余已本地化 | 仍复现 |
| hotcrm#682(残留) | 视图切换器 Grid/Kanban/Calendar/Gantt/Timeline 英文;列表页脚 `Sum:`/`Avg:` 英文;仪表盘过滤器标签 `Owner:`/`Lead Source:` 与 KPI 副标题英文 | 部分残留 |
| hotcrm#524(残留) | flow 内部节点失败(如 create_opportunity)静默吞掉:resume 200、弹窗关、零提示 | 仍复现 |
| hotcrm#698 / objectstack#5495 | autonumber 计数器无视种子行:有唯一约束的对象 409,无约束的静默重号(CPG/KA/ACC 实测) | 仍复现 |
| objectstack#5142 | 活动 feed 打印未翻译英文字段标签 + 裸 lookup ID | 仍复现 |
| objectstack#6178 | analytics runtimeFilter owner_id 不加表前缀 → join 维度 widget 500 | rc.4 新立 |
| objectstack#6179 | /auth/me/permissions 不展开 position 权限集,客户端 FLS 全盲 | rc.4 新立 |
| objectstack#6180 | formula `scale: 2` 引擎/UI 双双不生效 | rc.4 新立 |
| objectstack#6181 | 审计日志无认证/权限/配置事件 | rc.4 新立 |
| objectstack#6182 | meta API 未知类型 200 空而非 404 | rc.4 新立 |
| objectui#3551 | 确认弹窗正文不走 confirmText 翻译键 | rc.4 新立 |
| objectui#3552 | 看板拖拽被 403 拒后卡片不回滚 | rc.4 新立 |
| objectui#3553 | 时间线分组头渲染 `[OBJECT OBJECT]` | rc.4 新立 |
| objectui#3554 | 表单给 FLS 禁写字段注入默认值 → 受限用户整单 403 | rc.4 新立 |
| objectui#3555 | Studio flow linter `vars` 作用域误报 + 无默认分支噪音 | rc.4 新立 |
| objectui#3556 | 导出 CSV 文件名 "download" | rc.4 新立 |
| objectui#3557 | Setup 数据源页整页未本地化 | rc.4 新立 |
| objectui#3558 | lookup 副标题渲染原始 markdown | rc.4 新立 |

### 应用(hotcrm)侧

| 单 | 现象 | rc.4 状态 |
|---|---|---|
| #494 / #645 / #661 家族 | 应用翻译包债务:flow screen 标签(Conversion Details/Submit…)、表单分组标题(Lead Details)、表单 tab 名(Parties/Terms…)、confirm 正文英文兜底等 | 开放 |
| #1030 | lead_conversion 参数屏 Amount 未标必填(服务端必填) | rc.4 新立 |
| #1031 | crm_opportunity_line_item 缺 nameField → 相关卡片裸 ID | rc.4 新立 |
| #1033 | rep 转化线索必失败(flow 写 FLS 禁写 annual_revenue)| rc.4 新立 |
| #1034 | 线索详情看不到已记录通话(缺事件相关列表) | rc.4 新立 |
| #1035 | 商机表单概率被 stage 默认静默覆盖 | rc.4 新立 |
| #1037 | 撤回审批后 approval_status 落 "rejected" | rc.4 新立 |
| #510 | 个人向仪表盘 widget 无用户 token | 开放(未复测) |
| #549 | 领地共享客户上,rep 看到读不了的报价/任务/合同相关列表 | 开放(未复测) |

## 观察项(非缺陷,勿报)

- sharing 收窄导致的空列表(rep 看不到 EU 客户、agent 看不到无共享工单、
  marketing 看不到报价/工单)——UI 与 API 一致即为设计行为。
- 营销成员相关列表在 flow 刚跑完后偶发空列(刷新即恢复,rc.4 偶发一次,未立单;
  再次稳定复现则立 objectui 单)。
- 业务单元 0 行:种子不含业务单元,面板本身正常。
- API 密钥页无创建入口:按设计,密钥由 auth/provisioning flow 写入。

## rc.4 已确认修复(从排除表移出,回归位保留在 checklist 里)

#521(action 写库 FORBIDDEN)、#525(多 tab 丢值)、#688(visibleOn 被无视)、
#681(语言不持久)、#692(lookup 显示回落)、#690(forecast 标题空)、
#682 之 1/4(占位符对象名、en 连接符)。
