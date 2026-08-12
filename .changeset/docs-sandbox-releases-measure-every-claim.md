---
'hotcrm': patch
---

Measure every remaining claim on the Sandbox & Release Management page, in all
three locales. PR #1118 added a page-level note saying the screens do not exist,
but roughly half the page underneath it still read as working product
description. Each claim was checked against the app's own metadata and the
installed `@objectstack/*` packages (spec 17.0.0-rc.6), and each landed in one of
three states — verified, converted to the *not shipped* form, or flagged as
unsettleable — with nothing deleted.

What the measurement found:

- **Sandbox types and refresh cadences.** No `sys_sandbox` object, no
  `sandboxType` key, and no config/partial/full taxonomy anywhere. The real
  surface is the ObjectStack Cloud `EnvironmentSchema`, whose `type` is a
  seven-member posture enum (`production | sandbox | development | test |
  staging | preview | trial`) — `sandbox` is a value on it, but it is not a
  data-fidelity tier and the three cadences correspond to nothing.
- **"Enterprise plans typically include 3 sandboxes."** No sandbox entitlement
  exists — no `sandboxLimit`, `maxSandboxes` or `sandboxQuota`. Cloud's
  `EnvironmentSchema` does carry a `plan` field, but its only quota is
  `storageLimitMb`; nothing counts environments.
- **Anonymisation on refresh.** Zero hits for `anonymi[sz]`, `pseudonymi[sz]` or
  `fakeName` across the installed tree. The adjacent real mechanism,
  `publicSharing.redactFields`, *drops* fields from a public share link — it does
  not transform values and is not anonymisation.
- **"What can be packaged."** The nine-yes/three-no table is replaced by the
  compiled artifact's actual 42-key set. One row was outright wrong: **record
  data IS packageable** — `data` is a top-level key and this app ships 21 seed
  families through it, per environment (`env: ['prod','dev','test']`). Two more
  were stale: there is no approval-process key (approvals are flows carrying
  `approval` nodes since the `approvals` field was removed in 7.4) and no
  knowledge-base-config key. The "use file sync API" suggestion points at an API
  that does not exist.
- **Deploy dry-run.** Genuinely real, in a different shape: `os migrate plan` is
  a dry-run diff of metadata against the physical database, categorised safe /
  needs-confirm / destructive, and it never mutates the schema. The page now
  names it. The "under 2 min" figure is marked unsourced — nothing times a
  deployment.
- **Deployment alerts, error-spike auto-rollback, p95 regression detection.** All
  three absent. `connector_action` is a platform built-in but ships with an
  *empty* connector registry and this app installs no connector; there is no
  alert-rule, threshold or anomaly-detection surface of any kind; and `p95` is a
  `MetricAggregationType` member — a value you can compute, not a detector that
  compares against a baseline.

Two claims are explicitly **not** answered rather than denied: whether the
ObjectStack Cloud control plane sends deployment notifications to Slack/Teams,
and whether it watches error rates or p95 latency for hosted environments. Those
are properties of a hosted service, not of this app's metadata, and the page now
scopes its denial to HotCRM and the installed tree instead of overreaching.

Also corrected: a smoke-test step that told the reader to send mail "through a
connected inbox", a capability `guides/email-and-calendar.mdx` already documents
as not shipped.
