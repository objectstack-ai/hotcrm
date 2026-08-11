---
'hotcrm': patch
---

Unify the `ja-JP` lead-conversion vocabulary onto 変換 (the 14:4 majority),
fixing a self-inconsistency where the same conversion had two success
messages in different words. Aligned 4 occurrences that used 取引開始:
`crm_lead.status.options.converted`, `crm_lead.is_converted.label`,
`messages['success.converted']`, and the executive dashboard's
`open_leads` description. The action label (`リード変換`), the field it
sets (`is_converted`), and both success messages now share the same verb
root. Refs #858.
