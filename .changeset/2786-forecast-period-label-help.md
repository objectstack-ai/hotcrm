---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Sales: the forecast's Period Label help shows the label the system actually writes, in Chinese, Spanish and Japanese (#2786).** A forecast saved with a blank **Period Label** gets one generated from **Period** and **Period Start**, always in the form `Q3 2026` or `Aug 2026`, whatever language the person saving it uses: the label is stored on the record, is half of its title and is what the forecast search looks up. The Chinese, Spanish and Japanese help text, however, gave its examples as `2026 年第三季度` / `2026 年 8 月`, `T3 2026` / `Ago 2026` and `2026 年第 3 四半期` / `2026 年 8 月`, so a user who searched for, or typed, a label in that form did not match the generated rows. Now the examples in every language are `Q3 2026` and `Aug 2026`, and the help says that a blank label is generated from **Period** and **Period Start**. The English help text and the way the label is generated are unchanged.
