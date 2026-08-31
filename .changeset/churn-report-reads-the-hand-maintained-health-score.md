---
"hotcrm": patch
---

Customer Churn Signals now opens with the accounts a CSM flagged by hand.

`crm_account.health_score` is a hand-maintained column — a CSM who has been in
the room sets it to *At Risk* or *Churning* — and the churn report read it in no
panel. Every panel on that report was a derived signal: the activity clock
stopped, a high tier went quiet, a deal was lost. So the one churn signal a
person actually asserts was the one the churn report did not show, and an
account being talked to every week while its CSM believes it is churning
appeared on no panel at all.

**CSM-Flagged Accounts** is now the first panel: active accounts whose Health
Score is *At Risk* or *Churning*, counted by account type. It carries no time
window on purpose — that is what lets it surface the account the other three
panels cannot see. The existing three panels are unchanged.
