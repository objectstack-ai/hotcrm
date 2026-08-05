---
'hotcrm': patch
---

Retire the last six homes of the ghost **Customer Since** field, on the two
AI Copilot skill pages, in all three languages.

#805 / PR #823 corrected `revenue/contracts.mdx` and #824 / PR #841 corrected
`revenue/index.mdx` and `sales/accounts.mdx`. The same claim survived on
`ai-copilot/sales-copilot.mdx` and `ai-copilot/service-copilot.mdx` under a
spelling the earlier keyword sweeps could not see: the English pages wrote
`customer-since` with a hyphen, the Chinese pages translated it to
"the date they became a customer".

These two were the worst-placed of the family, because they described what a
skill *reads*. A reader writing a prompt against the docs would expect Customer
360° and Case Triage to be able to answer "how long has this account been a
customer". Neither skill can. `crm_account` has no `customer_since` field and
no field of any name records when an account became a customer
(`src/objects/account.object.ts`); contract activation
(`src/objects/contract.hook.ts`) stamps **Signed Date** on the *contract* and
flips the account's **Type** to *Customer*, writing no date to the account.

Both bullets are now written from the skill sources, which are the only
authority on what a skill reads:

- **Customer 360°** (`src/skills/customer-360.skill.ts`) `get_record`s the
  account, so the relationship snapshot is the account's **Customer Tier** and
  its owner — both real fields. The page now says plainly that no
  customer-since date exists to snapshot, and sends a tenure question to the
  contract's **Signed Date** or **Start Date**.
- **Case Triage** (`src/skills/case-triage.skill.ts`) weighs "customer tier and
  contract value" first in its rubric, and never mentions tenure. The page now
  names those two, and says tenure is not weighed and has no field to be
  weighed from.

As in PR #841, the name *Customer Since* is not silently deleted — a reader who
came looking for it needs somewhere to land.

Two Chinese field names are aligned to the locale pack in the sentences that
were rewritten (#825 precedent): the `tier` field is 客户分层 / 客戶分層 as
`src/translations/zh-CN.ts` ships it, not the pages' 客户层级, which on
`sales/accounts.zh-Hans.mdx` already means account *hierarchy*.

Documentation only — no metadata, behaviour or field changes, and `src/**` is
untouched. Whether the two skills *should* be given this data point is a
product decision and stays open; this change only stops the docs from promising
they already have it. Fixes #840.
