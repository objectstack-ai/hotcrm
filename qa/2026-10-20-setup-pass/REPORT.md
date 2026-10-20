# Setup pass as the system administrator — HotCRM `main`, 2026-10-20

Track 2 of objectstack-ai/hotcrm#2188. Every item of the platform's **Setup** app, driven as the system administrator
on a local boot, with create / edit / delete / actions where safe, access-control changes checked by signing in as the
affected user, and UI/UX suggestions kept apart from defects.

All screenshots are under `shots/`. The item list is the one the boot served: [`setup-nav.json`](./setup-nav.json).

## Build

| | |
|---|---|
| Commit tested | `f22dfa523157f2229ff26732f11ff3d267987a4f` (main head in the container: `b94cf856` + #2185, a forms fix that touches no Setup item) |
| `@objectstack/*` | `18.0.0-next.5` (all packages, including `console`, `setup`, `plugin-auth`, `plugin-security`, `plugin-sharing`, `plugin-approvals`, `plugin-audit`, `service-datasource`). The Setup app reports `_packageVersion 9.3.0`. |
| Browser | Chromium 141.0.7390.37 (`/opt/pw-browsers/chromium`), Playwright 1.63.0, viewport 1440×900 |
| Mode | `objectstack dev -p 4001`, development, SqlDriver(better-sqlite3), tenancy single, 43 plugins |

Boot commands and exit codes:

| Command | Exit |
|---|---|
| `pnpm install` | 0 |
| `pnpm dev` | long-running; served `401` on `/api/v1/meta/app` once up. Restarted once (see *Deviations*) on the same DB. |
| `pnpm demo:staff` | 0 ("demo org staffed", 11 sharing rules re-evaluated, 2 pending approvals) |

Logins used (no passwords here):

- **Dev admin** `admin@objectos.ai` — credentials from the boot banner ("Dev admin: … seeded on empty DB · dev only") and `AGENTS.md`.
- **Demo staff** `sales.manager@`, `service.agent@`, `service.manager@objectos.ai` — passwords declared in `src/sales/sharing/demo-staffing.ts`.
- **Throwaway users created by the tester**, one per check:
  - `qa.plain@objectos.ai` — created through Setup → Users → Create User (new-user baseline, permission-set grant and revoke, position assign/remove, ban, set password, set manager, impersonation, org role).
  - `qa.pos@objectos.ai` — position-holder check and the account-lockout check.
  - `qa.share@objectos.ai` — sharing-rule check (team recipient).
  - `qa.fls@objectos.ai` — field-level security check.
  - `qa.admin2@objectos.ai` — created as a would-be second admin; not used (see *Choices made*).
  - `qa.csv@objectos.ai` — created through Setup → Users → Import (CSV), later removed from the organization.
  - The four `qa.pos/share/fls/admin2` accounts were created with `POST /api/v1/auth/admin/create-user` (the same endpoint the UI's Create User uses, measured on `qa.plain`) to save time; their passwords were set by the tester and are not recorded.

## Coverage

40 nav items from `setup-nav.json`, plus the two settings pages that only the *All Settings* hub links to (SMS Delivery, Data Lifecycle).

**Counts over the 40 nav items: pass 14 · fail 24 · not reachable 2 · not tested 0.** (A "fail" carries at least one finding; most failed items also have parts that pass, listed in *What I did*.)

| # | Group | Item | What I did | Verdict | Reason | Screenshot |
|---|---|---|---|---|---|---|
| 1 | Overview | System Overview | Read 4 tiles + 3 charts; Refresh All (7 dataset queries, all 200, ~300 ms); date presets (15) → Today | pass | Numbers match Users list (6) | `00-setup-home.png`, `01-overview-system-overview-today.png` |
| 2 | Apps | Packages | Search, platform toggle (23), row sheet; View info, Edit (saved), Publish, Revert, Export (downloaded), Adopt loose items, Duplicate (cancelled); New Package (blank disabled, bad id stripped, created, duplicate 409); Disable/Enable/Publish/Revert/Delete on the new package; Import (wrong shape error, flat manifest installed) | fail | F-06, F-08, F-26 | `02-apps-packages-hotcrm-detail.png`, `02-F02-packages-readonly-edit-persisted.png` |
| 3 | Apps | Packaged Automation | Listed 33 flows + actions; toggled `task_urgent_alert` off/on and measured its effect (urgent task: 0 notifications off, 1 on); Clone (invalid name 400, valid → draft) | fail | F-07 | `03-apps-packaged-automation-details.png` |
| 4 | Apps | Browse Marketplace | Opened; Retry | not reachable | `GET /api/v1/marketplace/packages` → 502 "fetch failed": the container's network policy | `04-apps-marketplace-502.png` |
| 5 | Apps | Installed Apps | Listed the imported package; Uninstall with confirm → removed | pass | U-06 on its title | `05-apps-installed-apps-one.png`, `05-apps-installed-apps-uninstalled.png` |
| 6 | Apps | Cloud Connection | Connect | not reachable | `POST /api/v1/cloud-connection/bind/start` → 502, page shows "fetch failed / Try again" | `06-apps-cloud-connection-connect.png` |
| 7 | People & Org | Users | Create User (blank, duplicate, valid); new-user landing; record tabs; permission-set grant/revoke with effect; position assign/remove with effect; Ban/Unban, Unlock, Set Password, Set Manager, Impersonate, Edit (validation), Invite User, CSV Import; 5 views | fail | F-03, F-09, F-10, F-11, F-12, F-13 | `07-people-users-record.png`, `07-F-position-removed-still-sees-accounts.png` |
| 8 | People & Org | Organization | Tabs; Edit dialog; Change Role Member→Admin with effect (Setup appears, 20 items); Remove Member | pass | Make Owner not tested (would demote the dev admin) | `08-people-organization-effect-org-admin.png` |
| 9 | People & Org | Business Units | New (blank → required, duplicate code 409), child with parent, Org Chart tree, overlay Edit, Delete with named confirm | fail | F-13 (parent lookup label) | `09-people-business-units-org-chart.png`, `09-people-business-units-parent-lookup.png` |
| 10 | People & Org | Teams | Create (required check), rename, Add Member, overlay related lists, Delete | fail | F-15; delete refused (U-16) | `10-F-teams-related-sessions-signout.png` |
| 11 | People & Org | Invitations | Invite (toast "sent", dev mail sink), Resend (prefilled), Cancel → moved to Expired/Canceled | pass | | `11-people-invitations-canceled.png` |
| 12 | Access Control | Positions | List (18), detail, New (invalid name, draft, publish), bind `marketing_user`, Add holder → effect (403→200), remove holder → effect (→403), Delete | fail | F-02 | `12-access-positions-detail.png`, `12-access-positions-holder-added.png` |
| 13 | Access Control | Capabilities | List (10, read-only), detail | pass | U-02 on its internals | `13-access-capabilities-detail.png` |
| 14 | Access Control | Permission Sets | Open `sales_rep` / `sales_manager`; Clone to customize; field-level read off on `crm_campaign.budgeted_cost`; Add user → effect (API omits the field, record page hides it); Deactivate → effect (→403) | fail | F-02 | `14-F-permset-sales-manager-assigned-users-empty.png`, `14-access-permission-sets-fls-effect-record.png` |
| 15 | Access Control | Sharing Rules | Read all views; New (criteria builder, team recipient) → effect (sees Lattice Education); Edit read→edit; Deactivate → effect (revoked); Delete | fail | F-01 | `15-F01-sharing-rules-all-empty.png`, `15-access-sharing-rules-list-after-create.png` |
| 16 | Access Control | Record Shares | All views; overlay | fail | F-25 | `sweep-16-record-shares.png`, `16-access-record-shares-detail.png` |
| 17 | Access Control | API Keys | Create (masked, reveal, copy), used it (200), Revoke (→403), Restore (→200), final Revoke | fail | F-11 | `17-access-api-keys-created.png`, `17-access-api-keys-after-restore.png` |
| 18 | Approvals | Approvals Inbox | My Pending / Submitted / All; open request; Override Approve | pass | U-09 | `18-approvals-inbox-admin-all.png`, `18-approvals-override-approve-dialog.png` |
| 19 | Approvals | Requests | Views; record; Send reminder; Override Reassign (→ Priya); Override Reject | fail | F-23 | `18-approvals-override-reassign-dialog.png`, `19-approvals-requests-after-override.png` |
| 20 | Approvals | Action History | Read; override row carries the override icon | pass | U-09 (column off-screen) | `20-approvals-action-history-scrolled.png` |
| 21 | Approvals | Delegations (OOO) | New: delegator = another user → silent 403; delegator = self → 201; Delete | fail | F-13, F-14 | `21-F-delegations-create-403.png`, `21-F-delegations-lookup-not-set.png` |
| 22 | Configuration | All Settings | Read 11 cards; opened SMS Delivery and Data Lifecycle (not in nav) | pass | | `22-config-all-settings.png` |
| 23 | Configuration | Localization | Invalid timezone (400 toast); Asia/Shanghai → effect (Users "2:12 am" → "10:12 am"); reverted; unsaved change + sidebar nav | fail | F-17 | `23-config-localization-effect-users.png`, `23-config-localization-nav-away.png` |
| 24 | Configuration | Company | Saved legal name; persisted after reload | pass | | `24-config-company-saved.png` |
| 25 | Configuration | Branding | Blank name refused; saved name, accent, logo; checked login page, title, CSS, header | fail | F-16 | `25-config-branding-after-save.png`, `25-config-branding-effect-login.png` |
| 26 | Configuration | Authentication | Read 43 settings; self-signup probe; lockout threshold 3 → effect on `qa.pos` (locked, Unlock works); reverted | fail | F-27 | `26-config-auth-full.png` |
| 27 | Configuration | Email | Send test (twice), Save with required fields blank | fail | F-18 | `27-config-email-send-test-result.png` |
| 28 | Configuration | File Storage | Test connection → "Storage round-trip succeeded (adapter=local)" | pass | Adapter switch not tested (would orphan files) | `28-config-file-storage-test.png` |
| 29 | Configuration | AI & Embedder | Test connection (memory echo message); Test embedder | fail | F-19 | `29-config-ai-test-embedder.png` |
| 30 | Configuration | Knowledge | Test connection | fail | F-19 | `30-config-knowledge-test.png` |
| 31 | Configuration | Feature Flags | AI Assistant on → saved; no header change observed (memory AI provider); reverted | pass | Effect not observable on this boot | `31-config-feature-flags-ai-on-effect.png` |
| 32 | Configuration | Notification Preferences | New (mute `urgent_task` / inbox for the admin) → effect (inbox +1 before, +0 muted); Delete | pass | U-15 | `32-config-notification-preferences-created.png` |
| 33 | Configuration | Notification Subscriptions | New `user:<qa.plain>` on `urgent_task` → no delivery; Delete | fail | F-20 | `33-config-notification-subscriptions-created.png` |
| 34 | Configuration | Notification Templates | New (blank → required), 3 variants, Edit, Delete; effect on `urgent_task` | fail | F-20 | `34-config-notification-templates-list.png` |
| 35 | Diagnostics | Audit Log | 6 presets, object filter, detail, Open as list | fail | F-05, F-24 | `35-diagnostics-audit-log-auth.png`, `35-F-audit-log-filter-placeholder-empty.png` |
| 36 | Diagnostics | Sessions | Views; Revoke Session; Sign out other devices → effect (other admin session 401, mine 200) | fail | F-04 | `36-diagnostics-sessions-revoked.png` |
| 37 | Diagnostics | Notifications | Recent / By Topic; detail payload | pass | U-18 | `37-diagnostics-notifications-detail.png` |
| 38 | Integrations | Datasources | Test, Sync objects, Refresh on `default`; New datasource (`:memory:`), its Test | fail | F-21 | `38-integrations-datasources-test.png`, `38-integrations-datasources-sync-objects.png` |
| 39 | Integrations | Connect an Agent | Read; Download SKILL.md (200); Create key (then revoked); MCP endpoint unauthenticated → 401 + resource metadata | pass | U-13, U-22 | `39-integrations-connect-agent-full.png` |
| 40 | Advanced | OAuth Applications | Register (blank, invalid URL, localhost, 127.0.0.1, https), Rotate secret, Disable, Enable, Delete | fail | F-09, F-22, F-23 | `40-F-oauth-localhost-rejected-500.png`, `40-advanced-oauth-rotated.png` |
| — | Configuration (hub only) | SMS Delivery | Read; Send test SMS | fail | F-18 | `22-config-settings-sms-test.png` |
| — | Configuration (hub only) | Data Lifecycle | Read | pass | U-02 on its copy | `22-config-settings-lifecycle.png` |

Every item also has its landing screenshot from the first sweep: `shots/sweep-NN-<item>.png`.

## Findings

Severity classes: `class: a` = wrong result or broken path; `class: b` = security or data integrity. "Reach" says who meets it.

### F-01 — Setup → Sharing Rules shows none of the sharing rules the app declares
- **Persona / URL:** dev admin, `/_console/apps/com.objectstack.setup/sys_sharing_rule`, every view (Active, Inactive, By Object, All).
- **Steps:** boot, `pnpm demo:staff`, open Sharing Rules, click *All*.
- **Expected:** the page's own description, "Grants a group of people access to the records that match a condition", over the rules in force. HotCRM declares 11 rules (`src/*/sharing/*.sharing.ts`), all active: `GET /api/v1/sharing/rules` returns 11 with `managed_by: package`, and `demo:staff` re-evaluated all 11 (21 grants materialised).
- **Actual:** "Nothing here yet — Create your first record to get started." `GET /api/v1/data/sys_sharing_rule` → `{"records":[],"total":0}`. A rule created in Setup is the only row ever listed. The admin cannot see, open, deactivate or re-evaluate any package rule from Setup.
- **Evidence:** `15-F01-sharing-rules-all-empty.png`, `sweep-15-sharing-rules.png`, `15-access-sharing-rules-list-after-create.png`.
- **class: b** (an administrator cannot audit active access grants). **Reach:** every deployment of an app that declares sharing rules, since 18.0.0-next.4 (the rules stopped having `sys_sharing_rule` rows, per the note in `scripts/demo-staff.ts` citing objectstack#23952).
- **Suspected landing:** objectstack `plugin-sharing` / `setup` nav item `nav_sharing_rules` (lists the `sys_sharing_rule` object while the rules now live behind the sharing door).
- **Dedupe words:** sharing rules list empty, package sharing rules invisible, sys_sharing_rule, sharing door.

### F-02 — A position's same-named permission set is in force but invisible in Setup
- **Persona / URL:** dev admin; `/_console/apps/setup/metadata/position/sales_manager` and `/_console/apps/setup/metadata/permission/sales_manager`.
- **Steps:** open position `sales_manager`; open permission set `sales_manager`; sign in as Marta Quinn (holds only the `sales_manager` position, no `sys_user_permission_set` row).
- **Expected:** the position page's own text, "Positions don't grant data access on their own. Bind `sales_manager` to one or more Permission Sets", and its *Permission Sets* field (empty) describe what holders get; the permission set's *Assigned Users* lists who holds it.
- **Actual:** the position shows no bound set and says it grants nothing; the permission set shows "Assigned Users 0 — No users assigned yet". Yet Marta reads all 9 accounts, which only `sales_manager`'s `viewAllRecords` on `crm_account` gives. The platform binds a position to the permission set of the same name (recorded in `src/sales/sharing/demo-staffing.ts`, #1779). The same holds for `sales_rep` (Assigned Users lists only the tester's direct grant, not the two reps).
- **Evidence:** `14-F-permset-sales-manager-assigned-users-empty.png`, `12-access-positions-detail.png`, `14-access-permission-sets-sales-rep.png`; `GET /api/v1/data/crm_account` as Marta → 9 records.
- **class: b** (who holds View All is not visible to the admin). **Reach:** every admin of an app that relies on name-matched position bindings, HotCRM included.
- **Suspected landing:** objectstack `console` metadata pages for position and permission (Assigned Users / Permission Sets panels), against the name-matching binding in `plugin-security`.
- **Dedupe words:** implicit position binding, same-named permission set, assigned users empty, positions don't grant data access.

### F-03 — Assigning or removing a position in Setup does not re-evaluate sharing rules; a removed holder keeps edit access
- **Persona / URL:** dev admin, user record → Positions tab (`/_console/apps/com.objectstack.setup/sys_user/record/<qa.plain>`); affected user `qa.plain` (holds permission set `sales_rep`).
- **Steps:** add position `eu_sales_team` → as `qa.plain` list `crm_account`; remove the position → list again and `PATCH` one account.
- **Expected:** rule `europe_territory` shares EMEA accounts with position `eu_sales_team` (`src/sales/sharing/account.sharing.ts`): holders gain the 2 accounts, ex-holders lose them.
- **Actual:** after adding: 0 accounts (also after 4 s). Only `POST /api/v1/sharing/rules/europe_territory/evaluate` (no Setup button exists, see F-01) made the 2 appear. After removing the position: still 2 accounts, and `PATCH /api/v1/data/crm_account/<Northwind Energy>` → **200** (reverted by the tester). Re-evaluating the rule revoked it.
- **Evidence:** `07-F-position-removed-still-sees-accounts.png`, `07-people-users-assign-position-saved.png`; network: `201 POST sys_user_position`, `200 DELETE sys_user_position/…`, evaluate response `grantsRevoked: 1`.
- **class: b** (access survives its removal). **Reach:** any admin changing positions of users covered by position-recipient sharing rules.
- **Suspected landing:** objectstack `plugin-sharing` (no re-materialisation on `sys_user_position` writes).
- **Dedupe words:** stale sharing grant, position removed still has access, sys_record_share not revoked, re-evaluate on position change.

### F-04 — Sessions → Revoke Session does nothing; the session stays valid
- **Persona / URL:** dev admin, `/_console/apps/com.objectstack.setup/sys_session/view/all_sessions`.
- **Steps:** row menu of `QA Sharing Check` → Revoke Session → Continue.
- **Expected:** the confirm text, "Revoke this session? The user will be signed out from that device."
- **Actual:** no request is sent. Toast: *Action "Revoke Session" identifies its record by "token", but that field is not present on the row. Add it to the view's columns, or check that it is readable — running without it would send a request that names no record.* `qa.share`'s API calls keep answering 200.
- **Evidence:** `36-diagnostics-sessions-revoked.png`. ("Sign out other devices" works: other admin session → 401.)
- **class: b** (an admin cannot end a suspect session). **Reach:** every admin.
- **Suspected landing:** objectstack `setup` / `plugin-auth` `sys_session` list view (columns lack `token`) or the `revoke_session` action's param binding.
- **Dedupe words:** revoke session token field not present, sys_session revoke.

### F-05 — Failed sign-ins and account lockouts are not in the audit log
- **Persona / URL:** dev admin, Audit Log → *Auth* preset; `GET /api/v1/data/sys_audit_log`.
- **Steps:** 3 wrong-password sign-ins for `qa.pos` with lockout threshold 3 (→ locked, `403 … temporarily locked`), then read the audit log.
- **Expected:** an audit trail of authentication activity ("Read-only system activity"; Auth preset).
- **Actual:** the Auth preset holds only `login` rows (24). Across all 1,094 audit rows, none records a failed sign-in or the lockout. Action filter options: create, update, delete, login, logout, config_change, import.
- **Evidence:** `35-diagnostics-audit-log-auth.png`, `26-config-auth-save-lockout.png`.
- **class: b** (brute-force attempts are invisible). **Reach:** every deployment.
- **Suspected landing:** objectstack `plugin-audit` / `plugin-auth`.
- **Dedupe words:** audit failed login, lockout not audited, sign-in failure audit.

### F-06 — A read-only code package can be edited from Setup, while publish and revert are refused
- **Persona / URL:** dev admin, Packages → HotCRM sheet (Scope "Read-only · code").
- **Steps:** Edit → change description → Save changes; reload.
- **Expected:** the sheet's own scope badge "Read-only · code"; Publish and Revert answer `422 [writable_package_required] … it is read-only (provided by code or an installed app)`.
- **Actual:** the sheet offers Edit, Publish, Revert, Disable, Duplicate, Delete app on the read-only package. Edit sends `PATCH /api/v1/packages/app.objectstack.hotcrm` → 200 "Package updated", and the new description persists (`GET /api/v1/packages/app.objectstack.hotcrm`). The tester restored it.
- **Evidence:** `02-F02-packages-readonly-edit-persisted.png`, `02-apps-packages-action-publish.png`, `02-apps-packages-hotcrm-detail.png`.
- **class: b** (a code package's manifest is mutable at runtime). **Reach:** every admin.
- **Suspected landing:** objectstack `console` packages component (actions not gated by scope) and `service-package` `PATCH /api/v1/packages/:id` (no read-only check).
- **Dedupe words:** read-only package editable, writable_package_required, package PATCH.

### F-07 — Packaged Automation shows "On" for scheduled flows that will never run
- **Persona / URL:** dev admin, `/component/automation/packaged`.
- **Expected:** "Activation" reflects whether the flow runs. The boot reports 8 schedule flows "NOT bound — disabled by deployment policy" (`OS_AUTOMATION_SCHEDULED_WORK_ENABLED` unset).
- **Actual:** all 8 (Case SLA Monitor, Contract Auto-Expiration, Forecast Snapshot, …) show a green switch and "On"; only a small "Details" chip tells the truth.
- **Evidence:** `03-apps-packaged-automation-details.png`, `sweep-03-packaged-automation.png`.
- **class: a.** **Reach:** every deployment without scheduled work enabled (the default).
- **Suspected landing:** objectstack `console` automation/packaged component.
- **Dedupe words:** packaged automation on but not bound, schedule disabled by deployment policy.

### F-08 — Package publish hides the reason it failed; "Adopt loose items" gives no response
- **Persona / URL:** dev admin, Packages → a new writable package sheet.
- **Actual:** Publish → `200` with `success:false`, `validationErrors:[{"message":"No metadata items found for package …"}]`; the sheet shows only "Publish blocked by 1 validation error(s)." Adopt loose items sends no request and shows nothing.
- **Evidence:** `02-apps-packages-qa-publish.png`, `02-apps-packages-qa-adopt-loose-items.png`.
- **class: a.** **Reach:** admins authoring packages.
- **Suspected landing:** objectstack `console` packages component.
- **Dedupe words:** publish blocked validation errors message hidden, adopt loose items no feedback.

### F-09 — Action dialogs close on a server error and lose what the admin typed
- **Persona / URL:** dev admin; Users → Create User; OAuth Applications → Register OAuth Application.
- **Steps:** Create User blank → Confirm; Create User with an existing email; Register with redirect URL `not-a-url`.
- **Expected:** the form keeps the input and marks the field (as Create Team, Business Unit and Sharing Rule forms do with "… is required").
- **Actual:** the dialog closes each time; only a toast remains: "Either email or phoneNumber is required" (the form has no phone field), "User already exists. Use another email.", "[body.redirect_uris.0] Invalid URL; [body.redirect_uris.0] URL must be parseable".
- **Evidence:** `07-people-users-create-blank.png`, `07-people-users-create-duplicate.png`, `40-advanced-oauth-register-invalid-url.png`.
- **class: a.** **Reach:** every admin using platform action dialogs.
- **Suspected landing:** objectstack `console` / objectui action-param dialog.
- **Dedupe words:** action dialog closes on error, form input lost, create user validation.

### F-10 — Admin password fields show the password in clear text
- **Persona / URL:** dev admin; Users → Create User, and row menu → Set Password.
- **Actual:** "Password (leave empty to generate)" / "New Password" are `<input type="text">`; the typed password is readable on screen and in screenshots.
- **Evidence:** `07-F-users-create-password-plaintext.png`, `07-people-users-action-set_user_password.png`.
- **class: b.** **Reach:** every admin creating users or resetting passwords.
- **Suspected landing:** objectstack `plugin-auth` action params (`create_user`, `set_user_password`) / console param renderer.
- **Dedupe words:** password input type text, plaintext password field.

### F-11 — Mutually exclusive actions are offered together, whatever the record's state
- **Actual:** an unbanned user offers both *Ban User* and *Unban User* (record header and row menu); an active API key offers *Revoke* and *Restore*, a revoked one the same; *Unlock Account* on an account that is not locked answers "Account unlocked". (OAuth Applications does it right: Disable / Enable switch with the state.)
- **Evidence:** `07-F-users-record-ban-and-unban.png`, `07-people-users-row-menu.png`, `17-access-api-keys-list.png`.
- **class: a.** **Reach:** every admin.
- **Suspected landing:** objectstack `plugin-auth` action declarations (`ban_user`/`unban_user`, `revoke_api_key`/`restore_api_key` lack a `visible` condition).
- **Dedupe words:** ban and unban both shown, revoke restore both shown, action visibility state.

### F-12 — Impersonating a user who must change their password strands the admin
- **Persona / URL:** a separate dev-admin session; Users → `qa.plain` → Impersonate User → Continue (`qa.plain` had "Require Password Change On Next Login", the default of Set Password).
- **Expected:** an impersonation session the admin can use and end.
- **Actual:** `POST /api/v1/auth/admin/impersonate-user` 200 and "Now impersonating user", then a full-page "You must change your password — Current password / New password" form for the *target's* password, and 403 toasts ("Saved views for sys_user could not be loaded … PASSWORD_RESET_REQUIRED"). The only way out is "Sign out instead"; no "stop impersonating".
- **Evidence:** `07-people-users-impersonating.png`.
- **class: a.** **Reach:** support admins impersonating new or reset users.
- **Suspected landing:** objectstack `plugin-auth` (password-reset gate applied to impersonation sessions) / console.
- **Dedupe words:** impersonate password reset required, impersonation dead end.

### F-13 — Lookup quick-picker does not reliably take the choice
- **Persona / URL:** dev admin; Delegations → New; Users → Set Manager; Business Units → New (parent).
- **Actual:**
  - After typing a search term and clicking the matching option, nothing is set: Delegations → "Please check the highlighted fields: Delegator, Delegate"; Set Manager → "Manager is required" (reproduced with a text click, keyboard Enter and a mouse click at the option's coordinates).
  - Without typing, clicking an option does set the value (the request carried `parent_business_unit_id`), but the trigger keeps showing "Select…".
  - The "Browse all records" grid next to it works every time.
- **Evidence:** `21-F-delegations-lookup-not-set.png`, `07-people-users-set-manager-state.png`, `09-people-business-units-parent-lookup.png`, `07-people-users-set-manager-browse.png`.
- **class: a.** **Reach:** every lookup in Setup dialogs.
- **Suspected landing:** objectui lookup field (`lookup-trigger-*` popover) in the console.
- **Dedupe words:** lookup select not applied, lookup label shows Select after choosing, lookup quick picker.

### F-14 — Delegations: the form lets an admin pick any delegator, the server refuses, and the UI says nothing
- **Persona / URL:** dev admin, `/sys_approval_delegation` → New; delegator Priya Raman, delegate Tomas Okafor.
- **Expected:** the empty state "Declare an out-of-office delegation so approvals route to a backup while you are away" plus a Delegator field listing every user.
- **Actual:** `POST /api/v1/data/sys_approval_delegation` → 403 "you may only manage out-of-office delegations where you are the delegator"; no toast, no field error, the dialog just stays. With the admin as delegator it saves (201).
- **Evidence:** `21-F-delegations-create-403.png`.
- **class: a.** **Reach:** admins covering an absent employee.
- **Suspected landing:** objectstack `plugin-approvals` (delegation write rule) and console form (silent 403).
- **Dedupe words:** delegation 403 delegator, OOO delegation admin, silent forbidden.

### F-15 — A team record offers "Sign out other devices", which signs out the admin
- **Persona / URL:** dev admin, Teams → a team → Related.
- **Actual:** the team overlay lists *Sessions* (0) with a "Sign out other devices" button; its confirm reads "Sign out of every other device where you're currently logged in?" — it acts on the admin's own sessions, not the team's.
- **Evidence:** `10-F-teams-related-sessions-signout.png`, `10-people-teams-related.png`.
- **class: a.** **Reach:** every admin opening a team.
- **Suspected landing:** objectstack `plugin-auth` `sys_team` page layout (related list of `sys_session` carrying its header action).
- **Dedupe words:** team related sessions, sign out other devices on team.

### F-16 — Branding settings save but change nothing measurable
- **Persona / URL:** dev admin, `/apps/setup/system/settings/branding`.
- **Steps:** set Organization name "HotCRM QA Org", Accent colour `#e11d48`, Logo URL `/_console/favicon.ico`; Save (200 "Settings saved"); reload; open the login page in a fresh browser.
- **Expected:** the page's description, "Organization name, logo, and accent colour."
- **Actual:** login page still "ObjectOS"; document title "Setup — ObjectOS"; CSS `--primary` unchanged (`215 19% 35%`); no logo anywhere. Logo URL also accepts `not a url` and `#e11d48` (type `url` input, no validation).
- **Evidence:** `25-config-branding-after-save.png`, `25-config-branding-effect-login.png`, `25-config-branding-effect-app.png`.
- **class: a.** **Reach:** every deployment.
- **Suspected landing:** objectstack `service-settings` branding namespace → console theme / login shell.
- **Dedupe words:** branding not applied, accent colour no effect, logo url validation.

### F-17 — Settings pages drop unsaved changes on navigation without asking
- **Persona / URL:** dev admin, Localization.
- **Steps:** change Default country (the bar shows "1 unsaved change"), click *Company* in the sidebar.
- **Expected:** the guard record forms have ("Discard changes? You have unsaved changes…", measured on Business Units).
- **Actual:** navigates at once; the change is gone.
- **Evidence:** `23-config-localization-dirty.png`, `23-config-localization-nav-away.png`, `09-people-business-units-discard-alert.png`.
- **class: a.** **Reach:** every settings page.
- **Suspected landing:** objectstack `console` settings page component.
- **Dedupe words:** unsaved changes lost settings, navigation guard.

### F-18 — "Send test" on Email and SMS has nowhere to enter a recipient; Email saves with its required fields empty
- **Persona / URL:** dev admin, Email (`/settings/mail`), SMS Delivery (`/settings/sms`).
- **Actual:** Send test email → 400 "Provide a "to" address (or set from_email)." — the page has no "to" field; it then sends to *From email*. Send test SMS → 400 "Provide a valid "to" phone number (E.164 recommended)." — no field. Email *Save changes* with *Host\** and *From email\** empty → 200 "Settings saved" (Branding refuses a blank required field).
- **Evidence:** `27-config-email-send-test-result.png`, `22-config-settings-sms-test.png`, `27-config-email.png`.
- **class: a.** **Reach:** every admin configuring mail or SMS.
- **Suspected landing:** objectstack `service-settings` (mail, sms namespaces) / `plugin-email`, `service-sms`.
- **Dedupe words:** send test email recipient, required settings not enforced.

### F-19 — "Test embedder" (AI) and "Test connection" (Knowledge) have no server handler
- **Actual:** `POST /api/settings/ai/test_embedder` → 400 "No handler registered for action 'test_embedder' in 'ai'."; `POST /api/settings/knowledge/test` → 400 "No handler registered for action 'test' in 'knowledge'."
- **Evidence:** `29-config-ai-test-embedder.png`, `30-config-knowledge-test.png`.
- **class: a** (a button declared that the runtime does not honour). **Reach:** every deployment.
- **Suspected landing:** objectstack `service-settings` ai / knowledge namespaces (actions declared, handlers missing).
- **Dedupe words:** no handler registered for action, test embedder, knowledge test connection.

### F-20 — Notification templates and subscriptions authored in Setup have no effect on the app's notifications
- **Persona / URL:** dev admin; Notification Templates and Subscriptions.
- **Steps:** templates for topic `urgent_task`, channel `inbox`, locales `en` and `en-US`, and one for `crm.urgent_task` (the `template` key the flow sends), all active; subscription `user:<qa.plain>` on `urgent_task`; create an urgent task (flow `task_urgent_alert`, `src/sales/flows/task-urgent-alert.flow.ts`).
- **Expected:** Templates' empty state: "Add a template per topic, channel and locale; until then, a notification is sent with the title and body its sender provides." Subscriptions: "A subscription records that a role, a team or a user follows a notification topic."
- **Actual:** the inbox title stays "Urgent task: …" for every variant; `qa.plain` receives nothing (0 → 0). The notification's payload is `{"template":"crm.urgent_task","templateData":{…}}`.
- **Evidence:** `34-config-notification-templates-list.png`, `33-config-notification-subscriptions-created.png`, `37-diagnostics-notifications-detail.png`.
- **class: a.** **Reach:** admins customising notifications. *Verdict PLAUSIBLE for the subscription half*: the flow names explicit recipients, and the platform may route topic subscriptions only for broadcasts.
- **Suspected landing:** objectstack `service-messaging` (template selection, subscription fan-out); HotCRM `task-urgent-alert.flow.ts` only as the sender used.
- **Dedupe words:** notification template not applied, subscription no delivery, crm.urgent_task.

### F-21 — The default datasource reads "connected" but its Test and Sync say it has no driver
- **Persona / URL:** dev admin, Datasources.
- **Actual:** card "default · sqlite · connected"; Test → 200 + toast "default: [ObjectQL] Datasource 'default' has no registered driver to introspect."; Sync objects → `400 GET /api/v1/datasources/default/remote-tables`, then a dialog "No remote tables found on this datasource." A runtime `:memory:` datasource tests fine ("connection ok (0ms)"), and Setup has no edit or delete for it.
- **Evidence:** `38-integrations-datasources-test.png`, `38-integrations-datasources-sync-objects.png`, `38-integrations-datasources-created.png`.
- **class: a.** **Reach:** every deployment.
- **Suspected landing:** objectstack `service-datasource` (default datasource not registered for introspection) and console datasource page.
- **Dedupe words:** no registered driver to introspect, remote-tables 400, datasource delete missing.

### F-22 — OAuth app registration rejects `http://localhost` and `http://127.0.0.1` as "non-loopback", with HTTP 500
- **Persona / URL:** dev admin, OAuth Applications → Register, type Web.
- **Expected:** the field's help, "Must use https:// in production" (loopback http allowed).
- **Actual:** `POST /api/v1/auth/sys-oauth-application/register` → **500**, toast "web clients require https redirect URIs on non-loopback hosts: http://localhost:4001/callback" (same for `127.0.0.1`). `https://qa.example.com/callback` registers.
- **Evidence:** `40-F-oauth-localhost-rejected-500.png`.
- **class: a.** **Reach:** anyone registering a local or dev OAuth client.
- **Suspected landing:** objectstack `plugin-auth` OAuth provider (loopback detection, and a validation error raised as 500).
- **Dedupe words:** oauth redirect loopback localhost rejected, non-loopback hosts, register 500.

### F-23 — Confirmation texts that contradict what the action does
- **Actual:**
  - *Override Reassign* says "Continuing uses your admin override: it finalises the step immediately and bypasses the approvers who have not acted". Reassign does not finalise the step: the request stayed Pending, now waiting on Priya Raman.
  - *Rotate Client Secret* confirm: "The previous secret will stop working immediately"; the result dialog: "Update every integration before the previous secret's grace period ends."
- **Evidence:** `18-approvals-override-reassign-dialog.png`, `19-approvals-requests-after-override.png`, `40-advanced-oauth-rotated.png`.
- **class: a.** **Reach:** every admin.
- **Suspected landing:** objectstack `plugin-approvals` (override copy shared across actions), `plugin-auth` (rotate secret copy).
- **Dedupe words:** override reassign finalises text, rotate secret grace period.

### F-24 — Audit Log object filter: its own example finds nothing
- **Actual:** placeholder "e.g. account" → typing `account` returns 0 rows; `crm_account` returns 11.
- **Evidence:** `35-F-audit-log-filter-placeholder-empty.png`, `35-diagnostics-audit-log-object-filter.png`.
- **class: a.** **Reach:** every admin.
- **Suspected landing:** objectstack `console` audit log component (exact match on object name; placeholder from a prefix-less app).
- **Dedupe words:** audit log object filter placeholder, exact match.

### F-25 — Record Shares and Notification Preferences show raw ids where a person is named
- **Actual:** Record Shares *Recipient* column: `zUsLXX3iRGTD74x6galskTIar9mzLTm3` etc.; overlay *Record* `yip2rPflZ86Ij2yL`, *Recipient* raw id; no column says which rule granted the share. Notification Preferences list and title: `ISu3jHPIrdgD45L1rrC2FuE7DIcsk2ap · urgent_task · inbox`. `sys_user_permission_set` titles: `<raw user id> → qa_fls_rep`.
- **Evidence:** `sweep-16-record-shares.png`, `16-access-record-shares-detail.png`, `32-config-notification-preferences-created.png`.
- **class: a** (UX defect: the admin cannot tell who holds access). **Reach:** every admin.
- **Suspected landing:** objectstack `plugin-sharing` `sys_record_share` (recipient is polymorphic, not a lookup) and `service-messaging` `sys_notification_preference`.
- **Dedupe words:** record share recipient raw id, polymorphic recipient display.

### F-26 — Packages list and sheet: an empty Actions column and broken word wrapping
- **Actual:** the *Actions* header sits over an empty cell in every row (2 app rows, 23 platform rows); actions live only in the row's sheet. In the sheet, the Description breaks inside words ("marketplac / e", "Con / tracts").
- **Evidence:** `sweep-02-packages.png`, `02-apps-packages-hotcrm-detail.png`.
- **class: a** (UX defect). **Reach:** every admin.
- **Suspected landing:** objectstack `console` packages component.
- **Dedupe words:** packages actions column empty, word-break description.

### F-27 — Authentication controls that contradict the system's behaviour
- **Actual:**
  - *Allow self-service registration* is ON, yet *Self-registration audience* is "Invitation only". `POST /api/v1/auth/sign-up/email` → 403 `SELF_REGISTRATION_CLOSED`; `/register` says self-registration is not open.
  - *Enable Google login* is ON while its required *Google client ID\** and *secret\** are empty; the login page shows no Google button.
- **Evidence:** `26-config-auth-full.png`, `26-config-auth.png`.
- **class: a.** **Reach:** every deployment.
- **Suspected landing:** objectstack `plugin-auth` settings manifest (auth namespace defaults / dependent-field rules).
- **Dedupe words:** self-service registration toggle invite_only, google login enabled without client id.

## UI and UX suggestions

| Id | Page | What the admin meets now | Suggested improvement | Why (measured) | Landing | Size |
|---|---|---|---|---|---|---|
| U-01 | System Overview | "Events by User" has a "(None)" bar of ~740 events; bars change colour per bar. `01-overview-system-overview-today.png` | Label system writes "System"; one colour per series | The largest bar is unlabeled; colour carries no meaning | objectstack `setup` dashboard `system_overview` | S |
| U-02 | Many Setup forms | Developer text in admin help: "Foreign key to sys_user.", "NULL only on a grant written before the column existed", "Reserved for a future access-recertification workflow … Inert today", "via isGrantActive", "(P3 digest middleware)", "Owned by objectql (better-auth is oblivious to this column)", "[ADR-0086 D3]", "ADR-0057 … Reaper / Rotator / Archiver". `07-people-users-assign-permset-dialog.png`, `13-access-capabilities-detail.png`, `22-config-settings-lifecycle.png` | Write field help for admins; hide inert fields (Last Certified At) | 9 distinct dev-facing strings met in one pass | objectstack `platform-objects` / `plugin-*` field descriptions | M |
| U-03 | Business Units, Sharing Rules, Packages, Datasources | Raw option values: Kind `cost_center`, Recipient Type `business_unit` / `unit_and_subordinates`, label `autoMigrate`, labels followed by their machine key ("Display name\* name"). `09-people-business-units-new.png`, `15-access-sharing-rules-new.png`, `02-apps-packages-new-invalid-id.png` | Labelled options; drop machine keys beside labels | The help text under Recipient Type already uses labels the options do not show | objectstack `platform-objects` select options / console form | S |
| U-04 | Users list | Columns: email, phone, verified, source, 2FA, created. No positions, permission sets, org role, locked or banned state; the user locked by the test looked normal. `26-config-auth-lockout-users-list.png` | Add Access (positions / sets) and Status (locked, banned) columns, plus an effective-access summary on the record | Checking one user's access took opening 3 tabs plus 2 metadata pages | objectstack `plugin-auth` `sys_user` view | M |
| U-05 | Positions | 12 HotCRM positions without description; list shows no holders or bound sets; only the name cell is clickable. `sweep-12-positions.png` | Show holder count and bound sets in the list; make the row clickable. HotCRM: add descriptions in `src/sales/sharing/positions.ts` | The list cannot answer "who is a sales manager?" | objectstack console metadata list; HotCRM `src/sales/sharing/positions.ts` | S |
| U-06 | Installed Apps | Nav item "Installed Apps" opens a page titled "Packages" with "No packages match your filters." `sweep-05-installed-apps.png` | Title it "Installed Apps"; empty state "No apps installed from the marketplace yet" | Title and nav disagree; the empty state blames a filter the admin did not set | objectstack `cloud-connection` installed-ui | S |
| U-07 | Packages, Positions, OAuth | Errors with codes and ADR prose: "[writable_package_required] … (ADR-0131 D6) …", "The compound '<section>/<name>' spelling is retired …", "[body.redirect_uris.0] Invalid URL". `02-apps-packages-action-publish.png`, `12-access-positions-new-invalid-name.png` | One plain sentence, details behind "More" | The package error is 11 lines in a 400 px sheet | objectstack console error rendering | S |
| U-08 | Packaged Automation | A grey "On" chip beside every green switch; Clone opens with both names empty. `sweep-03-packaged-automation.png`, `03-apps-packaged-automation-clone-dialog.png` | Drop the chip (or use it for "Not bound"); prefill `<name>_copy` | 33 redundant chips; clone failed once on a name the form could have proposed | objectstack console automation component | S |
| U-09 | Approvals | Opening a request from the Setup inbox lands on the business record inside the Setup shell; overrides need no reason; request title "flow:opportunity_approval · A_RBGcaeRZZhezac"; "Via Admin Override" column needs horizontal scroll at 1440 px. `18-approvals-inbox-admin-detail.png`, `19-approvals-requests-record.png`, `20-approvals-action-history.png` | Open the record in its app; require a comment on overrides; title by record name; move the override flag left | An admin approved and rejected on others' behalf with no recorded reason | objectstack `plugin-approvals`, console | M |
| U-10 | Metadata delete, related lists | Position delete uses the browser's native `confirm()`; record deletes say "Delete record — Are you sure you want to delete this record?" without naming the grant. `07-people-users-permset-delete-confirm.png` | One styled confirm that names what is removed and from whom | Native dialogs differ from the 20+ styled ones met elsewhere | objectstack console | S |
| U-11 | Settings pages | Validation errors appear only as toasts ("Settings for 'localization' are incomplete: timezone — …"). `23-config-localization-invalid-tz.png` | Show the error under the field | The toast disappears; the field stays unmarked | objectstack console settings component | S |
| U-12 | Email | Provider "SMTP" with empty host, while platform mails are stored with status "sent" (dev mail sink). `27-config-email.png` | Say on the page which transport is live (e.g. "Development log sink — nothing leaves this machine") | "Invitation sent" toasts while nothing could be delivered | objectstack `plugin-email` / settings | S |
| U-13 | Connect an Agent | "Create key" creates a key named "agent-key" in one click, no name, no confirm, and prints it inline. `39-integrations-connect-agent-create-key.png` (redacted) | Ask for a name and confirm, as API Keys → Create Key does | Two key-creation paths behave differently | objectstack `mcp` connect-agent-ui | S |
| U-14 | Permission set editor | "Assigned Users" panel pinned over the last ~120 px of the 96-object grid; Save shows no toast. `14-access-permission-sets-sales-rep.png` | Put Assigned Users in a tab; confirm saves | The grid shows 8 objects at a time at 1440×900 | objectstack console permission editor | M |
| U-15 | Notification Preferences / Subscriptions | Free-text "User\*: Recipient user id, or '\*'", "Principal: 'role:x' \| 'team:x' \| 'user:id' \| …", free-text topic and channel. `32-config-notification-preferences-new.png`, `33-config-notification-subscriptions-new.png` | User/team pickers and a topic list | Muting one user required pasting a 32-character id | objectstack `service-messaging` objects | M |
| U-16 | Teams | Delete Team → "This cannot be undone" → Continue → "Unable to remove last team"; Add Member from a team does not prefill the team. `10-people-teams-add-member.png` | Disable Delete on the last team with the reason; prefill the team | Two extra clicks to learn it can't be done | objectstack `plugin-auth` team actions | S |
| U-17 | Record lists | A row opens an overlay for Business Units and Teams, a full page for Users. `09-people-business-units-row-click.png`, `07-people-users-record.png` | One behaviour across Setup | Sibling pages disagree | objectstack console | S |
| U-18 | Notifications (Diagnostics) | Events show topic, severity, payload; not recipients, channels or delivery outcome. `37-diagnostics-notifications-detail.png` | Show recipients and per-channel status | The muting test could only be verified through the API | objectstack `service-messaging` | M |
| U-19 | First sign-in of a new user | A user with no permission set lands on HotCRM's Service dashboard where every tile says "You don't have access". `07-people-users-newuser-landing.png` | Land users without grants on a page that explains they need access; Setup's Create User could offer a permission set | The first screen a new hire sees is 6 error tiles | HotCRM app landing (`src/sales/apps/`) / objectstack console default landing | S |
| U-20 | Branding vs Organization | Branding "Organization name" is "ObjectStack"; the Organization record is "Default Organization"; the product chrome says "ObjectOS". `25-config-branding.png`, `sweep-08-organization.png` | One organization name, edited in one place | Three names for one thing | objectstack settings / auth | S |
| U-21 | API Keys → Create Key | Only a Name field; the key gets a 90-day expiry (from Authentication → key lifetime) the dialog never mentions. `17-access-api-keys-create.png` | Show and allow choosing the expiry | The list shows "1/18/2027" the admin never chose | objectstack `plugin-auth` | S |
| U-22 | Connect an Agent | Snippets name the server "objectstack"; the boot banner says `claude mcp add … hotcrm`. `39-integrations-connect-agent-full.png` | Use the app or deployment name in both | Two names for one endpoint | objectstack `mcp` | S |
| U-23 | Record pages | Two nested `<main>` landmarks on record pages (Organization). | One `main` landmark | Screen readers announce two main regions | objectstack console layout | S |

## Choices made

Each choice is weighed on the four fixed axes (real business need, long-term soundness, making AI errors structurally harder, start-up focus).

1. **Throwaway users through the API after the first one.** The first user (`qa.plain`) was made through the UI's Create User; the other four through `POST /api/v1/auth/admin/create-user`, the endpoint that dialog calls. *Need:* the checks need distinct users, not more dialog runs. *Soundness/focus:* the dialog itself was already measured (F-09, F-10).
2. **Effect checks through the API as well as the UI.** For each access change I read the affected user's data with their own session (`/api/v1/data/...`), and took a UI screenshot for the decisive ones (FLS, position removal). *Need:* an API read is the exact access answer; the UI adds evidence for the maintainer.
3. **Not tested, would end the tester's access:** disabling email/password login, requiring MFA, session lifetime/idle settings, Make Owner (would demote the dev admin), switching the storage or knowledge adapter (orphans files/indices). A second admin (`qa.admin2`) was created but not used: these settings are global, so testing them on a second admin would still lock out the dev admin.
4. **Network-blocked items marked "not reachable",** not "fail": Marketplace and Cloud Connection fail with 502 "fetch failed" because the container's network policy refuses the hosts.
5. **Secrets.** Created API keys and OAuth secrets were revoked or deleted. One screenshot (`39-integrations-connect-agent-create-key.png`) was redacted in the DOM before capture; no key value is in this report.
6. **Findings vs suggestions.** A stable, reproducible defect with a named landing spot and a non-taste expectation went to *Findings* (including UX defects F-25, F-26); preferences and redesigns went to *Suggestions*.
7. **Verdict per item.** An item with at least one finding is "fail", even when most of its paths pass; the passing parts are listed in *What I did*.

## Deviations

- **Commit.** The card names `b94cf856`; the container's `main` head was `f22dfa5` (= `b94cf856` + #2185, a forms fix for line items, quotes and forecasts that touches no Setup item). I tested `f22dfa5`.
- **One restart.** The session's worker process was restarted mid-run, which killed the dev server and the browser. I restarted `pnpm dev` on the same database (no reseed, no second `demo:staff`) and continued; all state created before (users, packages) was still there.
- **Two hub-only settings pages** (SMS Delivery, Data Lifecycle) were added to the coverage beyond the 40 nav items, as the brief asks for every settings page Setup links to.
- **Timestamps** in some screenshots read in Asia/Shanghai: they were taken during the Localization effect check (reverted to UTC afterwards).
- **Not filed anything.** No GitHub write besides pushing this evidence branch.
