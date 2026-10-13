---
'hotcrm': patch
---

The **SLA Violations** tile on the service dashboard now counts open breaches when it is read, so it is right on every deployment, including one that runs no scheduled work (the platform default). It used to count only cases flagged **SLA Violated**, and an open case is flagged only by the hourly SLA sweep, which never runs where scheduled work is off. Such a deployment showed far fewer violations than it had: on a fresh demo database the tile read **13** while **29** cases had breached. The tile now counts a case that is flagged, or a case that is still open (neither *Resolved* nor *Closed*) and whose **SLA Due Date** has passed, using the same rule the sweep applies. A fresh demo database now shows **29**. The tile only counts: escalating a breached case and alerting its owner still need the sweep, so where it does not run, an open breach is in the count but not yet in **Escalated Cases**.
