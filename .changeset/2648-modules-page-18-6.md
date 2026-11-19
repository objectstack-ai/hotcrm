---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The module switch is documented where it really is on ObjectStack 18.6.0 (#2648).** The *Enable and Disable Modules* page and the admin manual's *Turning a module off* section sent administrators to **Setup → Installed Apps** to choose *Show all*. That page lists only the apps installed from the marketplace and has no *Show all*, by the platform's design. Both now send them to the **Packages** page, which no menu entry opens, and give its address. The *Sandbox & Release Management* page made the same claim, and it also named a **Studio → Packages** entry that 18.6.0 does not serve. It now says the same as the modules page. The admin manual now names all six modules. The docs page drops its *Known issue* note about Expenses lists failing to load while Project Delivery is off: on 18.6.0 the **Project** column is left out and a line above the list says why, and the page quotes that line. The page's readings (what leaves while each module is off) were taken again on 18.6.0. One claim was dropped: the records of a module that is off are no longer described as unsearchable, because the platform's REST search still returns them.
