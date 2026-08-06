---
'hotcrm': patch
---

按元数据写实「HotCRM 内置四个 AI 知识库」这一整套说法（#808）：文档在 12 个页面（三语共 36 个文件）宣称本应用附带 **Sales Knowledge / Product Information / Support Knowledge / Competitive Intelligence** 四个知识库，而 `src/` 里这四个名字一个都不存在——没有任何元数据声明过知识库，没有任何技能绑定到其中之一，Setup 里也没有可供填充种子内容的地方。照着旧版 Day 5 清单操作的管理员，找不到任何一个可以 seed 的东西。

四个名字**不静默删除**，改为写明「本应用不 ship 这样的独立知识库」并指向真实结构：唯一的知识面是 `crm_knowledge_article` 对象及其 7 个分类（入门指南 / 操作指南 / 故障排查 / 账务与价格 / API 与集成 / 版本说明 / 政策制度）。

- `content/docs/ai-copilot/knowledge-bases.mdx`——整页按真实结构重写：四个旧名字逐一给出实际落点，文章对象的字段与检索面，唯一会读文章的技能是 `customer_360`（按已读工单的分类/标签查询已发布文章），以及**不存在**的那些东西（文档摄取、`/knowledge/support/` 目录、嵌入与分块、夜间重新索引、Confluence/Notion 连接器、按技能绑定知识库）。
- `content/docs/service/knowledge-base.mdx`——「支持知识索引涵盖四种内容类型」与四库表改为真实的 7 个分类、4 个列表页签与发布/复核时间戳行为。
- `content/docs/administration/setup.mdx`——Day 5 的三条 seed 步骤改写为真实可执行动作（按分类写文章、设置受众、发布）；产品目录一条不再说数据表「馈送产品信息知识库」。
- `content/docs/ai-copilot/sales-copilot.mdx`——邮件撰写的输入列去掉两个知识库，并写明第二个独立事实：`email_drafting` 的 instructions 从不取任何知识来源（与 #860 / PR #865 在 service 页的口径一致）。
- 另有 `content/docs/ai-copilot/skills.mdx`（每个技能的「知识库」行）、`content/docs/ai-copilot/index.mdx`、`content/docs/ai-copilot/service-copilot.mdx`、`content/docs/getting-started/introduction.mdx`、`content/docs/whats-new.mdx`、`content/docs/revenue/products.mdx` 六页的同源说法一并写实。

「元数据跟文档」（真的把这四个知识库建成元数据）是产品扩展方向，本次不预判。三语同步；纯文档改动，未触碰 `src/**`。
