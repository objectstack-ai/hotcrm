---
'hotcrm': patch
---

The Chinese UI stops rendering two different priority values as the same word.
`crm_case.priority.critical` now reads **严重**; `crm_task.priority.urgent`
keeps **紧急**.

### What was on screen

`crm_case` and `crm_task` carry overlapping-but-unequal priority vocabularies —
`low/medium/high/critical` against `low/normal/high/urgent` — and three of the
four locales keep their top values distinct:

```
en      case.critical  Critical   task.urgent  Urgent
es-ES   case.critical  Crítica    task.urgent  Urgente
ja-JP   case.critical  重大        task.urgent  緊急
zh-CN   case.critical  紧急        task.urgent  紧急     ← the same word
```

ja-JP did not merely differ, it deliberately picked a word per object, which is
what makes zh-CN's collapse an oversight rather than a choice. A Chinese-reading
user — or an agent re-authoring metadata from the rendered UI and the docs — saw
one word on both objects with no signal that the underlying values differ. That
is the condition under which a case value ends up in a task predicate, and this
repo has already paid for that crossing twice in code and prose
(`src/views/task.view.ts` still carries the tombstone of the first).

### What moved

- `crm_case.priority.options.critical` — 紧急 → **严重**.
- The **Customer Service** dashboard's Critical Cases tile — 紧急工单 →
  **严重工单**, and its description with it (标记为紧急优先级的未关闭工单 →
  标记为严重优先级的未关闭工单), the way ja-JP already words both halves
  (重大ケース / 優先度「重大」のオープンケース).
- The Chinese documentation prose that calls a **case** 紧急/緊急 — 7 pages,
  9 sites per script face — now says 严重/嚴重, so the docs keep naming the value
  the console shows (AGENTS.md, Documentation discipline rule 6).

### What deliberately did not move

`crm_task.priority.options.urgent` keeps **紧急**: *urgent* is the task's own
literal word, so leaving it there is the smallest semantic displacement. Every
docs sentence about a **task** keeps 紧急 too — the sweep was graded per
occurrence by which object the sentence is about, never by the word. The generic
phrase 紧急程度 ("priority level") is not the value word and is untouched.

Both option lists now carry a comment saying why the two words must differ, so
the next reader does not tidy one into the other.
