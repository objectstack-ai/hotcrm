---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The time datasets and the invoice due-date help name objects and fields by their on-screen labels (#2699).**

Some descriptions in the language packs named a record by a word the console never shows. A reader then searched for a screen that does not exist. Each description now uses the label:

- Chinese, Project Delivery datasets (Time Utilization, and the labor lines of Project Financials): 工时记录 → 工时明细 (Time Entry), 工时表 → 工时单 (Timesheet).
- Chinese, invoice **到期日** help: 合同的付款条件 → 合同的付款条款 (the contract's Payment Terms field).
- Japanese, Time Utilization: 工数エントリ → 工数明細 (Time Entry), and the status dimension 工数表ステータス → タイムシートステータス.
- Spanish, Project Delivery datasets: hoja de horas → parte de horas (Timesheet), entrada de tiempo → registro de horas (Time Entry), and the status dimension Estado de la hoja de horas → Estado del parte de horas. Spanish invoice due-date help: condiciones de pago → términos de pago.
- Chinese analytics docs page: 每条工时记录一行 → 每条工时明细一行.

Nothing else changes: no field, rule or number moves.
