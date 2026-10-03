---
'hotcrm': patch
---

A fresh demo install now shows logged interactions on the lead **Activity** tab, which
used to read "No activity recorded" on every lead. **Lisa Thompson** (CloudFirst) and
**David Kim** (EduTech Labs) each show two logged interactions from the past fortnight:
a call or meeting, with its duration and a **View source** link to the calendar event
behind it. These are the same timeline entries **Log a Call** / **Log a Meeting** write,
seeded for held lead events that already existed plus two new earlier touches on those
leads. A lead with no held interaction, such as Alice Martinez, still reads empty.

This became possible with the pinned platform (17.4.0): a seeded timeline entry can now
point at a lead and an event by their natural keys, and the platform resolves them to the
real records at boot. Timeline entries are telemetry that the platform keeps for 14 days,
so only interactions younger than that are seeded. They carry no acting user, because a
seed cannot name one; the tab shows them as **System**.
