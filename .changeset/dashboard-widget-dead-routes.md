---
'hotcrm': patch
---

Remove the widget-level drill-through config from all four dashboards. All 16
KPI tiles declared `actionUrl` / `actionType` / `actionIcon`, and every URL
pointed at a route the console does not serve (`/objects/…`, `/reports/…`) —
but the deeper problem is that a dataset-bound widget renders no drill-through
at all: measured on 16.1.0, a KPI tile emits no link, no button and no icon,
its cursor stays `auto`, and clicking it does not navigate. Repointing the URLs
would have polished config nobody can reach, so the config is removed instead,
matching #538 and #554. Clears all 16 `dashboard-action-route-unresolved`
warnings (validate goes from 18 warnings to 2, both pre-existing and benign).
Fixes #527.
