---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Project Delivery joins HotCRM as a module, with its own app (#2316, phase 0).** HotCRM now ships a sixth package, `app.objectstack.hotcrm.psa`, the professional-services (PSA) module the maintainer ruled on 2026-11-15: a suite module with its own **Project Delivery** app (「项目交付」), depending on the HotCRM app package only. In this phase the app is a skeleton: it lists Accounts, Opportunities, Contracts, the approvals Inbox and My Tasks, and every business role's permission set hides it from the launcher, so only members who hold none of those sets see it (administrators, and the executive and director positions, which already see every app); every business role keeps the apps it had. Projects, staffing, rate cards, timesheets, expenses, their approvals and the cost and margin roll-ups arrive in phase 1, which opens the app to the delivery roles. A tenant that disables the module loses the app with it. Labels ship in en, zh-CN, ja-JP and es-ES. No existing object, field or permission changes.
