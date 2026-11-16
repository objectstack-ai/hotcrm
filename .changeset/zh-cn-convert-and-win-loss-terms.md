---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**zh-CN says 转化 for convert and one word for each win/loss concept (#2521, #2523).** The lead-conversion notification templates and the lead page's duplicate banners said 转换 while the button, the status and the field say 转化 (one banner quoted the button as 「转换线索」); they now say 转化. The `opportunity_metrics` dataset labels, which are the column headers inside the win/loss widgets, said 失单 / 赢单率 / 已定局 next to widget titles that say 丢单 / 赢率 / 已结单, and the opportunity form's win/loss section said 赢单/输单; they now use the widget words, as do the zh-CN demo deals' descriptions, a knowledge article, and the Simplified and Traditional docs pages that named the metric. A new guard, `test/zh-cn-sales-terms.test.ts`, rejects 转换 under `src/` and the retired win/loss words in the zh-CN sources and Simplified docs, and pins the dataset labels. The five zh-CN demo deal names that say （输单） keep it: a deal name is the seed's identity (`externalId: 'name'`), so renaming one would insert a duplicate deal on a database that already holds it, and the guard exempts exactly those five lines.
