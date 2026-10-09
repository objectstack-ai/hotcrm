---
'hotcrm': patch
---

The in-product guide **Administration — Positions, Sharing & Automation Knobs** no longer tells admins that the business rules are in a `src/flows/` folder. That folder went away when HotCRM was split into packages. The *Automation knobs* section now says that each package keeps its own flows in its `flows/` directory. The thresholds, and the flows that define them, are unchanged.

For maintainers: source comments that still named the pre-package folders (`src/flows/`, `src/translations/`, `src/objects/` and the rest) now name each file's package home. That includes one comment inside the shipped script body of the *Log a Call* / *Log a Meeting* / *Schedule a Meeting* actions; the script does exactly what it did before. A comment that records where something used to live keeps the path it had then. No behaviour changes.
