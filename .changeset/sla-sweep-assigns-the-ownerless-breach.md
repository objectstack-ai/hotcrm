---
'hotcrm': patch
---

The hourly SLA sweep now gives an unowned breached case an owner, and alerts
that owner.

Before this, a case with nobody on it that blew its SLA was flagged, escalated
— and then nothing. The alert was addressed to the case's owner, there wasn't
one, and the notification was skipped. So the worst square on the board (SLA
already missed, and nobody accountable) was the one square where no one was
told.

What happens now, for a breached case with no owner:

1. The breach is recorded on the case, as before — **SLA Violated**, status
   *Escalated*, escalation reason stamped.
2. The escalation hands the case to the holder of the **Service Manager**
   position with the fewest open cases — the same least-loaded hand-off every
   other escalation in the app already uses. Nothing new decides "who": the
   sweep escalates, and the escalation is what assigns.
3. That manager is alerted — inbox and email, carrying the case number and
   priority, exactly like an owned breach.

**When nobody holds the Service Manager position, the sweep does nothing about
ownership for that case and the run carries on.** The case stays unowned, the
breach still lands on the record and in the run summary's named gate, and every
other breached case is still swept. There is no fallback recipient and no hard
failure — an empty bench costs one alert, never the sweep.

An already-owned breached case is untouched: its alert still goes to the agent
it came from.
