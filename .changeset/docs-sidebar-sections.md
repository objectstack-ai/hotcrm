---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The documentation site's sidebar is split into four sections.** FROM one long sidebar of about 54 entries, up to four levels deep, TO a section switcher at the top of the sidebar, with each section showing only its own pages:

- **Start Here** (入门 / 入門): the home page, Getting Started, Guides and What's New.
- **Product Guides** (产品指南 / 產品指南): Sales, Service, Marketing, Order to Cash, Expenses and Project Delivery.
- **AI & Analytics** (智能与分析 / 智慧與分析): AI and Agents, and Analytics.
- **Admin & Developers** (管理与开发 / 管理與開發): Administration, Developers and Reference.

Every page keeps its URL, in all three languages: `/docs/sales/leads` is still `/docs/sales/leads`. The sections are Fumadocs root folders in `(group)` directories under `content/docs/`, and a directory name in parentheses does not appear in the URL. Contributors: a page's file now sits one directory deeper, for example `content/docs/(product)/sales/leads.mdx`.
