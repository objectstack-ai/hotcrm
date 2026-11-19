---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Text HotCRM writes by itself is in the organization's language (#2494, #2522, #2535).** A Chinese organization used to read English sentences it never wrote: the escalation reason on every critically raised or SLA-breached case (`Auto-escalated: critical priority`), the title of every task the app opens by itself (a won deal's activation, a qualified lead's follow-up, an escalated case's follow-up, a stalled deal, a contract nearing its end), the description of a contract drafted from an accepted quote, and the name and next step of the renewal deal the sweep opens. With objectstack 18.6.0 each of these is declared as text with its translations in the locale packs (zh-CN, ja-JP, es-ES), and the platform writes it in the organization's language: its Localization setting when one is set, otherwise the app's default language, never the language of the person whose save set it off. A language with no translation gets the English text. A private deal's task still names no deal, in every language. A stalled deal's name is now cut at 200 characters in its task title (it used to be the whole title that was cut at 255), which leaves room for every language's opening.

Three automations used to find their own records by the English wording, and now find them by a hidden **Automation Key** field instead (`crm_task.automation_key`, `crm_contract.automation_key`): closing a case completes the escalation follow-up tasks it opened, the stall sweep books one task per stall episode, the renewal sweep books one reminder per contract, and the "contract drafted" notice still reaches the person who accepted the quote exactly once. Text is picked when it is written, so existing records keep their English text. Rows written before this release are still recognised: a task with no Automation Key that carries the exact English title the previous release wrote counts as the automation's own, so an organization that upgrades with such a task open gets no second stall task or renewal reminder, and closing the case still completes its escalation task.

Not covered: the "Meeting: " / "Meeting scheduled: " prefix that the Log Meeting and Schedule Meeting actions write into an activity's summary. Those are script actions, and the platform's organization-language text for actions is not in objectstack 18.6.0.
