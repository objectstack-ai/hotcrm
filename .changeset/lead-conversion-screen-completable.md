---
'hotcrm': patch
---

Make the lead-conversion screen completable.

Pressing **Submit** on the `lead_conversion` screen did nothing — zero network
requests, run paused forever (objectstack#3528). Two of that issue's three causes
were in this repo's own metadata:

- **`visibleWhen` was written in the wrong dialect.** On a screen field it is
  bare CEL over the screen's own field names, not the `{var}` template dialect
  this flow uses correctly everywhere else (filters, `update_record` fields,
  decision conditions). `'{createOpportunity} == true'` never resolved, so
  `opportunityName` — a field the author had made conditional — rendered
  unconditionally *and* was enforced as `required`. Submit blocked on an input
  the user was never meant to see.
- **`createOpportunity` was required with no default.** An untouched checkbox
  holds `undefined`, which the runner counts as unanswered. So "convert this lead
  *without* an opportunity", the commonest path, blocked on a box the user had
  deliberately left clear. `defaultValue: false` makes "no" a real answer.

Also: `.gitignore` now ignores `node_modules` without a trailing slash. The
slashed form matches directories only, so a *symlink* named `node_modules` is a
plain blob to git and slips past the ignore entirely — one got committed that
way, and CI failed with `ERR_PNPM_ENOENT … mkdir node_modules/@objectstack`
because checkout restores a dangling symlink that pnpm cannot mkdir through.

The third cause in objectstack#3528 — `crm_account.industry` holding fewer values
than `crm_lead.industry`, aborting conversion mid-flow — was fixed separately by
the shared `INDUSTRY_OPTIONS` picklist (#490).
