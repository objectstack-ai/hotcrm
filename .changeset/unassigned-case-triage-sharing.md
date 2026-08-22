---
'hotcrm': minor
---

Service agents can now see the unassigned cases they are supposed to triage
(#1096).

The **Unassigned — triage** tab shipped pinned in every Cases list, including
the agent's — and returned nothing to the one persona it was built for. Service
agents hold Cases with own-record scope, and a case that arrives with no owner
is owned by nobody, so it matched no agent's scope. Administrators and sales
managers could see the intake backlog; the service team could not. That is the
normal state on a new org rather than an edge case: automatic round-robin
assignment stands down whenever nobody yet holds the Service Agent position, and
it stands down on the anonymous web-to-case path, so those submissions land
ownerless by design.

A new built-in sharing rule — **Unassigned Cases — Triage** — grants every
holder of the Service Agent position edit access to open cases with no owner.
The grant is self-limiting: it applies only while a case is unowned, so the
moment the case has an owner it falls back to ordinary own-record scope and the
share is withdrawn. No persona gains sight of a case that already belongs to
someone else, and a closed case with no owner stays out of triage — that is
history, not backlog.

⚠️ **Claiming a case from triage is not yet possible, and this release does not
change that.** Case ownership is system-managed: reassigning it requires a
transfer permission that the Service Agent profile deliberately does not carry,
and the platform applies that rule even when an agent assigns an unowned case to
themselves. Agents can now open, work, annotate and prioritise the backlog they
could not previously see; moving a case into their own name still needs an
administrator, or a manager who holds the transfer grant. The remaining half is
tracked on #1096.

Administrators: the new rule appears in **Setup → Sharing Rules** alongside the
existing ones, and is documented in *Administration → Sharing & Security*.
