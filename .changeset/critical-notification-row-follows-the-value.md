---
'hotcrm': patch
---

The Chinese service docs stop naming a notification after a word the console no
longer shows for its trigger.

PR #1801 moved `crm_case.priority.critical` from 紧急 to **严重** and swept the
documentation prose that *describes* a case as 紧急. It deliberately did not
touch the **name of a named thing**: the automation row the English pages call
**Notify on Critical** was still spelled 紧急时通知 / 緊急時通知 on the Chinese
faces. Its trigger is `crm_case.priority = critical`, so the row named a
notification after 紧急 — the word the packs now reserve for
`crm_task.priority.urgent` — while the cell beside it wrote the trigger in
English as `Critical`.

The row name is now **严重时通知** / **嚴重時通知**, which is the same rule its
own sibling already follows: **升级时通知** / **升級時通知** embeds 升级, the
rendered name of the `escalated` status it fires on. The Chinese row names are
`<rendered trigger>时通知`, so aligning the trigger word is what keeps the pattern
true rather than a fresh coinage.

### What moved — 8 sites, 3 pages × 2 script faces

| page | zh-Hans | zh-Hant |
| --- | --- | --- |
| `content/docs/service/cases` | 1 | 1 |
| `content/docs/service/index` | 1 | 1 |
| `content/docs/service/sla-and-escalation` | 2 | 2 |

### What deliberately did not move

- **The English pages.** "Notify on Critical" is correct and is the baseline.
- **`升级时通知` / `升級時通知`**, the sibling row — its trigger is the
  `escalated` status, which did not move.
- **Every 紧急 that is about a task.** The follow-up task the escalation opens is
  `crm_task.priority.urgent`, which keeps 紧急 by the #1342 ruling; the sentences
  describing it are untouched on all four pages that carry them.
- **The generic 紧急程度 / 緊急程度** ("priority level") — not the value word.
- **`CHANGELOG.md`**, which records what was true when each release shipped.

`严重` is the `zh-CN` pack value; `嚴重` is that wording in Traditional
characters, the sourcing rule the `zh-Hant` pages already state and the spelling
PR #1801 established on these same two pages. No Traditional translation is
coined here.
