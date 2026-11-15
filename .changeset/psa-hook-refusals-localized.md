---
"hotcrm": patch
---

Project Delivery: the rules the project, staffing, timesheet, time entry and expense hooks enforce now answer in the caller's language (part of #2496). Each hook declares its refusal catalogue, with the English sentence as the declared message and zh-CN, ja-JP and es-ES translations in the module's locale packs; project names, dates and timesheet names are filled through `{{ }}` holes. A guard test checks that every code and reason a hook throws is declared and translated.
