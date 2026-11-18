---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The printed quote's Pricing and Terms are now separate blocks, so a short quote need not leave its first sheet a third blank (#2553).** The quote document (`quote_print_page`) printed its **Pricing** and **Terms** sections as one block, and the print keeps a block whole on one sheet, so behind a quote with a few line items both sections moved to sheet 2 together and left about a third of sheet 1 empty. Each section is now its own block (`quote_print_pricing`, `quote_print_terms`), the layout the contract document already uses, and a section that does not fit the space left still moves whole to the next sheet. On platform 18.6.0, which prints record details more compactly, a seeded quote with 3 line items now starts its pricing section on sheet 1 (sheet 1 left 4% blank, was 41%). On 18.5.0 the pricing section is still too tall for what a 3-line quote leaves on sheet 1, so the first sheet looks the same as before until the platform is upgraded.
