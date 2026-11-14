---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The marketplace receives HotCRM as built, one package per module (#2059).** FROM: the publish script flattened the release artifact into a single package before posting it, so a hosted install saw one package holding every object, app, book and navigation item. TO: the artifact goes to the marketplace exactly as `pnpm build` writes it, with one `packages[]` entry for the app and one for each module, the way `objectstack package publish` sends it. A hosted organization therefore gets the Sales, Service and Marketing apps each filed under the package that owns it, and disabling a module takes its app, books and navigation with it. The publish still refuses, before any request, a build that carries no objects, and the listing checks (`business_functions`, `publisher`, `is_starter`, translations) are unchanged.
