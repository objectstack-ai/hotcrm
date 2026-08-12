---
'hotcrm': patch
---

Stop the admin docs sending readers to Setup screens this platform has never
shipped — nineteen invented page names across eight pages and three locales.

These were not typos. Each one is a factual claim about the product's UI that a
reader acts on, and several sat on top of a capability that does not exist at
all, so following the instruction could not fail gracefully: the FAQ promised
that a deleted record waits 30 days in a **Recycle Bin**, when every delete this
platform performs is a hard delete — `@objectstack/spec` retired the flag that
used to promise otherwise and says so in as many words ("a default-true flag
promising a recycle bin was a false affordance").

Where the screen exists under another name, the docs now use it:

- *Profiles* → **Setup → Permission Sets**, and the pages say plainly that what
  they call a profile is a permission set.
- *Sharing Settings* → **Setup → Sharing Rules**.
- *Company Information* → **Setup → Company**; *Security → SSO* →
  **Setup → SSO Providers**; *Security → Audit Log* → **Setup → Audit Logs**.
- zh-Hans drift on shipped pages: 设置 → *电子邮件* → **设置 → 邮件**, the label
  the zh-CN pack really carries.

Where the capability itself is absent, the page now says so instead of naming a
door that is not there — the convention the setup checklist already used for
business hours:

- **No Recycle Bin.** A delete is permanent and immediate; the audit log records
  who did it and does not bring the record back.
- **No Lead Settings, and no assignment rules.** An ownerless lead goes to
  whichever holder of the `sales_rep` position has the fewest open leads
  (`src/objects/lead.hook.ts`) — load balancing, not region or territory
  matching, which is what the FAQ claimed.
- **No Sandbox Management, no Change Packages, no Git Sync.** Provisioning an
  environment is an ObjectStack Cloud control-plane concern, not a page in this
  tenant's Setup; HotCRM's metadata is TypeScript under `src/`, reviewed in git
  and shipped with the app, so the release page now describes the intended shape
  and names what actually happens.
- **No Privacy screen and no Data Subject Request record.** Access and erasure
  requests are served by hand; no bundle is generated, no audit certificate is
  produced, and no DPA template ships.
- **No SCIM screen** (the capability is real, the navigation entry is not) and
  **no Session Policy screen** — login settings are at **Setup → Authentication**
  and live sessions at **Setup → Sessions**.
- **No Usage dashboard.** API calls per user, AI invocations and storage growth
  are not collected anywhere a reader can look. **Setup → System Overview** shows
  users, organizations, sessions, installed packages and audit-event counts —
  platform health, not quota consumption.

Every name fixed here deletes its line from the quarantine ledger in
`test/docs-setup-navigation-names.test.ts`, which is staleness-checked in both
directions: the ledger drops from 39 entries to 20, and neither half of that
change can be faked — a line deleted without the prose being fixed fails, and
prose fixed without deleting the line fails too. The remainder is the two
sub-classes still to come (#1113): names that are real in **Studio** but cited
under **Setup**, and the zh-Hant navigation strings, which cannot resolve because
the platform ships no Traditional-Chinese pack.
