---
'hotcrm': patch
---

Measure every claim on the Security & Compliance reference page, in all three
locales. The page described a security posture the app does not have, and four
of the corrections reverse advice a reader could act on and get the opposite of
the truth.

- **Account lockout is off, not "default 5".** `lockout_threshold` defaults to
  `0`, which disables lockout entirely. So do password complexity, password
  history, password expiry, breached-password rejection, idle timeout, absolute
  session timeout and the concurrent-session cap — every protective knob at
  **Setup → Authentication** is off until an admin turns it on, and HotCRM turns
  none of them on. The page presented them as active defaults.
- **Passwords are hashed with scrypt, not bcrypt.**
- **IP allowlists and concurrent-session caps do exist** — as deployment-wide
  settings in the `auth` namespace, not the per-profile controls the page
  described and not the "not configurable anywhere" the previous correction pass
  left behind. Login hours and device trust are absent.
- **No export has ever written an audit-log row.** The platform retired the
  `export` action from `sys_audit_log` rather than keep a permanently empty
  filter on a compliance surface. Failed sign-ins are not audited either. What
  the audit log really records, and its measured 90-day/7-year lifecycle, are
  now stated per category.
- **`encrypted` is rejected by name.** Column-level field encryption was pruned
  in 2026-06; the real channel is `type: 'secret'` (AES-256-GCM into
  `sys_secret`, fail-closed), joined in 17.1.0 by `maskingRule` for partial
  masking and `requiredPermissions` / `internal` for per-caller field control.
- **Record-view auditing is new in 17.1.0** — `sys_audit_log` can now answer
  "who viewed this record", for record-detail reads, on per-object opt-in. It
  is off in HotCRM today, and the page says how to turn it on.

Claims that are properties of the deployment or its operator — data residency,
backup key separation, TLS/mTLS, SOC 2 and ISO 27001 operation, HIPAA/BAA,
RPO/RTO, status page and disclosure programme — are converted to the
"property of your deployment" form pages 1 and 2 already use. Every denial is
scoped to "nothing here does it"; none asserts what a hosted service or a
company does or does not do.
