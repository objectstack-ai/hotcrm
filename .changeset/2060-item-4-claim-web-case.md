---
'hotcrm': patch
---

A service agent can now pick up a case that came in through the web support form. Such a case has no **Account** (the public form does not ask for one), and the case form marked **Account** as required, so moving the case to **In Progress** to claim it stopped at *"Please check the highlighted fields: Account"* and nothing was saved. The form no longer requires **Account**: the claim saves and the case becomes the agent's, as the Cases guide describes. **Account** stays on the form. A case raised in the console may now also be saved without one; its SLA target is the one for an **SMB** customer, the same as a web case's, and escalating it opens no account follow-up task.
