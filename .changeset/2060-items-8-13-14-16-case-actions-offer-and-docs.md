---
"hotcrm": patch
---

**Escalate Case and Close Case are offered only to people who may edit a case.** Both buttons edit the case they sit on, so they now appear only for the Service Agent, the Service Manager and the administrators. Sales Rep and Sales Manager can read cases (an account's support history) but not edit them, and Marketing User has no access to cases. Until now both buttons were drawn for anyone who could open the case, and a sales rep or manager who pressed Escalate Case got "Node 'escalate' failed: update_record(crm_case) failed: You do not have permission". The rule follows each person's permission set, so it moves with the set.

**Docs that described the app as it was.**

- **Campaign members.** *Unsubscribed* is set on the member record by a user who may edit campaign members (Marketing User and the administrators). The page used to say a sales rep sets it; reps and sales managers cannot edit a member. Nothing in the app sets it automatically.
- **Quick tour.** The lead button is **Convert Lead** (转化线索), not *Convert*, and the Simplified Chinese pipeline screenshot is captioned with the view's own name, 销售流水线.
- **Module-split inventory** (`docs/architecture/module-split-inventory.json`). Add to Campaign on a lead and on a contact are no longer listed as action bodies that write another module's object; since #2167 each starts the marketing module's own enrollment flow. The change is recorded in the file's hand-edit log, and the measured figures are left as measured.
