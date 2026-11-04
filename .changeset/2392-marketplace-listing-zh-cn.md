---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The marketplace listing reads in Chinese for a Chinese console (#2392).** The HotCRM card and its detail page in **Setup › Marketplace** showed the English description and the English engineering README to a zh-CN user. The listing now carries a zh-CN description, tagline and a short Chinese introduction (`README.zh-CN.md`) in `objectstack.manifest.json` → `translations`, and `pnpm publish:marketplace` sends them with the package. A Chinese console (`zh-CN` or `zh`) shows them; every other language keeps the English listing, and the name stays **HotCRM**. The listing changes at the next marketplace publish. The publish refuses, before any request and in a DRY_RUN too, a translation the marketplace schema would reject (an over-long description or tagline, an unreadable readme file).
