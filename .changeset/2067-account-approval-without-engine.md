---
'hotcrm': patch
---

Accounts created on a deployment without approvals are no longer locked for good. Until now every new account started as *Pending*, even where no approval engine exists to decide it (a hosted plan that leaves approvals out, for example), so the record page showed it as locked for approval with Edit disabled and nothing could ever unlock it. A new account now starts with **Approval Status** blank and turns *Pending* when its approval request is opened. Where approvals are available nothing changes: the account is *Pending* as soon as it is created, waits in the approval inbox, and becomes *Approved* only through a decision. Where they are not, the account stays blank and editable. To switch account sign-off off, an admin now sets the default on **Approval Status** to *Approved*. Accounts already created as *Pending* with no request behind them are not changed by this update.
