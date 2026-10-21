---
'hotcrm': patch
---

Enroll Members on a campaign that is not open, or no longer exists, now says so instead of claiming success

**Enroll Members** enrolls people only into a campaign in *Planning* or *In Progress*. On any other campaign the run
already enrolled nobody, but it then ended like a clean run: the console showed *Eligible members enrolled in
campaign.* over a run that had added no one. That happened on a *Completed* or *Aborted* campaign, and on one deleted
after the button was clicked.

- **Such a run now ends with a refusal.** The message says the campaign is not open for enrollment or no longer
  exists, that only a *Planning* or *In Progress* campaign takes members, and that nobody was enrolled. The console
  shows it with **Close** only, as it shows the other refusals, and no member row is written. The message is
  translated into Chinese, Spanish and Japanese.
- **Enrolling into an open campaign is unchanged.** Leads by status and contacts by department are enrolled as
  before, a run that refused anyone still reports both counts, and a clean run still ends with *Eligible members
  enrolled in campaign.*
- **Studio no longer warns that the flow's *Campaign Open?* step can dead-end.** The step now has a default branch,
  which is where the refusal is.
