---
'hotcrm': patch
---

Correct where the `allowExport` permission is actually enforced, in the Import & Export guide and in the permission-set notes.

The guide told readers that the Cases export grant "is aimed at report export, which rides on the platform's `reports` capability" — and, since HotCRM does not require that capability, that the grant had nothing behind it. Measured against a running server, that is wrong: bulk export runs on a single server-side route (`GET /api/v1/data/:object/export`), which the list view's Export button calls and which anyone may call directly. A role holding the grant gets the rows; a role without it is refused with `EXPORT_NOT_PERMITTED`. Cases simply has no Export button, because no Cases list view declares `exportOptions` — the grant itself works over the data API.

Reports are not an export surface in this app at all: a report page renders its chart and table and offers no download. The three localized copies of the guide carried the same claim and are corrected together.

Also adds a guard so the question the old text got wrong now has an answer in CI: every object carrying `allowExport` must leave `export` enabled on its API, so a grant can never be authored behind a route the object has switched off.
