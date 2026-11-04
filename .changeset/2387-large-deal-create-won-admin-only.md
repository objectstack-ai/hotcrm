---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Only an administrator can create a deal of 100,000 or more already Closed Won (#2387).** Before, anyone could create such a deal directly at **Closed Won**, from the New form, the API or an import: no approval ever started and the deal stood won at **Not Required**, a way past the rule that a large deal is won only once its Large Deal Approval is approved (#2350). Now that create is refused for everyone but an administrator (the organization's owner, an organization admin or a platform administrator), with the same message as the refused move to Closed Won, so an administrator can still load historical won deals. Creating the deal at an open stage sends it for approval as before. Seed data and other system writes are unaffected, and moving an existing deal to Closed Won still needs the approval, for an administrator too. The Sales Manual and the Approvals page say so in English and Chinese.
