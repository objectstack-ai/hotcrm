---
'hotcrm': patch
---

Clause-②: no
Metadata-protocol: none

Each module package now registers its own translations, so a module can be left out of an install without breaking the app's language packs

**No visible change: every label reads exactly as before, in all four languages (#2352).** The
Service, Revenue and Marketing modules each carry their own English, Simplified Chinese, Spanish
and Japanese labels for the records, navigation entries, dashboards, reports, flows and manuals
they own, in `src/service/translations/`, `src/revenue/translations/` and
`src/marketing/translations/`. Until now the app package's language packs held all of them. The
strings moved unchanged; nothing was re-translated.

Why: with a module left out of the install, every one of those labels pointed at something that no
longer existed, and the build refused it. Measured with the platform's validator, the refusals
drop from 58 to 0 with Service absent, from 46 to 4 with Revenue absent, and from 34 to 8 with
Marketing absent. The ones that remain label app records (the opportunity's *Generate Quote*
action, the lead and contact campaign actions), which wait on platform fixes before they can leave
with their module.
