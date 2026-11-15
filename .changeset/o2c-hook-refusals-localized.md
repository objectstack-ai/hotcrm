---
"hotcrm": patch
---

Orders & Collections: a payment refused for an invoice of another contract now answers in the caller's language (part of #2496). The `payment_plan_step_stamp` hook declares its refusal catalogue, with the English sentence as the declared message, the invoice number filled through a `{{ }}` hole, and zh-CN, ja-JP and es-ES translations in the module's locale packs. The hook-refusal guard test now covers the O2C package. Project Delivery's locked-project refusal fills a nameless project as "This project", as its English sentence does.
