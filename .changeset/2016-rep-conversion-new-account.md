---
'hotcrm': patch
---

A sales rep can now convert a lead into a new account. Before this fix the conversion stopped with "Field write denied … [annual_revenue]" whenever the lead's company had no account yet, and nothing was created; a sales manager had to convert it instead. The new account still carries the lead's **Annual Revenue**, and it is owned and created by the rep who converted it.

**Annual Revenue** stays read-only for sales reps. The rep's conversion creates the account as before, and a new sub-flow, **Copy Lead Revenue to New Account**, copies the lead's revenue onto that account with system privilege. Nobody can start the sub-flow on its own, administrators included; it runs only as a step of **Lead Conversion Process**.

A user who may not create accounts, such as a marketing user or a service agent, still cannot convert a lead into a new account, and nothing is written when they try.

On every conversion into a new account, a sales manager's included, the revenue now arrives just after the account is created. The account's approval request records the account as it was submitted, so its snapshot in the approval inbox shows no annual revenue. The account itself carries it.
