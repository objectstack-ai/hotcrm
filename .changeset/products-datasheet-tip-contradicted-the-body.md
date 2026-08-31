---
'hotcrm': patch
---

Products page: correct the two datasheet tips that contradicted the section
twenty lines above them.

The body under *The product image and datasheet* says nothing reads the file's
contents and no skill opens an attachment, so a datasheet never reaches an
AI-drafted email or proposal. The product-manager tip said the opposite —
"keep the datasheet up to date — the AI assistant uses it to draft
customer-facing content" — and the page gave a reader no way to tell which of
the two had been measured.

The body is the measured one, re-verified against the tree rather than
inherited: all six skills in `src/skills/*.skill.ts` were read, and the union
of their `tools` is `describe_object`, `list_objects`, `get_record`,
`query_records`, `aggregate_data`, `visualize_data`, `action_convert_lead`
and `action_schedule_followup`. Not one of them opens a file. `datasheet` is a
`Field.file` on `crm_product` (PDF, 20 MB) — a real field a person downloads,
but its bytes reach no skill. So the tip was the older marketing sentence the
body was written to correct; the correction had landed in the body and never
reached the tips list.

The product-manager tip now says what the datasheet is for — the file a rep
sends the customer — and states plainly that anything the assistant should be
able to quote belongs in the product's own fields.

The sales-rep tip ("check the datasheet before proposing") is **not** the same
case and is kept: it is good advice for a human opening the PDF, and it blurred
only because it sat under a heading whose neighbour promised AI drafting. It is
reworded to be unambiguously about a person opening and pasting from the file.

All three locales, which track each other row for row.
