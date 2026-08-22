---
'hotcrm': patch
---

Simplified Chinese now translates every select field's options, so no picklist in the zh-CN UI renders a raw stored value.

Fifteen select fields across nine objects had no option labels in **any** of the
four locales. A missing entry is not a runtime error — the resolver falls back to
the English `label` in code, and where a field had no entry at all the picklist
rendered the raw stored value. On an otherwise fully translated Chinese screen a
rep saw `net_30` in Contract payment terms, `waiting_customer`-style bare keys in
Task type, and `crm_account` in a Task's "related to" picker. Contract, Quote and
Product were the worst hit: `crm_product.billing_type` and
`crm_product.unit_of_measure` had no zh-CN entry whatsoever, so even the field
labels were English.

The fields completed here:

| Object | Fields |
|---|---|
| `crm_case` | `type` |
| `crm_contact` | `salutation` |
| `crm_contract` | `billing_frequency`, `payment_terms`, `contract_type` |
| `crm_knowledge_article` | `category`, `tags` (partial — 2 and 4 values were missing) |
| `crm_opportunity` | `competitors` |
| `crm_product` | `family`, `billing_type`, `unit_of_measure` |
| `crm_quote` | `payment_terms` |
| `crm_task` | `type`, `related_to_type`, `recurrence_type` |

Wording pairs with each field's neighbours in the same bundle rather than
rendering the English literally: `crm_task.related_to_type`'s options are object
names, so each one reuses that object's own `label` from this bundle (`crm_account`
→ 客户), and `crm_quote.payment_terms` is worded identically to
`crm_contract.payment_terms`, which shares its option set.

`PENDING_SELECT_LABELS` in `test/metadata-references.test.ts` shrinks by these 15
rows' zh-CN entries — the ledger may only ever shrink, and the guard fails a row
that has since been translated as stale. No row lists `zh-CN` any more, so the
`UNTRANSLATED_EVERYWHERE` shorthand is retired; Simplified Chinese is now the one
locale with complete select coverage. `en`, `ja-JP` and `es-ES` keep their rows
and remain the open scope of #645.

Full `objectstack lint` i18n warnings drop from 873 to 803.

Refs #645.
