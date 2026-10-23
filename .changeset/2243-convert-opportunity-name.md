---
'hotcrm': patch
---

Convert Lead now proposes an Opportunity Name that tells the new deal from the account's others: "<company> – <need type>" (for example "Acme Corporation – Expansion"), or "<company> – <conversion date>" when the lead has no need type. It used to propose the company name alone, so a fourth Acme deal read exactly like the other three in the account's Related list and in every picker. The need type is shown by its label, not its stored value, and the rep can still overwrite the name before converting; account matching and the rest of the wizard are unchanged (#2243).
