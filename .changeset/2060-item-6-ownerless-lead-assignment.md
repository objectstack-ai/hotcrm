---
'hotcrm': patch
---

**A new lead with no owner no longer fails New Lead Routing & SLA.** A lead that lands without an owner — a Web-to-Lead submission while nobody can be assigned from the Sales Rep pool, or a lead written by an import or an integration without one — still got its Next Follow-up Date, but the routing run then failed while sending its alert, because there was no owner to send it to. The failure showed up only in the flow's run history and the server log.

Such a lead now gets its Next Follow-up Date (tomorrow at four stars or better, otherwise in three days) and no alert, and the run ends successfully. A lead with an owner is routed exactly as before: its owner is alerted.
