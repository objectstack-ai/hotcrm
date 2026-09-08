---
'hotcrm': patch
---

Give the Service Manager persona the access its own escalation flow assumes. A
case escalated out of the agent queue is handed to a Service Manager, and a
sharing rule grants that person edit on open critical cases — and until now they
could not open a single record of any kind. Every CRM object answered
`403 PERMISSION_DENIED` for them, so the grants the app materialised were real
and unreachable, and `pnpm demo:staff` (the documented second step of the demo
boot procedure) exited 1 on a clean install.

### A declared position is not an enforced one

`service_manager` was declared in `src/sharing/positions.ts`, named by
`case_escalation_sharing`, and routed to by `case_escalation_reassign`. All
three declarations were live, the suite was green, and nothing bound a
permission set to the position — so holding it granted nothing at all.

The platform has no authorable "bind set X to position P" key: `PermissionSet`
rejects `profiles` / `roles` / `users`, `Position` rejects `permissionSets`, and
the binding is a runtime `sys_position_permission_set` row created in Setup or
by an app's own `kernel:ready` binder. A pure-metadata app ships neither. What
it can ship is a NAME: the security plugin resolves a caller's POSITION names
against declared permission-set names, so a set named for a position is bound to
it. Measured on a fresh 17.3.0 box, `sys_position_permission_set` held exactly
one row (`everyone` to `member_default`, which the platform binds itself) while
`POST /api/v1/security/explain` still credited the object grant to
`[service_agent] via position:service_agent`.

So `service_manager` is now a declared permission set — the Service Agent's own
grant tables, carried by reference under the manager's name. Escalation handling
is the same object access as working a ticket, so the two personas share one
table and cannot drift apart; nothing about the agent's access changed.

### What this fixes, measured

`service.manager@objectos.ai`, before and after, on the same box: `crm_account`
403 to 200, `crm_task` 403 to 200, `crm_event` 403 to 200, `crm_lead` 403 to
200, `crm_case` 403 to 200. Every case routed to them by escalation is now
readable by its assignee — none were before. `pnpm demo:staff` exits 0 on a
fresh box, where it exited 1 on `main`.

`crm_opportunity` stays 403 for this persona, exactly as it is for a Service
Agent: that set holds no read on the pipeline, and widening it would be a
manager-specific grant nothing has asked for. A customer who needs one gets it
as its own change, with the reason named.

### A measured claim that had gone stale

`src/sharing/demo-staffing.ts` recorded, from 17.0.0-rc.1, that the object-level
door on `crm_account` was opened for every org member by the platform's additive
`member_default` baseline. Re-measured on 17.3.0 and inverted: a user holding
only a territory position resolves to `member_default` alone and is refused —
`object_crud DENIES, No resolved permission set grants read on 'crm_account'`.
The door is opened by `sales_rep`, the set carrying the rep position's name; the
territory sharing rule still decides which rows. The note now says that, with
the layer stack it was measured from.
