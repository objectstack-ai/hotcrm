---
'hotcrm': patch
---

Give the four fields that belonged to no `fieldGroups` group one, and declare
groups on the two line-item objects that had none — so rung 1 of the layout
ladder exists everywhere a form can be derived.

`fieldGroups` is what lets a form be *derived* instead of hand-enumerated. A
field that opts into no group cannot be reached by derivation at all: the only
way to put it on a form is the per-field enumeration the ladder exists to avoid.
Four fields sat in that state — `crm_forecast`'s three formula fields
(`expected_amount`, `attainment_pct`, `coverage_ratio`) and
`crm_knowledge_article.article_number` — and two objects declared no groups at
all.

| object | change |
| --- | --- |
| `crm_forecast` | the three formula fields join the existing `amounts` group |
| `crm_knowledge_article` | `article_number` joins `basic`, beside the other identity columns |
| `crm_opportunity_line_item` | new `basic` / `pricing` groups over its 9 fields |
| `crm_quote_line_item` | new `basic` / `pricing` groups over its 11 fields |

The line-item split is derived from the fields those objects actually declare,
not copied off a neighbour: everything `total_price` multiplies together is
`pricing` (quantity, list price, sales price, discount, and on the quote line
subtotal and tax rate), everything that says *which* line this is is `basic`
(the parent link, the product, the description, the line number). The parents
agree — `crm_quote` and `crm_product` both keep every money field, tax
included, in one `pricing` group and both keep `description` in `basic`.
Neither new group is a subset of the highlight strip, so neither is hoisted out
of the body on a synthesized detail page (`field-group-shadowed`).

Section headings for the two new group keys are translated in all four locales.

### The `forecast.view.ts` `amounts` section is deliberately NOT deleted

The proposal these groupings came from expected the authored `amounts` section
to become exactly equal to the `amounts` group once the three formula fields
joined it, hence redundant, hence deletable. Measured field-by-field off the
built metadata, it does not:

```
authored forecast.view.ts `amounts` : quota, closed_amount, commit_amount, best_case_amount,
                                      pipeline_amount, expected_amount, attainment_pct, coverage_ratio
derived  crm_forecast  `amounts`    : quota, pipeline_amount, best_case_amount, commit_amount,
                                      closed_amount, expected_amount, attainment_pct, coverage_ratio
```

The membership is equal — the same 8 fields, none extra, none missing — but
positions 1–4 are **reversed**. The authored section runs closed → commit →
best case → pipeline, most-certain money first; the object declares the
cumulative ladder its own header documents, pipeline → best case → commit →
closed. The section is therefore not redundant: it encodes an ordering the
group does not, and deleting it would silently re-sort a form. The grouping
half stands on its own and ships; the section stays exactly as it is.
