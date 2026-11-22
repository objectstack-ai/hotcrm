---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The marketplace listing points at the production marketplace and the HotCRM site, and its icon shows.**

- The README (en, zh-CN), which is the listing's readme, and the *Publishing your first marketplace app* guide (en, zh-Hans, zh-Hant) link to the production marketplace, `cloud.objectos.ai`, instead of the staging one, `cloud.objectos.app`. The guide's `--server` default now reads `https://cloud.objectos.ai`, the CLI's real default.
- The README's logo is an absolute URL, so it no longer shows as a broken image on the listing page, where a relative `assets/icon.svg` has no repository to resolve against.
- The listing's homepage is `https://www.hotcrm.com` instead of the GitHub repository.
- The app package's description says what HotCRM is today, six apps from lead to cash, the same text as the listing, instead of "AI-Native CRM … Contracts".

No object, field or permission changes. The listing updates on the next marketplace publish.
