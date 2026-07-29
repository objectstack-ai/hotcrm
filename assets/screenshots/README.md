# Screenshots

Marketplace screenshots for HotCRM. Captured with Playwright (1280×577 viewport, `locale: en-US`) against a live `pnpm dev` instance using the bundled seed data. Captured in English (the default locale); zh-CN, es-ES, and ja-JP bundles are also included in the app.

| File | Page | Highlights |
|---|---|---|
| `01-sales-pipeline.png` | Opportunities kanban (`crm_opportunity/view/pipeline_kanban`) | Deals across stages, account + amount + close date per card |
| `02-accounts-list.png` | Account cards view (`crm_account/view/account_gallery`) | Industry + annual revenue + employees + contact info |
| `03-opportunities-list.png` | All opportunities table view (`crm_opportunity/view/all_opportunities`) | Sortable list with stage badges and probability bars |
| `04-executive-dashboard.png` | Executive dashboard (`dashboard/executive_dashboard`) | Revenue / accounts / contacts / leads KPIs + revenue trend and industry charts |
| `05-service-cases.png` | Service cases kanban (`crm_case/view/case_workflow`) | Cases by status (New / In Progress / Waiting on Customer) with priority badges |

To recapture: `pnpm dev` → log in as the seeded dev admin → open each URL under `/_console/apps/app.objectstack.hotcrm/` in a 1280×577 en-US browser → screenshot to the matching file.
