---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**With a module turned off, the app no longer offers the buttons that lead into it, and the Admin Manual says what turning a module off does (#2383).** On ObjectStack 18.3.0 an administrator can disable the Service, Revenue or Marketing module at Setup → Installed Apps. With Marketing off, **Add to Campaign** leaves the lead and contact row menus; with Revenue off, **Generate Quote** leaves the opportunity's record header and row menu. The platform withholds them itself (it no longer grants a disabled module's objects), so the app adds no gate of its own, and a new test pins all three with the module off and on. The module's sidebar entries leave too. One leftover remains on the platform side: on the All Leads and All Contacts lists, ticking rows still shows a "Create Campaign" / "Add Contact To Campaign" button in the selection bar, which answers with an error; that is reported to the platform.

The Admin Manual's *Access* page has a new section, *Turning a module off*, in English and Chinese: where the switch is, what disappears while a module is off, what the fields that point into it show, and that turning it back on brings everything back because nothing is deleted.
