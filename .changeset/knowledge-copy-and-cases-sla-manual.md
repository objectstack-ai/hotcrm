---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Knowledge Base copy says what the app does, and the in-app Cases manual explains why SLA Due moves on a priority raise (#2528, #2530).**

- The article **Audience** help no longer promises a customer portal. *Public* marks an article as suitable for customers, and no portal serves it. This is fixed in the field description and all four locales.
- The **Helpful** / **Not Helpful** help names readers' Article Feedback instead of `crm_article_feedback`. A new guard in `test/i18n-references.test.ts` fails on any field help that shows a `crm_` or `sys_` API name.
- The Chinese Knowledge manual quotes the zh-CN tile and button labels.
- The deflection metric has one Chinese name, 知识库自助解决率, across the manual, the dashboard tile, the field help and the Simplified and Traditional docs pages. Before, the tile said 知识库转移率.
- The manual no longer says customers can resolve issues themselves from the knowledge base.
- The in-app Cases manual (en, zh) now says that raising the priority re-derives SLA Due from the moment of the change. The deadline only ever moves earlier, and lowering the priority never extends it. The zh page names the manual-escalation priority 严重, as the picker does.
