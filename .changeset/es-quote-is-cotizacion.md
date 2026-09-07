---
'hotcrm': patch
---

Spanish (`es-ES`) now calls the quote object by one name: **Cotización**.

The pack named the same object two ways at once. Its declared label was
`Cotización`, but eight strings called it `Presupuesto` — the "Generar
Presupuesto" action and its success message, the win reason `quote_accepted`,
the whole `crm_quote_line_item` object (`Línea de Presupuesto`, its plural, its
description and its lookup back to the quote), and the `crm_contact` help
sentence. A Spanish user reading "Línea de Presupuesto" and then looking for
Presupuesto in the navigation found Cotizaciones, and nothing in the product
told them these were the same record.

The help sentence carried a second, visible symptom: because it named the
masculine `el presupuesto`, it inflected the two statuses to match it and told
users to look for **Presentado / Aceptado**, while the picklist renders
**Presentada / Aceptada**. The status options were right all along — they agree
with the feminine `Cotización` — so they are unchanged; the sentence now names
the right noun and reads `la cotización pasa a Presentada o Aceptada`.

`Presupuesto` remains the Spanish word for **budget**, and its five budget-sense
uses are deliberately untouched: `Presupuesto y ROI` and `Costo Presupuestado`
on campaigns, the campaign validation message `El coste real supera el coste
presupuestado`, and `Sin Presupuesto` as a disqualification and a loss reason.
A find-and-replace corrupts all five, which is why every occurrence was graded
by what it refers to rather than swept.
