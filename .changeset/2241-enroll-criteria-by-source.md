---
"hotcrm": patch
---

**Enroll Members asks only for the criterion of the source you pick.** Before, the dialog showed both "Enroll leads in status" and "Enroll contacts in department", and required both, whatever "Enroll" was set to, so enrolling contacts by department still asked for a lead status the run ignores. Now Leads shows only the lead status and Contacts only the department, and the dialog submits without the other one. The criterion you do see is still required (#2241).
