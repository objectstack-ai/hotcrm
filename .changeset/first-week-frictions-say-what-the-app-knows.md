---
'hotcrm': patch
---

Three first-week frictions in the sales journeys, each one a place the app knew
the answer and made you click for it anyway.

**Converting a lead no longer asks twice.** *Convert Lead* used to raise
`Are you sure you want to convert this lead?` before opening the Conversion
Details screen — a screen that already states the decision, already carries a
Cancel button, and already warns you when this lead repeats one you have. The
confirm added a click and no information, so it is gone. Confirms stay where
they earn their place: destructive actions with no follow-up screen, such as
closing or escalating a case. The AI approval signal is untouched — an agent
calling this action still reports that it needs human approval, which was
always a separate flag from the console's dialog.

**The task list stops spelling "done" three ways.** The All Tasks grid showed a
completion tick, a status and a progress percent side by side. Nothing in the
app maintains a percent per task — it is written once, as 100, when a task is
completed — so on that grid it was the status column again at lower resolution:
0% could not tell a task not started from one in progress. The column is gone
from that one grid. The field is untouched, and every view that uses it for
something still does: the Execution Plan gantt fills its bars from it, the Task
Board and My Open Tasks show it, Avg Progress still aggregates it, and you can
still set it on the task form.

**An opportunity's Related tab opens on its quotes** instead of on three shut
bars whose headers already told you the counts.
