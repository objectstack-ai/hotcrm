---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**HotCRM carries a fifth package, Order to Cash (`app.objectstack.hotcrm.o2c`), with nothing in it yet.** It is a module of the one HotCRM artifact, like Revenue and Marketing, depending on the app package only, and it will hold the contract's collection plan and its invoice and payment status (REQ-0007). This release ships the package and the sidebar group it fills, *Order to Cash* (「订单与回款」, labelled in en, zh-CN, es-ES and ja-JP); the group stays hidden until the module contributes its first entry, so no one sees a change today. A tenant that will not use it disables the package. The objects arrive in the next phase (#2315).
