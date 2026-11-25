---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Project Delivery: a task moved out of Completed no longer keeps its 100 % (#2768).** Marking a project task Completed sets its **Percent Complete** to 100. Moving it back to Not Started, In Progress or On Hold left that 100 in place, so a task nobody had started counted as finished and the project's Percent Complete read too high until someone typed the task's percentage back by hand. Now a task moved out of Completed, to any other status, goes back to 0 %, and the project's Percent Complete follows at once. To reopen a task part done, change the status and the percentage in the same save: the percentage you give is kept. The estimate a task held before it was completed is not restored automatically; the record's history still shows it. A Completed task whose percentage is not 100 (a task from before Completed set it) keeps its own figure. Tasks reopened before this release keep the 100 they hold until their percentage is edited. The project plan manual, the product page and the field's help text now state the rule.
