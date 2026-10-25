---
"hotcrm": minor
---

**Record editors upload and delete attachments, and delete comments (#2038).** A sales rep, a sales manager, a marketing user, a service agent and an administrator can now upload a file to the Attachments panel of a record they can edit (a quote PDF, an executed contract, a case screenshot) and delete files there. Until now only the platform administrator could: the profiles granted the panel read only. The same profiles can now also delete a comment in a record's Discussion.

Where an upload or a delete is accepted is decided by the record, as the Files & Comments guide says. You upload only to a record you can edit. You delete a file you uploaded, or any file on a record you can edit. You delete a comment you wrote, or any comment on a record you can edit. A rep who reads a contract but cannot edit it is refused an upload there, and a delete of someone else's file or comment there. These rules are the platform's, from ObjectStack 18.1.0, which this app already runs on.

A member who holds only the default **CRM User** set still sees and downloads files but uploads and deletes none. Nothing changes for anonymous web-form visitors.
