---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A forecast's title follows a rename of its owner (#2435).** A forecast is titled by its period and its owner, "Q4 2026 · Nina Reyes". Until now the owner's name was copied in when the forecast was saved, so after Nina was renamed her older forecasts kept the old name until someone saved each one again.

Now the forecast stores the owner's name in its own **Owner Name** field, and a new flow, **Forecast Owner Renamed**, writes the new name onto every forecast the user owns, in each organization they are a member of, as soon as the user is renamed: by an administrator or in the user's own profile. Past quarters and hand-entered forecasts follow too. A forecast in an organization the user is no longer a member of keeps the name it had.

The title now reads only the forecast's own fields, so the stricter metadata check that arrives with ObjectStack 18.4.0 (`stored-expression-cross-record-input`) has nothing to warn about here.

**Upgrading:** forecasts saved before this release get their Owner Name at their next save. To fill them all at once, run `scripts/backfill-record-titles.ts` (report-only without `--apply`); it now also picks up forecasts that have an owner and no stored owner name.
