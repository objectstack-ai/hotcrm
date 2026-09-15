---
'hotcrm': patch
---

**Docs: every `src/` path the product documentation prints now resolves against the real
tree.** ADR-0130 (#1905) made a directory under `src/` a package, and the two top-level
directories the docs quoted most stopped existing: flows became `src/sales/flows/`,
`src/service/flows/`, `src/revenue/flows/` and `src/marketing/flows/`, and the locale
bundles became `src/sales/translations/`. 48 sites over 39 pages still named the old
flows directory and 21 sites over 9 pages the old translations directory, in all three
languages.

Two of them cost a reader real time. The fork tutorial opened with a copy-pasteable
`mv src/translations/crm.translation.ts …`, whose **source** path was not there, so step
one of forking HotCRM failed on paste (the destination name is the reader's own and is
unchanged). And *Customization › Extending Objects* told readers to put new automation in
a directory ADR-0130 had removed, and to export it from a barrel that no longer exists —
that step now names the package that owns the trigger object and its own `flows/index.ts`.

The prefix is per file, not per documentation area: the quote expiration flow the Sales
pages cite lives under `src/revenue/flows/`. Three sites had no single successor to point
at — the bare "under `src/flows/`" in Quotes, Cubes and Extending Objects — and were
rewritten to say which package, rather than mechanically prefixed.

**Contacts: the department roster now matches the picklist.** The admin tip listed ten
departments — inventing *IT*, *Legal* and *Other*, and omitting *Support*, which the app
actually ships. It now lists the eight values `crm_contact.department` declares, in
declaration order: Executive, Sales, Marketing, Engineering, Support, Finance, Human
Resources, Operations.
