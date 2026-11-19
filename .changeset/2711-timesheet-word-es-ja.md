---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Spanish and Japanese Project Delivery strings name the timesheet by its on-screen label (#2711).**

The Timesheet object is labelled Parte de horas in Spanish and タイムシート in Japanese, but its error messages, help text and approval steps still called it by an older word. A user then saw two names for one record. Each string now uses the label:

- Spanish: hoja de horas → parte de horas, in the timesheet and time-entry error messages (locked, closed or cancelled project, duplicate timesheet, date outside the period, task from another project), the project's **Bloquear horas y gastos** help, the approval process names **Aprobación de parte de horas** and **Aprobación de parte de horas (al crear)**, and the **Horas aprobadas por semana** tile description. The surrounding words follow the masculine noun (este, un, ningún, Guárdelo, muévalo, Devuélvalo).
- Japanese: 工数表 → タイムシート, in the time-entry task message, the project's **工数と経費をロック** help, the approval process names **タイムシート承認** and **タイムシート承認（作成時）**, and the **週別の承認済み工数** tile description.

Time entries already used their label in both languages (Registro de horas, 工数明細). Nothing else changes: no field, rule or number moves.
