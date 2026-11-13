---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The List Price by Category chart moves to its own Product Catalog dashboard (#2436).** It was a tile on CRM Overview; on ObjectStack 18.4.0 it drew an error there, because a dashboard reads only the datasets of its own package and the packages that package depends on (objectstack#32929), and the product dataset belongs to the revenue module. The chart is unchanged and now sits on the revenue module's Product Catalog dashboard, in the Sales group beside Products and Price Books; like the tile, it leaves the sidebar when the revenue module is turned off. CRM Overview keeps its other tiles, with Pipeline by Owner moved up into the freed row. Labels in en, zh-CN, es-ES and ja-JP; the dashboards guide, quick tour, docs index and README now count six dashboards.
