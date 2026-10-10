---
'hotcrm': patch
---

HotCRM now ships as one artifact carrying two packages: the HotCRM app and its Service module.
It still installs as one app, and the one change a user sees is the menu order: **My Cases**
is now the last item of **My Work**.

**What changes for an installation.** The artifact still installs as one app,
**HotCRM** (`app.objectstack.hotcrm`), and every object keeps its name, its
table and its REST path. Inside it, cases, knowledge articles and article
feedback now belong to a second package, **HotCRM Service**
(`app.objectstack.hotcrm.service`), a module of the app. The package list
(`GET /api/v1/packages`, and the package picker in Studio) shows both rows,
and each object reports the package that owns it.

**One navigation difference.** The Service module puts its five entries into
the app's menu: **Cases**, **Knowledge** and **Service Overview** under
**Service**, **SLA Performance** under **Insights**, and **My Cases** under
**My Work**. A module's entries come after the app's own entries in a group,
so **My Cases** is now the last item of **My Work**, after **Inbox**; it used
to sit fourth, after **My Leads**. Every other menu entry is where it was.

**What does not change.** The permission sets stay whole in the HotCRM app
package, Service grants included, so no one's access moves. Translations stay
in the app package too. The **Products**, quotes, contracts, campaigns and the
rest of revenue and marketing are still part of the HotCRM app package; they
become modules of their own in later releases.

**For developers.** `src/sales/index.ts` and `src/service/index.ts` each call
`defineStack` with their package's manifest, and `objectstack.config.ts`
composes them with `composeStacks(…, { manifest: 'preserve' })`. A suite that
needs every collection of the app reads `test/helpers/composed-stack.ts`,
because the built artifact keeps each package's metadata inside that
package's entry in `packages[]`.
