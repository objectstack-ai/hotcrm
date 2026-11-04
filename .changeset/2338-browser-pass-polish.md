---
"hotcrm": patch
---

**Seven small fixes from the 18.2.0 browser pass: copy that pointed nowhere, a timeline that ran backwards, an attendee list with no names, and refusals that showed API names (#2338, items 5 and 7–13).**

- **Sales Home** no longer shows the *Ask the AI Assistant* card. It told every user to open an assistant panel from the right edge of the page, and an install without the platform's assistant has no such panel.
- **Deal Timeline** marks each deal on its **Close Date**. It used to draw each deal from the day it was created to its close date, so a deal closed before it was entered read backwards ("10/27/2026 → 9/7/2026").
- The **Event Attendees** list on a meeting now shows who is attending: the **Contact**, **Lead**, **User** or **External Attendee** column, then type, response and organizer. A column nobody on that meeting fills is left out.
- Moving a completed task back to an open status clears its **Completed Date**. Before, the date stayed and nobody could clear it by hand, because the field is read-only.
- The **Reports** sidebar entry **Lead Inflow** is now **Lead Engagement**. Its report has always counted leads by the month they were last contacted, not the month they arrived.
- **Top Resolving Articles** on the Service dashboard no longer lists a "—" row with 0 for closed cases that no article resolved.
- When a closed deal, an accepted or expired quote, or an activated contract refuses an edit, the message the user sees names fields and statuses by their labels ("is closed (Closed Won); only its Description and Next Steps can still be edited"). The error code is still `RECORD_LOCKED` (409). For the deal and the quote, the diagnostic `message` that API callers and logs read still carries the API names and the attempted fields; the user sentence rides `userMessage`. The contract's single message changed from "Cannot shrink end_date (…)" to "An activated contract's End Date cannot move earlier (…)".
- The admin guide lists the twelfth sharing rule, **Forecasts — Sales Manager Edit**.

**FROM → TO.** A tool that matched the contract refusal's old wording should match on the `RECORD_LOCKED` code instead. No data migration is needed; a task reopened before this release keeps its old Completed Date until it is completed and reopened again.
