# Setup pass as the system administrator — HotCRM `main` on ObjectStack 18.0.0, 2026-10-20

Track 2 of objectstack-ai/hotcrm#2207. Every item of the platform's **Setup** app, driven as the system administrator on a
local boot, with create / edit / delete and every action where safe. Every access-control change was checked by signing in
as the affected user. This round also re-measures the 24 cards the seat filed from #2188's track 2.

Screenshots are under [`shots/`](./shots). The item list is the one the boot served: [`setup-nav.json`](./setup-nav.json).
Ids: **F-nn** are this round's new findings. A prior card is named by its card number, with its #2188 id in brackets
(for example objectstack#24757 [F-02]), so the two numberings never collide.

## Build

| | |
|---|---|
| `main` sha | `16c28664cbc55215448f474e13610c6caa98ba81` (PR #2204, for #2202) |
| `@objectstack/*` | `18.0.0`, all 23 packages in `package.json`. `@objectstack/console` 18.0.0 is objectui `1f23d5b070fa`, per its CHANGELOG. |
| Browser | Chromium 141.0.7390.37 (`/opt/pw-browsers/chromium`), `@playwright/test` 1.63.0, viewport 1440×900 |
| Mode | `objectstack dev -p 4001`, development, fresh SQLite DB seeded on boot |

Boot commands:

| Command | Exit |
|---|---|
| `pnpm install` | 0 (15.6 s) |
| `pnpm dev` | long-running. It served `401` on `/api/v1/meta/app` about 20 s after start. Not restarted. |
| `pnpm demo:staff` | 0 ("demo org staffed", 21 rule-materialised grants, 2 pending approvals) |

`GET /api/v1/meta/app` with no query lists the apps `crm_enterprise`, `setup` and `account`. The Setup app's name is `setup`, as
assumed: `?id=setup` returns the merged navigation (saved as `setup-nav.json`), and `?id=com.objectstack.setup` returns
`{"type":"app","items":[]}`.

Logins (no passwords here):

- **Dev admin** `admin@objectos.ai`. The credentials come from the boot banner ("Dev admin: … · dev only") and `AGENTS.md`.
- **Demo staff** `eu.rep@objectos.ai`, used for the declared-sharing-rule effect check. Its password is declared in `src/sales/sharing/demo-staffing.ts`.
- **Throwaway users created by the tester**, each one for a specific set of checks:
  - `qa.plain@objectos.ai`, through Setup → Users → Create User with a typed password. Used for the new-user landing, the permission-set grant and revoke, the position add and remove, ban and unban, Set Manager, Edit, the org role change, team membership and the sharing-rule effect.
  - `qa.gen@objectos.ai`, through Create User with the password left blank (generated). Then Set Password with "require change", and impersonation.
  - `qa.pos@objectos.ai`, through `POST /api/v1/auth/admin/create-user` (the endpoint Create User calls). Used for the position-holder effect, the permission-set clone, field-level security, deactivation, the account lockout and session revoke. That endpoint marks the user as must-change-password by default, so the tester changed its password through the user's own `/api/v1/auth/change-password` first.
  - `qa.csv@objectos.ai`, through Users → Import (CSV). Later removed from the organization.
  - `qa.invitee@objectos.ai`, an invitation that was later canceled.

## Coverage

41 nav items from `setup-nav.json`. One more than #2188: **Declared Sharing Rules** is new in 18.0.0. Two settings pages are
reached only from *All Settings* (SMS Delivery, Data Lifecycle), and they are listed below the 41.

**Counts over the 41 items: pass 19 · fail 20 · not reachable 2 · not tested 0.** An item is "fail" if it carries at least one
finding or one prior card that still reproduces. The parts of a failed item that pass are listed under *What I did*.

| # | Group | Item | What I did | Verdict | Reason | Screenshot |
|---|---|---|---|---|---|---|
| 1 | Overview | System Overview | Read 4 tiles + 3 charts; Refresh All (7 dataset queries, all 200, 992 ms); date presets (15) → Today | pass | Numbers match the Users list; #2194 T2-U01 unchanged | `00-setup-home.png`, `01-overview-system-overview-today.png` |
| 2 | Apps | Packages | HotCRM sheet: Edit (refused 422), Publish (refused 422). New Package: blank Create disabled, id derived, created 201. Publish, Adopt loose items, Export (downloaded), Disable/Enable, Revert (404), Duplicate (empty copy), Delete with typed name and keep-data choice. Import: bad file refused, flat manifest installed | fail | objectui#13157 [F-06ui], objectui#13166 [F-26] | `02-apps-packages-hotcrm-sheet.png`, `02-F06ui-packages-readonly-edit-refused.png` |
| 3 | Apps | Packaged Automation | Listed 33 flows + actions. Toggled `task_urgent_alert` off/on and measured the effect (an urgent task: 0 notifications off, 1 on). Clone: invalid name refused in the dialog; valid name creates it | fail | **F-01**, objectui#13159 [F-07] | `03-F01-packaged-automation-clone-runs-beside-original.png`, `03-F07-packaged-automation-unbound-schedule-on.png` |
| 4 | Apps | Browse Marketplace | Opened; Retry | not reachable | `GET /api/v1/marketplace/packages` → 502 "fetch failed": the container's network policy | `04-apps-marketplace-502.png` |
| 5 | Apps | Installed Apps | Listed the imported package; Uninstall with confirm → removed, with a result banner | pass | #2194 T2-U06 unchanged (page titled "Packages") | `05-apps-installed-apps-one.png`, `05-apps-installed-apps-uninstalled.png` |
| 6 | Apps | Cloud Connection | Connect | not reachable | `POST /api/v1/cloud-connection/bind/start` → 502, page shows "fetch failed / Try again" | `06-apps-cloud-connection-connect.png` |
| 7 | People & Org | Users | Create User (blank, duplicate, typed password, generated). New-user landing. Permission-set grant/revoke and position add/remove, each with its effect. Ban (effect 401, sign-in 403 BANNED_USER) / Unban, Unlock, Set Password, Set Manager, Impersonate, Edit (name required, URL, bad locale), Invite, CSV Import (3 steps), 5 views | fail | **F-02**, **F-03**, objectstack#24758 [F-10], objectstack#24760 [F-11], objectstack#24762 [F-12] | `07-people-users-record.png`, `07-F03-users-security-tab-self-service-on-other-user.png` |
| 8 | People & Org | Organization | Tabs; Edit dialog. Change Role Member→Admin, then Member, each with its effect: `qa.plain` gets the `setup` app with 20 nav items, then loses it. Remove Member | pass | Make Owner not tested (it would demote the dev admin) | `08-people-organization-record.png`, `08-people-organization-effect-org-admin.png` |
| 9 | People & Org | Business Units | New: blank → "Name is required"; duplicate code → 409 and the dialog stays. Child with parent lookup, Org Chart tree, overlay Edit, Delete parent, Delete child | fail | **F-04** | `09-people-business-units-org-chart.png`, `09-people-business-units-delete-parent-confirm.png` |
| 10 | People & Org | Teams | Create (blank refused), Edit Team (rename), Add Member from the team, Remove from Team, Delete Team (the last team: refused) | fail | **F-05**, objectstack#24765 [F-15] | `10-F05-teams-remove-member-not-org-member.png`, `10-people-teams-related.png` |
| 11 | People & Org | Invitations | Invite (toast, dev mail sink row in `sys_email`); Resend (prefilled); Cancel → listed under Expired / Canceled | pass | | `11-people-invitations-canceled.png` |
| 12 | Access Control | Positions | Read `sales_manager`. New: invalid name refused inline; saved as a draft; bound `marketing_user`; published. Add holder → effect (`crm_campaign` 200); Remove holder → effect (403). Deactivated; Delete | fail | objectstack#24757 [F-02] | `12-access-positions-sales-manager.png`, `12-access-positions-holder-added.png` |
| 13 | Access Control | Capabilities | List (10, read-only); detail | pass | #2194 T2-U02 unchanged (developer text) | `13-access-capabilities-detail.png` |
| 14 | Access Control | Permission Sets | Read `sales_rep` and `sales_manager`. Clone to customize. Add user → effect (`crm_account` 403→200). Field-level `crm_account.phone` read off → effect (the API omits `phone`, the record page hides it). List switch: deactivate → 403, reactivate → 200 | fail | **F-06**, objectstack#24757 [F-02] | `14-F02-permset-sales-manager.png`, `14-access-permission-sets-fls-effect-record.png` |
| 15 | Access Control | Sharing Rules | All views. New with the criteria builder (`territory = EMEA`, recipient team) → effect (`qa.plain` 0→2 accounts). Edit read→edit (PATCH 200 as the user). Deactivate → 0. Delete with a named confirm | pass | #2194 T2-U03 unchanged (raw recipient options) | `15-access-sharing-rules-filled.png`, `15-access-sharing-rules-list-after-create.png` |
| 16 | Access Control | Declared Sharing Rules (new) | Read 11 package rules. Switch `europe_territory` off → `eu.rep` 2→0 accounts, on → 2. Clone → prefilled name, criteria shown, a result offering "Switch europe_territory off" | pass | | `16-access-declared-sharing-rules.png`, `16-access-declared-sharing-rules-cloned.png` |
| 17 | Access Control | Record Shares | All views; overlay | fail | objectstack#24775 [F-25b] (the overlay is titled by the raw recipient id) | `17-access-record-shares-detail.png` |
| 18 | Access Control | API Keys | Create (masked, copy), used it (200 with `x-api-key` and with bearer), Revoke (403), Restore (200), final Revoke (403) | fail | objectstack#24760 [F-11] | `18-F11-api-keys-active-offers-restore.png`, `18-access-api-keys-create.png` |
| 19 | Approvals | Approvals Inbox | My Pending / Submitted / All; opened a request | pass | #2194 T2-U09 partly changed (see *UI and UX suggestions*) | `19-approvals-inbox-admin-all.png`, `19-approvals-inbox-request-open.png` |
| 20 | Approvals | Requests | Views; record. Send reminder; Override Reassign (→ Priya); Override Reject; Override Approve | fail | objectui#13164 [F-23a] | `19-approvals-override-reassign-dialog.png`, `19-F23a-approvals-after-override-reassign.png` |
| 21 | Approvals | Action History | Read; By Actor; the override flag now fits at 1440 px | pass | | `21-approvals-action-history.png` |
| 22 | Approvals | Delegations (OOO) | New: Delegator offers only the admin; search for anyone else → "No options found". Self → Tomas 201. Delete | pass | objectstack#24764 [F-14] changed; U-04 | `22-F14-delegations-delegator-self-only.png`, `22-F14-delegations-search-other-no-options.png` |
| 23 | Configuration | All Settings | Read 11 cards; opened SMS Delivery and Data Lifecycle (hub only) | pass | | `23-config-all-settings.png` |
| 24 | Configuration | Localization | Invalid timezone (field error + toast). Asia/Shanghai → effect (Users "3:08 pm" → "11:08 pm"); reverted. Unsaved changes + sidebar navigation | fail | objectui#13163 [F-17] | `24-config-localization-dirty.png`, `24-F17-config-localization-nav-away.png` |
| 25 | Configuration | Company | Saved a legal name; saved an invalid website and email | fail | **F-07** | `25-F07-config-company-invalid-saved.png` |
| 26 | Configuration | Branding | Blank name refused under the field. Saved a name, accent and logo; checked the login page, title, CSS and header; reverted | fail | objectstack#24766 [F-16] | `26-F16-config-branding-effect-login.png`, `26-F16-config-branding-effect-app.png` |
| 27 | Configuration | Authentication | Read 43 settings; self-signup probe (403). Lockout threshold 3 → effect on `qa.pos` (locked; Unlock works); reverted | pass | objectstack#24776 [F-27] changed | `27-config-auth-full.png`, `27-config-auth-lockout-users-list.png` |
| 28 | Configuration | Email | Send test (blank host; filled host); Save with the required fields empty | fail | objectstack#24767 [F-18] | `28-F18-config-email-send-test-no-recipient.png`, `28-config-email-save-required-blank.png` |
| 29 | Configuration | File Storage | Test connection → "Storage round-trip succeeded (adapter=local)" | pass | Adapter switch not tested (it would orphan files) | `29-config-file-storage-test.png` |
| 30 | Configuration | AI & Embedder | Test connection (memory echo message); Test embedder ("Embedder is disabled. Pick a provider…") | pass | objectstack#24769 [F-19] fixed | `30-config-ai-test-embedder.png` |
| 31 | Configuration | Knowledge | Test connection ("In-memory adapter — no external service to probe…") | pass | objectstack#24769 [F-19] fixed | `31-config-knowledge-test.png` |
| 32 | Configuration | Feature Flags | AI Assistant on → saved; no visible change with the memory AI provider; reverted | pass | Effect not observable on this boot | `32-config-feature-flags-ai-on-effect.png` |
| 33 | Configuration | Notification Preferences | New (mute `urgent_task` / inbox for the admin) → effect (+0 muted, +1 after delete); Delete | fail | objectstack#24775 [F-25b] | `33-F25b-config-notification-preferences-created.png` |
| 34 | Configuration | Notification Subscriptions | New `user:<qa.plain>` on `urgent_task` → no delivery; Delete | fail | objectstack#24770 [F-20] | `34-config-notification-subscriptions-created.png` |
| 35 | Configuration | Notification Templates | New (blank → "Topic is required"); templates for `urgent_task` and `crm.urgent_task`, inbox, `en` → no effect; Edit; Delete | fail | objectstack#24770 [F-20] | `35-config-notification-templates-list.png` |
| 36 | Diagnostics | Audit Log | 6 presets, object filter, detail, Open as list | fail | **F-08**, objectui#13165 [F-24], S-1 | `36-diagnostics-audit-log-auth.png`, `36-F24-audit-log-filter-placeholder.png` |
| 37 | Diagnostics | Sessions | Views. Revoke Session → effect (that session 401). Sign out other devices → effect (other admin session 401, own 200) | pass | | `37-diagnostics-sessions-revoked.png`, `37-diagnostics-sessions-signout-others.png` |
| 38 | Diagnostics | Notifications | Recent / By Topic; detail payload | pass | #2194 T2-U18 unchanged | `38-diagnostics-notifications-detail.png` |
| 39 | Integrations | Datasources | Test, Sync objects, Refresh on `default`. New datasource (`:memory:`) with its Test. Looked for edit or delete | fail | objectstack#24772 [F-21] changed, still offers Sync and no delete | `39-integrations-datasources-sync-objects.png`, `39-integrations-datasources-runtime-card.png` |
| 40 | Integrations | Connect an Agent | Read; Download SKILL.md; Create key (then revoked). MCP endpoint unauthenticated → 401 + resource metadata | pass | #2194 T2-U13 and T2-U22 unchanged | `40-integrations-connect-agent-full.png`, `40-integrations-connect-agent-create-key-redacted.png` |
| 41 | Advanced | OAuth Applications | Register (blank, invalid URL, localhost, 127.0.0.1, https), Rotate secret, Disable, Enable (inline row button), Delete | fail | objectstack#24773 [F-22] changed, objectstack#24774 [F-23b] | `41-F22-advanced-oauth-localhost.png`, `41-F23b-advanced-oauth-rotate-confirm.png` |
| — | Configuration (hub only) | SMS Delivery | Read; Send test SMS | fail | objectstack#24767 [F-18] changed (now explains; still no recipient field) | `23-config-settings-sms.png` |
| — | Configuration (hub only) | Data Lifecycle | Read | pass | #2194 T2-U02 unchanged (ADR copy) | `23-config-settings-lifecycle.png` |

Every item also has its landing screenshot from the first sweep: `shots/sweep-NN-<item>.png`.

## Findings

Classes: `class: a` = wrong result or broken path; `class: b` = security or data integrity. Reach is who meets it.

### F-01 — Packaged Automation: a cloned flow runs beside the original at once, and Setup has no way to switch it off
- **Persona / URL:** dev admin, `/_console/apps/com.objectstack.setup/component/automation/packaged`.
- **Steps:**
  1. On `contact_welcome` (record-change, contact created), click Clone, name it `qa_contact_welcome_copy` → 200.
  2. As the admin, create one contact owned by the admin.
  3. Read `sys_notification` for topic `contact_welcome`.
- **Expected:**
  - The page's own description: "Turn one off for this deployment, or clone a flow under a new name to customize it."
  - The sibling page, Declared Sharing Rules, does this right. Its Clone result says "The declared rule … still grants access until you switch it off" and offers a **Switch … off** button (`16-access-declared-sharing-rules-cloned.png`).
- **Actual:**
  - One contact produced **2** `contact_welcome` notifications (0 → 2): the original and the clone both ran.
  - The clone is not listed on the page, and the activation toggle refuses it.
  - The only off-switch is a REST call, which the page's own banner tells the admin to make: "send its complete definition with `status: 'obsolete'` to `PUT /api/v1/automation/<name>`. The activation toggle (`POST /api/v1/automation/<name>/toggle`) switches packaged flows only and refuses the clone."
  - The tester did that PUT for each of the 3 clones made. The next contact gave +1 notification, so the clones stopped.
- **Evidence:** `03-F01-packaged-automation-clone-runs-beside-original.png`; `200 POST /api/v1/automation/contact_welcome/clone`; notification counts 0 → 2, then +1 after the PUT.
- **class: a.** **Reach:** every admin who customises a packaged record-change or schedule flow by cloning it. Each record then runs the business logic twice (here a duplicated notification; for a flow that writes, a duplicated write).
- **Suspected landing:** the console `automation/packaged` component (it should list clones, with their status, and offer "switch the original off" as the sharing-rule clone does), plus the `service-automation` clone endpoint.
- **Dedupe words:** packaged flow clone runs alongside original, clone draft not off switch, status obsolete PUT, automation clone toggle refuses.
- **Known carrier:** none. objectui#13159 [F-07] is the "On" chip on unbound flows, which is a different defect.

### F-02 — Create User with a typed password: the result tells the admin to copy a temporary password it does not show
- **Persona / URL:** dev admin, Users → Create User.
- **Steps:** enter an email, a name and a password; Confirm.
- **Expected:** the field's own label, "Password (leave empty to generate)". Only a generated password needs showing once, as the generated case does: "Temporary Password ••••".
- **Actual:**
  - The dialog reads "User Created — Copy the temporary password now — it is shown only once and never stored."
  - It shows only the email, and its button is "I have saved this password".
  - No password was generated, so there is nothing to copy. An admin is left unsure whether the password they typed was used.
- **Evidence:** `07-people-users-created.png` (typed), `07-people-users-created-generated-redacted.png` (generated, for comparison).
- **class: a** (a UX defect: the copy contradicts what happened). **Reach:** every admin who sets the first password.
- **Suspected landing:** objectstack `plugin-auth` `create_user` action result (its result copy is not conditional on `generated`), or the console action-result renderer.
- **Dedupe words:** user created temporary password not shown, typed password result dialog.
- **Known carrier:** none. objectstack#24758 [F-10] is the clear-text input, which is a different defect.

### F-03 — A user's record shows the viewer's own self-service Security sections, empty, on another user's page
- **Persona / URL:** dev admin, Users → QA Plain → **Security** tab (`/sys_user/record/<qa.plain>`).
- **Expected:** a tab on another user's record describes that user, or admin actions on them.
- **Actual:**
  - Four headed sections with no controls at all: "Password & Sign-in — Change your password or the email address associated with this account", "Two-Factor Authentication", "Email Verification", and "Danger Zone — Permanent. Once deleted, your account cannot be recovered."
  - The text addresses "you" and "your account" while the admin is looking at QA Plain.
  - The tab strip also runs past 1440 px: API Keys and Preferences sit off-screen with no overflow cue.
- **Evidence:** `07-F03-users-security-tab-self-service-on-other-user.png`.
- **class: a.** **Reach:** every admin opening a user.
- **Suspected landing:** objectstack `plugin-auth` `sys_user` record page (the account-security tab is the self-service "My Profile" component, mounted on every user record).
- **Dedupe words:** user record security tab your account, danger zone on other user, self-service sections admin view.
- **Known carrier:** none.

### F-04 — Deleting a parent business unit silently turns its children into roots of the tenant
- **Persona / URL:** dev admin, Business Units.
- **Steps:**
  1. Create "QA EMEA", then "QA EMEA Office" with Parent = QA EMEA (Org Chart shows the tree).
  2. Delete QA EMEA from its row menu.
- **Expected:**
  - The confirm names what the delete does to the tree, or the delete is refused while children exist.
  - The field's own help says "Self-reference for the org tree. Null = root of tenant", and the Recipient Type "Business unit and subordinates" in Sharing Rules depends on that tree.
- **Actual:**
  - The confirm reads only `Delete Business Unit "QA EMEA"? Are you sure you want to delete this record?`.
  - After 200, the child has `parent_business_unit_id = null`: it is now a root, without a word.
  - Any `unit_and_subordinates` grant anchored on the deleted unit no longer reaches it, and nothing tells the admin.
- **Evidence:** `09-people-business-units-org-chart.png` (before), `09-people-business-units-delete-parent-confirm.png`, `09-people-business-units-delete-parent-result.png`; `GET /api/v1/data/sys_business_unit` → `QA EMEA Office parent=null`.
- **class: b** (data integrity of the org tree). **Reach:** every admin restructuring business units.
- **Suspected landing:** objectstack `platform-objects` `sys_business_unit` (the self-lookup's delete behaviour is set-null; it should restrict, or the confirm should name the children), and the console delete confirm.
- **Dedupe words:** business unit delete parent orphan children, parent_business_unit_id set null, org tree delete.
- **Known carrier:** none.

### F-05 — Teams → Remove from Team fails with "User is not a member of the organization" for an organization member
- **Persona / URL:** dev admin, Teams → QA Team → Related → Team Members → row menu → **Remove from Team** → Confirm.
- **Expected:** the dialog's own text: "Remove this user from the team? They will lose any team-scoped access."
- **Actual:**
  - `400 POST /api/v1/auth/organization/remove-team-member`, with the error "User is not a member of the organization" in the dialog and twice as a toast.
  - QA Plain *is* a member (`sys_member` row, role member).
  - The request body carries `"userId": {…the whole sys_user record…}`, not the id.
  - The same endpoint called with `userId: "<id>"` → 200 "Team member removed successfully.", and the user's team-scoped access ended at once (2 → 0 accounts).
- **Evidence:** `10-F05-teams-remove-member-dialog.png`, `10-F05-teams-remove-member-not-org-member.png`; the request body captured from the network.
- **class: a.** The removal fails loudly, so the admin knows the access was not removed. **Reach:** every admin removing a team member through Setup.
- **Suspected landing:** the console row-action param prefill (it passes an expanded lookup record where the param takes an id), or the objectstack `plugin-auth` `remove_team_member` action's param mapping.
- **Dedupe words:** remove-team-member userId object, user is not a member of the organization, team member remove 400.
- **Known carrier:** none. objectstack#24765 [F-15] is the Sessions related list on the same team page, which is a different defect.

### F-06 — Permission-set editor: the clone banner keeps saying "held by nobody yet" after users are assigned and saved
- **Persona / URL:** dev admin, `/apps/setup/metadata/permission/qa_fls_rep` (made by Clone to customize from `sales_rep`).
- **Steps:** Assigned Users → Add user (QA Position) → Confirm (201); change a field override; Save (200).
- **Expected:** the banner reflects the state. Its own last sentence is a call to act: "The copy is held by nobody yet: add it to a position, or assign it to users."
- **Actual:**
  - The banner stays, unchanged, after the assignment and after Save. It also re-appears as a toast on Save.
  - Meanwhile the panel beside it reads "Assigned Users 1 — QA Position, direct", and that user reads accounts through the set.
- **Evidence:** `14-access-permission-sets-cloned.png`, `14-access-permission-sets-fls-saved.png`.
- **class: a** (a UX defect, stale text). **Reach:** admins who clone a permission set.
- **Suspected landing:** the console permission editor (the clone result is kept in page state and never cleared).
- **Dedupe words:** permission set clone banner held by nobody yet, stale clone notice.
- **Known carrier:** none. #2194 T2-U14 is the "no save toast" of the same editor, which is a different defect.

### F-07 — Company settings save an invalid Website and Primary contact email
- **Persona / URL:** dev admin, `/apps/setup/system/settings/company`.
- **Steps:** Website `not a url`, Primary contact email `not-an-email`; Save changes.
- **Expected:**
  - The fields' own help, "Example: https://example.com" and "Example: ops@example.com". The inputs are typed `url` and `email`.
  - A sibling page refuses invalid input under the field: Localization refuses an invalid timezone, and Branding refuses a blank required name.
- **Actual:** `200 PUT /api/settings/company`, "Settings saved", and both values are still there after a reload. The tester cleared them afterwards.
- **Evidence:** `25-F07-config-company-invalid-saved.png`, `25-config-company-invalid.png`.
- **class: a** (data integrity of a setting other features read; low reach). **Reach:** every admin filling in Company.
- **Suspected landing:** objectstack `service-settings` `company` namespace (url/email specifiers not validated server-side), and the console settings form (it skips the browser's own constraint check).
- **Dedupe words:** company settings website email not validated, url specifier validation, settings save invalid url.
- **Known carrier:** objectstack#24766 [F-16] mentioned the Branding Logo URL accepting `not a url` as a side note. This is the same class on a second namespace, and it is not tracked as its own defect.

### F-08 — Audit Log: the Action filter cannot select `login_failed` or `account_locked`, though the log holds them
- **Persona / URL:** dev admin, Diagnostics → Audit Log.
- **Steps:**
  1. Lock an account: 3 wrong passwords with the threshold set to 3.
  2. Open the Auth preset. It lists `login` 19, `login_failed` 6, `account_locked` 1.
  3. Open the Action filter.
- **Expected:** the filter offers the actions the log records, so an admin can isolate failed sign-ins.
- **Actual:**
  - The options are All actions, create, update, delete, login, logout, config_change, import.
  - `login_failed` and `account_locked` exist in `sys_audit_log` and are shown by the Auth preset, but cannot be filtered for.
- **Evidence:** `36-diagnostics-audit-log-auth.png`; `GET /api/v1/data/sys_audit_log?top=2000` action counts `{update 583, create 447, delete 25, login 18, config_change 16, login_failed 6, import 1, account_locked 1}`.
- **class: a.** **Reach:** every admin investigating sign-in problems.
- **Suspected landing:** the console `audit/log` component (a hard-coded action list), or the `plugin-audit` action enum it reads.
- **Dedupe words:** audit log action filter login_failed, account_locked filter missing.
- **Known carrier:** none. objectui#13165 [F-24] is the object filter, which is a different defect.

## Re-measure

The 24 cards the seat filed from #2188's track 2, re-read on 18.0.0. **Fixed 4 · changed 4 · still reproduces 16.**

Note: `@objectstack/console` 18.0.0 is objectui `1f23d5b070fa`. An objectui card closed upstream on 2026-10-20 may have been
fixed after that commit, so "still reproduces" on an objectui card can mean "fixed, but not yet in the pin".

| Prior id | Card | Status on 18.0.0 | What was measured | Screenshot |
|---|---|---|---|---|
| F-02 | objectstack#24757 | still reproduces | Position `sales_manager` shows an empty Permission Sets field and "Positions don't grant data access on their own", while Marta (who holds only the position) reads all 9 accounts. Permission set `sales_manager` → "Assigned Users 0". `sales_rep` lists only the direct grant, not the two reps who hold the position. | `12-access-positions-sales-manager.png`, `14-F02-permset-sales-manager.png` |
| F-06ui | objectui#13157 | still reproduces (UI); server half fixed | The read-only HotCRM sheet still offers Edit, Publish, Revert, Disable, Duplicate, Adopt loose items and Delete app. Edit → Save is now refused (`422 PATCH … [writable_package_required]`, nothing persists). Last round it was 200 and persisted. | `02-apps-packages-hotcrm-sheet.png`, `02-F06ui-packages-readonly-edit-refused.png` |
| F-07 | objectui#13159 | still reproduces | 8 schedule flows that the boot reports "NOT bound — disabled by deployment policy" show a green switch and "On". Only the "Details" chip says otherwise. | `03-F07-packaged-automation-unbound-schedule-on.png`, `03-apps-packaged-automation-details.png` |
| F-08 | objectui#13160 | fixed | The sheet now shows "Publish blocked by 1 validation error(s)." followed by the error itself ("No metadata items found for package …"). | `02-F08-packages-publish-blocked.png` |
| F-09 | objectui#13161 | fixed | Create User (blank, duplicate email) and Register OAuth Application (invalid URL) keep the dialog open, keep the typed values and show the error inside the dialog. | `07-people-users-create-duplicate.png`, `41-advanced-oauth-register-invalid-url.png` |
| F-10 | objectstack#24758 | still reproduces | Create User "Password" and Set Password "New Password" are `<input type="text">`. | `07-F10-users-create-password-plaintext.png`, `07-F10-users-set-password-plaintext.png` |
| F-11 | objectstack#24760 | still reproduces | An unbanned user offers Ban and Unban (record header and row menu). Unban on an unbanned user → "User unbanned"; Unlock on an unlocked one → "Account unlocked". Active and revoked API keys both offer Revoke and Restore. | `07-people-users-row-menu.png`, `07-F11-users-unban-not-banned.png`, `18-F11-api-keys-active-offers-restore.png` |
| F-12 | objectstack#24762 | still reproduces (changed) | Impersonating a must-change-password user still lands on the target's "You must change your password" overlay, with 403 toasts. New in 18.0.0: an impersonation banner with **Stop impersonating** exists, but the overlay covers it (a click times out), so "Sign out instead" is still the only exit. The banner names the admin by raw id ("Started by administrator QxGA6E1p…"). | `07-F12-users-impersonating-must-change.png` |
| F-13 | objectui#13162 | fixed | Set Manager: search "Marta", pick → chip "Marta Quinn" and 200. Every other lookup used in this pass (positions, team, user, business-unit parent, approver) took the pick and showed it as a chip. | `07-people-users-set-manager-picked.png`, `09-people-business-units-parent-lookup.png` |
| F-14 | objectstack#24764 | changed | The Delegator lookup is now filtered to the signed-in user (`filter=["id","=","{current_user_id}"]`), so the 403 cannot happen. Searching for anyone else answers "No options found" with no reason given, and the field is not prefilled with the one allowed value (U-04). | `22-F14-delegations-delegator-self-only.png`, `22-F14-delegations-search-other-no-options.png` |
| F-15 | objectstack#24765 | still reproduces | A team's Related tab lists Sessions (0) with "Sign out other devices". | `10-people-teams-related.png` |
| F-16 | objectstack#24766 | still reproduces | Saved name "HotCRM QA Org", accent `#e11d48`, logo `/_console/favicon.svg` (200). After a reload: title "Setup — ObjectOS", `--primary` still `215 19% 35%`, login page "ObjectOS", no `<img>`. | `26-F16-config-branding-effect-login.png`, `26-F16-config-branding-effect-app.png` |
| F-17 | objectui#13163 | still reproduces | Localization with "2 unsaved changes" → click Company in the sidebar → it navigates at once, with no prompt, and the change is lost. | `24-config-localization-dirty.png`, `24-F17-config-localization-nav-away.png` |
| F-18 | objectstack#24767 | still reproduces (Email); SMS changed | Email: Save with *Host\** and *From email\** empty → 200 "Settings saved". Send test email has no recipient field (request body `{smtp_host, from_email}` only). SMS: Send test now explains "the test SMS is sent to the signed-in admin's own number … otherwise pass "to" in the request body". It still has no field. | `28-config-email-save-required-blank.png`, `28-F18-config-email-send-test-no-recipient.png`, `23-config-settings-sms.png` |
| F-19 | objectstack#24769 | fixed | Test embedder → 400 with "Embedder is disabled. Pick a provider to enable knowledge / RAG." Knowledge Test → 200 "In-memory adapter — no external service to probe." | `30-config-ai-test-embedder.png`, `31-config-knowledge-test.png` |
| F-20 | objectstack#24770 | still reproduces | Templates for `urgent_task` and `crm.urgent_task` (inbox, `en`, active) → the inbox title stays "Urgent task: …". Subscription `user:<qa.plain>` on `urgent_task` → `qa.plain` inbox 0 → 0. | `35-config-notification-templates-list.png`, `34-config-notification-subscriptions-created.png` |
| F-21 | objectstack#24772 | changed | Test on `default` → "connection ok (1ms)" (was "no registered driver"). Sync objects is still offered on `default` and still opens a dialog "No remote tables found"; the 400 now explains it is the managed primary datasource. A runtime datasource still has no edit or delete in Setup (the tester removed it with `DELETE /api/v1/datasources/qa_mem_ds` → 204). | `39-integrations-datasources-test.png`, `39-integrations-datasources-sync-objects.png`, `39-integrations-datasources-runtime-card.png` |
| F-22 | objectstack#24773 | changed | Now 400 (was 500), but still "web clients require https redirect URIs on non-loopback hosts" for both `http://localhost:4001/callback` and `http://127.0.0.1:4001/callback`. | `41-F22-advanced-oauth-localhost.png` |
| F-23a | objectui#13164 | still reproduces | Override Reassign still says "it finalises the step immediately and bypasses the approvers who have not acted". After the reassign the request is still `pending`, now waiting on Priya. | `19-approvals-override-reassign-dialog.png`, `19-F23a-approvals-after-override-reassign.png` |
| F-23b | objectstack#24774 | still reproduces | The confirm says "The previous secret will stop working immediately". The result says "Update every integration before the previous secret's grace period ends." | `41-F23b-advanced-oauth-rotate-confirm.png`, `41-F23b-advanced-oauth-rotated-redacted.png` |
| F-24 | objectui#13165 | still reproduces | Placeholder "e.g. account" → typing `account` gives "No audit entries"; `crm_account` gives 12 rows. | `36-F24-audit-log-filter-placeholder.png` |
| F-25b | objectstack#24775 | still reproduces (and seen on more objects) | Notification Preferences title and User column are `QxGA6E1p… · urgent_task · inbox`. The same raw-id title appears on the Record Share overlay (title = recipient id), on the Approval Delegation delete confirm (`"QxGA6E… → bHJYQN…"`) and in the impersonation banner. The permission-set assignment delete confirm is now generic ("Delete record") and shows no id. | `33-F25b-config-notification-preferences-created.png`, `22-F25b-delegation-delete-confirm-raw-ids.png`, `17-access-record-shares-detail.png` |
| F-26 | objectui#13166 | still reproduces | The Actions column is empty on every row (0 buttons). The sheet's description breaks inside words ("marketplac / e", "Con / tracts"). | `sweep-02-packages.png`, `02-apps-packages-hotcrm-sheet.png` |
| F-27 | objectstack#24776 | changed | Both controls are still ON (Allow email sign-up under audience Invitation only; Google login with no client id or secret). Their help text now states the dependency: sign-up "under invite_only, only an address holding a pending invitation", and Google "Until both resolve, the login page shows no Google button, even while this is on". Self sign-up → 403 `SELF_REGISTRATION_CLOSED`. | `27-config-auth-full.png` |

## Security

- S-1: a security finding in Diagnostics; details in the final message.

## UI and UX suggestions

New suggestions only, plus three #2194 items that 18.0.0 changed. Every other #2194 item that this pass touched was measured
unchanged: T2-U01, U02, U03, U04, U05, U06, U08, U10, U13, U14, U15, U16, U18, U19, U21, U22 and U23 (two `<main>`
landmarks on the permission-set page).

| Id | Page | What the admin meets now | Suggested improvement | Why (measured) | Landing | Size | #2194 |
|---|---|---|---|---|---|---|---|
| U-01 | Setup sidebar | On landing, Configuration (13 items) and Advanced are collapsed. Only Advanced declares `expanded: false` in `setup-nav.json`. `00-setup-home.png`, `00-setup-sidebar-configuration-expanded.png` | Open Configuration by default (honour the declaration), or remember the admin's state | 14 of the 41 items are hidden on first view, including Localization, Email and Authentication | objectstack console sidebar | S | new |
| U-02 | Positions | The create form has no Permission Sets field: it appears only after the first save. Save is an icon-only "Save (⌘S)". Remove holder acts with no confirm. The holder picker lists a user removed from the organization (QA Csv). `12-access-positions-new-filled.png`, `12-access-positions-add-holder.png` | Show Permission Sets on create; label the Save button; confirm Remove holder; offer organization members only | Binding a set took 3 steps (save draft, add set, save, publish) where the existing page shows the field at once | objectstack console metadata editor (position) | S | new (T2-U05 covers the list only) |
| U-03 | Permission Sets / Positions lists | The row's Active switch deactivates a set at once, with no confirm and no toast. Turning off `qa_fls_rep` took its holder from 200 to 403 in one click; the same switch sits on `sales_rep`, `system_admin` and `admin_full_access`. `14-access-permission-sets-deactivated.png`, `12-access-positions-deactivated.png` | Confirm a deactivation and name the holder count ("3 users lose this access"); refuse it on the admin's own set | One mis-click removes access for every holder. The tester deactivated a position by accident during the pass. | objectstack console metadata list | S | new |
| U-04 | Delegations (OOO) | The Delegator is limited to the signed-in admin, but the field starts at "Select…", and searching for a colleague answers "No options found". `22-F14-delegations-search-other-no-options.png` | Prefill the delegator with the admin and say "You can only delegate your own approvals" under the field | The picker hides why the absent colleague cannot be chosen; an admin covering for someone has no hint | objectstack `plugin-approvals` delegation form / console | S | new (follows objectstack#24764) |
| U-05 | Sessions | Two rows read the same "QA Position · Default Organization · 10/20/2026 3:38 pm"; no device, browser or last-active column. `37-diagnostics-sessions-revoke.png` | Show the user agent (browser/OS) and Last Activity, which `sys_session` already holds (`user_agent`, `last_activity_at`) | The admin could not tell which session to revoke and had to revoke both | objectstack `plugin-auth` `sys_session` list view | S | new |
| U-06 | Packages sheet | Adopt loose items uses the browser's native `confirm()`, then says "Loose items adopted into this base." with no count, even when the next Publish finds 0 items. A previous action's message stays under the next (a Revert error stayed under Duplicate). `02-apps-packages-adopt-loose-items-result.png`, `02-apps-packages-duplicate.png` | A styled confirm; report "N items adopted"; clear the message on each new action | The admin cannot tell whether anything moved | objectstack console packages component | S | new |
| U-07 | Packaged Automation, SMS Delivery | Admin-facing text that tells the admin to call the REST API: "send its complete definition with `status: 'obsolete'` to `PUT /api/v1/automation/<name>`", "otherwise pass "to" in the request body". `03-F01-packaged-automation-clone-runs-beside-original.png`, `23-config-settings-sms.png` | Offer the control in the UI (see F-01, objectstack#24767) and keep endpoints out of admin copy | Two new instances of developer copy since #2194 | objectstack `service-automation`, `service-sms` | S | new instances of T2-U02 / T2-U07 |
| U-08 | Many Setup forms | Each error toast appears twice ("A record with this value already exists" ×2, "Either email or phoneNumber is required" ×2, "User is not a member of the organization" ×2). The toast stack sits top-right over the page's header buttons (New, Import) for about 4 s. `09-people-business-units-org-chart.png` | One toast per error; place toasts so they do not cover the header actions | Measured on 5 forms; the covered New button cannot be clicked while the toast shows | objectui toaster / console action handler | S | new |
| U-09 | Every Setup page | Every save, delete or action is followed by 2–6 `POST /api/v1/security/explain` calls (6 after one business-unit create; 2 after opening a user) | Batch or cache the explain call per page | Extra round trips on every admin action | objectui console (security explain consumer) | S | new |
| U-10 | Edit Organization | The dialog has no Name field (the organization cannot be renamed here) but has its own Timezone, which duplicates Localization's Default timezone. `08-people-organization-edit.png` | One place for the organization name and one for the timezone, or say which wins | Two timezones for one organization, with no rule shown | objectstack `plugin-auth` `sys_organization` / settings | S | extends T2-U20 |
| — | Settings pages | Validation errors now show under the field (Localization timezone, Branding name). `24-config-localization-invalid-tz.png` | — | — | — | — | **T2-U11 changed: done in 18.0.0** |
| — | Approvals | A request's page is now titled by flow and record ("Large Deal Approval · Acme Platform Upgrade"), and Action History fits the override flag at 1440 px. Opening a request from the Inbox still lands on the business record inside the Setup shell, and an override needs no comment. `20-approvals-requests-record.png`, `21-approvals-action-history.png` | — | — | — | — | **T2-U09 partly changed** (title and column done; the rest unchanged) |
| — | API Keys / Authentication | Unchanged: the Create Key dialog does not show the 90-day expiry (`18-access-api-keys-create.png`). New in 18.0.0: Authentication has a full API-key policy (default and maximum lifetime, inactivity expiry). | Show the default expiry from that policy in the dialog | — | objectstack `plugin-auth` | S | **T2-U21 unchanged, now easier**: the policy it should show exists |

## Choices made

Each choice is weighed on the four fixed axes: real business need, long-term soundness, making AI errors structurally harder, and start-up focus.

1. **One throwaway user per kind of check, made through the UI where the path was under test.**
   - `qa.plain` and `qa.gen` were made through Create User, to measure the dialog (F-02, F-10). `qa.csv` was made through the CSV import.
   - `qa.pos` was made through `POST /api/v1/auth/admin/create-user`, the endpoint the dialog calls. *Need:* the position, FLS, lockout and session checks need a user with no other grant, not another run of a dialog already measured.
   - Side fact: that endpoint sets must-change-password by default, so every data call first answered 403 `PASSWORD_RESET_REQUIRED`. The tester cleared it through the user's own change-password endpoint before measuring. It is not a finding, because the UI path exposes the flag as a checkbox.
2. **Effects read with the affected user's own session** (`/api/v1/data/...`), plus a UI screenshot for the decisive ones (FLS record page, new-user landing, org-admin landing). An API read is the exact access answer.
3. **Not tested, because it would end the tester's access or orphan data:**
   - Require multi-factor (Authentication and Edit Organization), session lifetime, idle and absolute timeouts, disabling email/password login, Allowed IP ranges.
   - Make Owner (it demotes the dev admin), Delete Organization, deactivating `system_admin` / `admin_full_access`.
   - Switching the storage or knowledge adapter.

   These settings are global, so a second admin would not protect the dev admin from them. No second admin was created.
4. **Network-blocked items are "not reachable", not "fail".** Marketplace and Cloud Connection answer 502 "fetch failed": the container's policy refuses the hosts.
5. **Secrets.**
   - Every API key and OAuth secret created was revoked or deleted.
   - Screenshots of key and secret dialogs were redacted in the DOM before capture (`*-redacted.png`). One capture showed a key after the redaction step and was deleted before any commit; it is not in the history.
   - Two screenshots show throwaway passwords typed into the clear-text fields that objectstack#24758 is about. They are the evidence for that card, on a local throwaway database.
6. **F-05 is public, not a security line.** The removal fails loudly, the admin is told, and no one gains access. It is a broken path (`class: a`), not a silent retention of access.
7. **Prior security items are re-measured in the final message only.** This report names no security behaviour beyond the `S-1` line.
8. **The service journey of #2206** (reassigning seeded cases to `service.agent`) belongs to track 1's inventory pass. This Setup pass did not run it, so no case was reassigned.
9. **Findings vs suggestions.** A stable defect with a named landing and an expectation taken from the product's own text went to *Findings* (F-02, F-03 and F-06 are UX defects of that kind). Preferences and redesigns went to *Suggestions*.

## Deviations

- **Coverage is 41 items, not 40.** 18.0.0 adds Declared Sharing Rules to Access Control.
- **No zh-CN pass.** Track 2's order does not ask for one, and #2188 measured it.
- **Screenshot naming.** Finding shots carry this round's id (`F01` … `F08`). Re-measure shots carry the prior id (`F02`, `F06ui`, `F10` …), so the prefix alone does not say which numbering is meant: the tables above are the key.
- **Data left behind on the throwaway DB:**
  - three obsolete flow clones;
  - one canceled invitation;
  - the team "QA Team Renamed" (the last team cannot be deleted);
  - the users created above;
  - one account `QA FLS Account` owned by `qa.pos`, whose Account Approval request was override-rejected;
  - the Acme Platform Upgrade approval, override-approved.
- **No GitHub write** besides pushing this evidence branch.
