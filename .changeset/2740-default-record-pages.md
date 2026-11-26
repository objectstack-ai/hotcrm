---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Leads, cases and projects open on the standard record page: the duplicate and SLA banners and the project page's Gantt are gone (#2740).**

FROM → TO:

- **Lead.** FROM a "Suspected duplicate" warning or a red "Confirmed duplicate" banner under the header, with **Duplicate Management** folded further down. TO no banner: **Duplicate Management** moves up to second place, right under **Identity**, and on a suspected or confirmed duplicate it opens expanded and shows the **Duplicate Status** and the record the lead repeats. **Convert Lead** is unchanged: it still warns on a suspected duplicate and refuses a confirmed one.
- **Case.** FROM a red "SLA breached" banner under the header. TO no banner: a breached case shows **SLA Violated** ticked in the **SLA & Priority** section, which is always open, and the **SLA Due Date** stays among the key facts.
- **Project.** FROM a Gantt of the project's tasks under its fields in **Overview**. TO the standard project page, with the tasks in the **Related** tab. The Gantt is in **Project Tasks** › **Project Plan**: pick the project in its **Project** filter to see that project's plan.

The three objects now have no page of their own, like accounts and opportunities. Nothing in the data, the permissions or the conversion rules changes, and no setup is needed. The docs site and the in-app manuals say where each fact is now.
