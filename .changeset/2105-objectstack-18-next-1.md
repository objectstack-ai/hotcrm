---
'hotcrm': minor
---

Upgrade the ObjectStack platform to 18.0.0-next.1 (prerelease)

All 23 `@objectstack/*` dependencies move from 18.0.0-next.0 to 18.0.0-next.1 together, pinned
exact: 19 in `dependencies` and 4 in `devDependencies`. `specVersion` and `engines.protocol` follow
to `^18.0.0-next.1` in `objectstack.manifest.json` and in both package manifests (`src/sales`,
`src/service`). The protocol major is still 18, so any 18 runtime admits the artifact, and a 17.x
host still refuses it. `pnpm install` regenerated `pnpm-lock.yaml`: 705 `packages:` entries before,
707 after. The 55 `@objectstack/*` keys moved one for one. `@objectstack/connector-imap` and
`postal-mime@4.0.6` arrive with the platform's mailbox service. No other third-party package
changed version.

The platform changes that reached this app:

- **Campaign members, event attendees and article feedback now name their parent as a master.**
  Access to each of these rows derives from its parent (the campaign, the meeting, the article).
  Since 18.0.0-next.1 the platform derives that parent only from a required master-detail field,
  and it refused the required lookup these three objects used. **Campaign** and **Event** are now
  master-detail fields that refuse to delete a campaign or a meeting that still has members or
  attendees, as before. **Article** is master-detail and still deletes the feedback with its
  article, as before.
- **Scheduled notifications name the record they are about.** The contract renewal and expiry
  reminders, the stalled-deal nudge, the task reminder and the case SLA alert now link their inbox
  entry to the contract, deal, task or case. On 18.0.0-next.1 this link also decides which
  organization owns the notification. Without it, an install holding more than one organization
  would refuse each of these notifications on 18.0.0-next.1, and the sweep would abandon that
  record: no renewal deal opened, no stalled-deal task written.

The test suite moved with the platform. Test kits that mount the identity objects without the auth
plugin no longer create their own Default Organization, because the platform now creates it at boot.
The hierarchy read-depth suite saves its throwaway permission sets through the metadata API, because
the `sys_permission_set` data object is retired.
