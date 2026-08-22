---
'hotcrm': patch
---

按引擎实况清扫 bare `workflows` 残留：faq / performance-and-limits 的「重新评估 5 次后停止」是虚构的计数器，quotes 的「调整报价对象工作流上的计划」指向不存在的配置面（#899）

#850 / PR #894 清掉的是「工作流规则 / workflow rule」这个字串。本次清的是另一个：把 `workflows`（不带 rule）当成独立于流程的一种东西来讲的散布，7 个页族 ×3 语言，grep 命中面与上一轮不重叠。

**引擎里没有 5 次这个计数器。** PR #854 已在 `content/docs/administration/automation.mdx` 把这条说法改成实况，但两份副本没跟上，文档因此自相矛盾：

- `content/docs/reference/faq.mdx` 的「我的流程没有触发」问答，第 5 条原本让管理员去数「级联是不是超过 5 次停了」。改写为真实的失败模式：流程在上一次运行尚未结束时又因同一条记录被重入，会被引擎的**重入守卫**跳过并记一条警告日志——没有可对照的重新评估次数，守卫是兜底而不是停止条件。整段问答的一等主语从「工作流」收口到流程（标题、「该规则是否已激活」、「先前的工作流」等）。
- `content/docs/reference/performance-and-limits.mdx` 的自动化限制表原本列着 **Workflow re-evaluations per save = 5 (then halts)**，即一个可以据以做容量规划的硬上限。该行改为流程重新评估、并写明没有固定预算：流程自身的写入会重新进入触发顺序，引擎用重入守卫打断自触发环，而不是计次。（同表 `Workflow rules per object` 一行是 PR #894 写下的「该类型已退休」说明，保持不动。）

**两处指向不存在配置面的说法改指真实位置，并如实写明这是源码作者面而非 Setup 界面**（与 #850 A 类同一失效模式）：`content/docs/sales/quotes.mdx` 里「要改扫描时间就去调整报价对象工作流上的计划」——报价对象上没有这样的设置项，该计划是 `src/flows/quote-expiration.flow.ts` 中 `quote_expiration` 流程 start 节点上的 `schedule: '0 1 * * *'`，改它是一次代码改动加重新部署；同段「加一个工作流把报价翻转为审核中」也不再把 workflow 讲成可新建的类型，改为在 `src/flows/` 下新写一条记录变更类流程。

**四处枚举不再把 `workflows` 与流程并列成两种可部署 / 可审计的东西**：`content/docs/administration/index.mdx` 的管理员心智模型（与同页 PR #894 已改的自动化行对齐为流程 / 对象钩子 / 状态机）、`content/docs/administration/sandbox-and-releases.mdx` 的变更包内容枚举与可打包项表格（原表格一行里 `Workflows, flows` 并列了两遍）、`content/docs/reference/security-and-compliance.mdx` 的审计类目、`content/docs/customization/index.mdx` 的开篇分流句（其两个中文版本本就写的是「流程」，本次是英文版对齐）。

workflow 的日常英语 / 汉语义命中不在本次范围，未动：`administration/setup` 的「日常工作流」、`administration/sandbox-and-releases` 的「变更工作流 / 安全的工作流」、`customization/theming-and-i18n` 的小节标题、`customization/testing-and-ci` 与 `marketplace/publishing-your-first-app` 的 GitHub Actions 语境、`service/index` 的「看板式工单工作流」、`service/knowledge-base` 的「内容维护工作流」。

仅文档改动，`src/**` 零改动。
