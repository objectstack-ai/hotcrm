---
"hotcrm": patch
---

**Escalate Case and Close Case open their form directly.** Before, each button first showed a "Confirm Action — … Continue?" dialog and only then the form that asks for the escalation reason or the resolution, which has its own Cancel: two dialogs and three clicks before any input. The form is now the only dialog, the way Claim Case already worked; Cancel on it leaves the case unchanged. What an AI assistant is asked to confirm does not change: that is set by the action's AI settings, which these two actions do not declare (#2240).
