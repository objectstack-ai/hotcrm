---
"hotcrm": patch
---

Sales: the rules the account, contact, contract, task, event, opportunity and lead hooks enforce now answer in the caller's language (part of #2496). Each refusing hook declares its refusal catalogue, with the English sentence as the declared message and zh-CN, ja-JP and es-ES translations in the Sales locale packs; names, emails, dates, counts and amounts are filled through `{{ }}` holes. A REST caller now reads the same sentence the console shows: a closed deal's refusal names its stage by label ("Closed Won") rather than its API value. The hook-refusal guard test now covers the Sales package.
