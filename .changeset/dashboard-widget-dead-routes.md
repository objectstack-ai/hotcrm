---
'hotcrm': patch
---

Point all 16 dashboard KPI widget action buttons at real console routes.

Every KPI tile across the CRM Overview, Sales Performance, Customer Service and Executive Overview dashboards had an `actionUrl` navigating to a dead page: the console serves in-app pages only under `/apps/<app>/…`, so `/objects/<name>` (unprefixed object names, no such route) and `/reports/<name>` (unregistered report names) both landed nowhere. Object tiles now open the matching `crm_*` list (using the list view that mirrors the tile's filter where one exists), report tiles open registered reports, and the two Avg Deal Size tiles lose their button since no registered report covers average deal size. A new metadata-references guard resolves every url-type dashboard action against the app shell's route table so the next dead route fails in CI.
