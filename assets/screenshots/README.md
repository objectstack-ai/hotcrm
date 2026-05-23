# Screenshots

Marketplace screenshots for HotCRM. Captured with `agent-browser` against a live `pnpm dev` instance using the existing seed data (~107 accounts, 43 opportunities, 38 cases). Currently in zh-CN to showcase the i18n.

| File | Page | Highlights |
|---|---|---|
| `01-sales-pipeline.png` | Opportunities kanban (`crm_opportunity/view/pipeline_kanban`) | 42 deals across stages, amounts + close dates per card |
| `02-accounts-list.png` | Accounts card view (`crm_account`) | Industry + ARR + employees + contact info |
| `03-opportunities-list.png` | All opportunities table view (`crm_opportunity/view/all_opportunities`) | Sortable list with probability bars, grouped by stage |
| `04-executive-dashboard.png` | Executive dashboard (`dashboard/executive_dashboard`) | $40M ARR / 107 customers / 98 contacts / 262 unconverted leads KPIs + charts |
| `05-service-cases.png` | Service cases kanban (`crm_case`) | Cases by status (新建/处理中/等待客户回复) with priority badges |

To recapture: `pnpm dev` → log in → `agent-browser open` each URL → `agent-browser screenshot <file>`.

