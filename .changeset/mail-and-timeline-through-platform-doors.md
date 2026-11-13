---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Send Email and the activity actions hand their mail and timeline entries to the platform.** Send Email gives its message to the platform's mail service and adds its timeline entry through the platform's activity service. Log a Call, Log a Meeting and Schedule a Meeting add their timeline entry the same way. An app action no longer writes the mail log or the activity feed itself; the platform records who sent or logged it, under which organization, and which action added the entry.

**What a user sees changes in one place.** An email sent with Send Email now goes out from the deployment's configured sender address, with the rep named in the sender's display name (the rep's name, then "via" and the organization's name), instead of from the rep's own address. Replies still reach the rep: the rep's address is the message's reply-to.

The timeline entries look as before and name the rep by their display name. An email's entry no longer links to the mail log row, which a sales rep cannot open; it carries the message's id in its details. A logged call's or meeting's entry keeps the first 4,000 characters of its notes in its details; the event keeps all of them.

Requires ObjectStack 18.4.0.
