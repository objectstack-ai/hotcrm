---
'hotcrm': minor
---

Upgrade the ObjectStack platform to 18.0.0-next.0 (prerelease)

All 24 `@objectstack/*` dependencies move from 17.7.0 to 18.0.0-next.0 together, pinned exact:
20 in `dependencies` and 4 in `devDependencies`. `specVersion` and `engines.protocol` follow to
`^18.0.0-next.0` in `objectstack.manifest.json` and in both package manifests (`src/sales`,
`src/service`). `pnpm install` regenerated `pnpm-lock.yaml` against the public registry: 790
`packages:` entries before, 791 after. The 54 `@objectstack/*` and `create-objectstack` keys moved
one for one, `@objectstack/service-mailbox@18.0.0-next.0` was added, and no third-party package
changed version.

**This release needs an ObjectStack 18 runtime.** 18.0.0-next.0 is a prerelease. The protocol
handshake compares majors, so a 17.x host refuses to load this artifact before it reads a single
object, and reports why. Upgrade the host first.

The platform changes that reached this app:

- **Every flow is rewritten in the two 18.0.0-next.0 dialects.** The platform no longer accepts
  `{…}` templates in a flow's value fields. A value is now a CEL expression, and a text field
  (screen titles and descriptions, end messages, action links, HTTP URLs and headers) takes
  `{{ … }}` holes. All 32 flows and the shared billing payload were rewritten, and `os validate`
  goes from 340 refusals to none. Each site keeps what it did on 17.7.0, with one exception. On
  **Close Case**, an agent who leaves *Resolved by Article* unanswered now clears a link that was
  set earlier on the record form. On 17.7.0 that link stayed.
- **Flow dialogs translate more of their text.** 18.0.0-next.0 makes screen descriptions, select
  options and refusal messages translatable, and `os lint` reports the missing keys. All 32 new
  keys are translated in zh-CN, es-ES and ja-JP, using the words the packs already use for the
  same objects.
- **Tenant administrators no longer hold `manage_org_presentation`.** 18.0.0-next.0 retires the
  capability together with per-organization overlays (ADR-0131 D6). The platform has no
  organization-bounded authoring capability now, so a tenant administrator authors no metadata.
- **Email templates no longer declare `category`.** The platform retires the key and refuses it.

**What operators should know:**

- **Scheduled flows still need `OS_AUTOMATION_SCHEDULED_WORK_ENABLED=true`.** Without it, none of
  the eight scheduled flows runs: no contract or quote expiry, no SLA monitor, no reminders, no
  forecast snapshots.
- **Every install now has an organization.** Under the `single` posture, the platform creates the
  Default Organization at boot and loads the seed data into it.
- **A position assigned through Setup carries that organization.** A position row written without
  one, such as a 17.x row an upgrade carries over, does not staff the case-escalation pool, which
  stays inside each case's organization. A sales manager or service manager whose 17.x assignment
  carries no organization should be assigned again.
- **Deleting an account removes its draft, expired and terminated contracts with it.** An activated
  contract still blocks the delete, as the account documentation says.
- **An elevated scheduled or sub-flow can no longer be started by name**, not even by an
  administrator. It starts from its own trigger, or as a sub-flow of a parent flow.

The test suite moved with the platform. Every suite runs on the SQL datasource, by maintainer
ruling. The legs whose only subject was the absent-column shape of the in-memory driver are retired,
because that driver no longer serves an app with organizations. The token ceilings are raised 50%
by maintainer ruling and recorded as a grant.
