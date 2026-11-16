---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Report chart titles now read in the viewer's language (#2524).** The five report charts (Pipeline by Stage, Revenue by Sales Rep, Amount by Owner, Cases by Status, SLA Violation Rate by Priority) showed their English title to every zh-CN, ja-JP and es-ES user. The locale packs cannot carry a chart title, because the report translation has no `chart` slot ("Unrecognized key(s) on this report translation: `chart`"). Each title is now an inline label map in en, zh-CN, ja-JP and es-ES, which the report chart schema accepts and the console renders per locale. A new test, `test/report-chart-titles.test.ts`, fails when a report chart title is not a map covering every shipped locale.
