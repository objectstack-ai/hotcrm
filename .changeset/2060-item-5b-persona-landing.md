---
'hotcrm': patch
---

The app now opens on each role's own home page. Before, every user who could read opportunities landed on **Home** (Executive Overview), and a service agent landed on **Leads**. Now:

- A **sales manager**, an **administrator** or a **marketing user** lands on **Home** (Executive Overview), as before.
- A **sales rep** lands on **Sales Home**, the rep's page of pipeline figures, leads, open deals, open tasks and upcoming events. **Home** is no longer in a rep's sidebar.
- A **service agent** or **service manager** lands on **Service Overview**, the service dashboard.

To make this work, **Service** is now the first group in the sidebar for everyone, and **Service Overview** is the first entry in it, above **Cases** and **Knowledge**. The console opens the app on the first entry a user's sidebar shows, so the order of the sidebar decides where each role lands.
