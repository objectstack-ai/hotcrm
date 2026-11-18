---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A short printed quote no longer leaves its first sheet a third blank (#2553).** The quote document (`quote_print_page`) printed its **Pricing** and **Terms** sections as one block, and the print keeps a block whole on one sheet, so behind a quote with a few line items both sections moved to sheet 2 together and left about a third of sheet 1 empty. Each section is now its own block (`quote_print_pricing`, `quote_print_terms`): with 3 line items the pricing section starts on sheet 1, and a section that does not fit the space left still moves whole to the next sheet. This is the layout the contract document already uses.
