---
"hotcrm": patch
---

The service agent and the service manager open the app on Service Overview again (#2262). Since the default `crm_user` permission set gave every member read on their own opportunities, both service personas passed the opportunity read gate on Home and Sales Home and landed on Home (Executive Overview). Home and Sales Home now also ask that the member does not hold the `service_agent` or `service_manager` position. Nothing else in either persona's sidebar changes, and reps, the sales manager and administrators land where they did.
