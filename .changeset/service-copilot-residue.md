---
'hotcrm': patch
---

按 skill 与对象源码写实 `content/docs/ai-copilot/service-copilot.mdx` 三语其余段落的能力漂移残留（#860，承接 #840 / #847）：

- **工单上的「产品」是幽灵字段**：`crm_case` 全字段里没有任何 product 字段，也没有指向 `crm_product` 的 lookup；产品挂在商机产品明细与报价单明细上。分流够得着的范围内，产品只会出现在主题/描述的文本里。
- **邮件撰写不引用知识文章**：`email_drafting` 的 instructions 五步从未提到知识文章，因此「所有草稿都会引用支持知识文章」改为写实——草稿依据它读到的记录，需要援引文章时从 Customer 360° 拿。
- **三条提示语的归属改正**：匹配文章的是 Customer 360°（`customer_360` 第 3 步），不是工单分流；分流只返回优先级与升级/关闭指引，因此「拒绝率＝知识库质量」的指标不成立，知识缺口信号改挂到 Customer 360°。
- **打电话前看合同层级**：`customer_360` 的 instructions 没有枚举 `crm_contract`，改为指向客户自己的合同记录（合同类型 / 合同金额）。

三语同步（`content/docs/ai-copilot/service-copilot.zh-Hans.mdx`、`content/docs/ai-copilot/service-copilot.zh-Hant.mdx`）。纯文档改动，未触碰 `src/**`。
