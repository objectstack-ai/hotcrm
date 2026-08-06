---
'hotcrm': patch
---

Call the service dashboard by a name the product actually shows. The three
service pages — `content/docs/service/index.mdx`,
`content/docs/service/cases.mdx` and
`content/docs/service/sla-and-escalation.mdx`, in all three locales — referred
to it as **Service Dashboard**, and nothing in the app carries that name: the
sidebar item is `label: 'Service Overview'` (`src/apps/crm.app.ts`) and the
dashboard's own title is `label: 'Customer Service'`
(`src/dashboards/service.dashboard.ts`). A manager told to "read the **SLA
Violations** tile on the Service Dashboard every morning" had no sidebar entry
by that name to click.

The pages now use **Service Overview** — the sidebar label, which is how a
reader finds it — and annotate the dashboard's own title, **Customer Service**,
once at the first mention on each page, so the heading you land on matches what
you were told to look for. That title is also the section heading on
`content/docs/analytics/dashboards.mdx`, where the cross-page links point. The
Chinese pages use 服务概览 / 服務概覽, which is the navigation label's own
translation (`src/translations/zh-CN.ts`); the dashboard title stays as the
Latin **Customer Service**, matching how the dashboards page writes it in every
locale.

No metadata changed — the two labels are what they were, and whether the app
*should* show one name in the sidebar and another on the page is a product
question this leaves open.
