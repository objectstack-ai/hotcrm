---
"hotcrm": patch
---

**All Forecasts lists periods newest first, two refusals read the way the screens do, and the demo accounts appear on the map.**

- **All Forecasts.** The list now groups by **Period Start**, newest first, and under each start date by the period's label, so every period still has a heading of its own (**Q4 2026**). Before, it grouped by the label alone, which sorts as text: *Sep 2026*, then *Q4 2026*, then *Q4 2025*, with *Oct 2026* near the bottom. A quarter and the month that opens it start on the same day, so **Q4 2026** and **Oct 2026** sit under one start date as two periods.
- **Campaign dates.** A campaign whose **Start Date** falls after its **End Date** is refused with "The campaign's Start Date (…) must not be after its End Date (…)". A campaign saved as *In Progress* without both dates is refused with "A campaign cannot be In Progress without both a Start Date and an End Date". Before, both messages named the fields `start_date`, `end_date` and the status `in_progress`.
- **Deleting a product.** A product still on any opportunity or quote line is refused as before, and the message now counts what it names: "Cannot delete product: it is on 4 opportunity line items and 2 quote line items. To retire it instead, turn off Active." Before, it read "referenced by 4 opportunity(ies) and 2 quote(s)" for four lines on two deals, listed a zero, and named the field `is_active`.
- **Accounts by Location.** Each demo account now carries an **Office Location** at its billing address, so the map shows all nine offices. Before, every demo account left it blank and the map reported "9 records with missing or invalid coordinates excluded". A database seeded before this release keeps its blank locations: the demo accounts are written once and never overwritten. Fill **Office Location** on an account to put it on the map.
