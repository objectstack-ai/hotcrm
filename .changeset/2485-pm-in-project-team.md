---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A project's Team now lists its Project Manager too (#2485).** Staffing someone on a project with the responsibility *Project Manager* used to leave them out of the project's **Team**, because on ObjectStack 18.5.0 a project manager who was in the Team as well lost edit on a project they did not own: the Team's read access replaced their edit access, and editing or staffing the project answered 403. ObjectStack 18.6.0 keeps each sharing rule's access separately and the wider one wins, so the Team is now everyone staffed on the project, the Project Manager included, and the Project Manager still edits the project, staffs it and approves its timesheets and expenses. A project's Team is re-written the next time its staffing changes; until then an existing project keeps its old Team, and its Project Manager keeps edit either way. The Projects and Staffing page, the administrator's sharing-rule table and the in-app Project Delivery manual no longer say that the Project Manager is left out of the Team.
