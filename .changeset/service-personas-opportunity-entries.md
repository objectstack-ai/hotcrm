---
"hotcrm": patch
---

The service agent and the service manager are no longer shown Sales Performance, CRM Overview or the four opportunity reports (Opportunities by Stage, Won Opportunities by Owner, Pipeline Coverage, Opportunity Funnel by Owner) (#2268). Since every member holds `crm_user` and so reads their own opportunities (#2231), the read gate on these six entries no longer kept them from the two service positions. They now share Sales Home's audience, which also asks the position. The service personas still land on Service Overview and keep the Opportunities and My Deals entries. Sales reps, the sales manager and administrators see the same sidebar as before. The quick tour and the Service page, in English, Simplified and Traditional Chinese, no longer say that the service personas read no opportunities, and the Service page now says that a sales rep is shown only Knowledge in the Service group.
