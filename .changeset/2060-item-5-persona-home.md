---
'hotcrm': patch
---

The sidebar no longer offers a service agent pages it cannot open. **Home** (Executive Overview), **Sales Performance**, **CRM Overview** and **Pipeline Coverage** are built on opportunities, and a user who cannot read opportunities (the Service Agent and Service Manager permission sets) used to get each of them as a page of "You don't have access" tiles. Those entries are now left out for such a user; everyone who reads opportunities sees the same sidebar as before. **Sales Home**, the rep's page of pipeline figures, leads, open deals, open tasks and upcoming events, is now pinned in the sidebar under **Home**. Before, it could only be reached by typing its address. The app still opens on **Home** for every user, a service agent included: the console has no way to give each role its own landing page yet.
