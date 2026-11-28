---
"hotcrm": major
---

Clause-②: yes
Metadata-protocol: protocol 19

**HotCRM moves to ObjectStack 19 (protocol 19).** Every `@objectstack/*` package moves from 18.6.0 to `19.0.0-next.2`, a cut of the ObjectStack 19 prerelease line, and the app manifest and all seven package manifests declare `engines.protocol: '^19.0.0-next.2'` (FROM `^18.6.0`). An ObjectStack 18.x host refuses this release up front with `OS_PROTOCOL_INCOMPATIBLE`, and an ObjectStack 19 host refuses HotCRM 6.7.0 and earlier the same way: upgrade the host and HotCRM together.

What changes for people using HotCRM:

- **Lines of a record in approval are held by the platform.** While an opportunity, timesheet or travel request waits for approval, the platform refuses every change to its lines (opportunity line items, time entries, travel legs) with its own message, "This Opportunity is locked while an approval is in progress, and cannot be edited until that approval is complete", instead of HotCRM's. A travel leg's booking reference can no longer be written while the request is pending; it is still writable once the request is decided.
- **An action's selection is read as the person running it.** Submitting expenses that include one the submitter cannot see now answers that the record was not found, before HotCRM's own "not yours" check.
- **Setup → Apps → Packages** is the platform's full package list, with enable and disable; the admin docs now point there instead of the retired Setup → Installed Apps.

Every action names what it acts on in protocol 19's words (`record`, `record_page`, `record_row`, `list`), FROM the retired page-part words (`record_header`, `record_more`, `list_item`, `list_toolbar`); each button stays where it was, and Clone Opportunity stays in the record page's More menu.

The twelve status state machines now declare `initialStates`, which protocol 19 asks for. Each lists every state, so a record, an import or an integration included, can still be created in any state as on 18.6.0.
