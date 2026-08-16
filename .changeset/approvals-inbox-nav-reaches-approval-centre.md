---
'hotcrm': patch
---

Point the **Approvals → Inbox** sidebar entry at the platform's approval centre,
so following it lands somewhere an approver can actually approve.

The entry was `type: 'object'` on `sys_approval_request` — the approvals
plugin's raw request table. That table is read-only: the row-end menu is empty,
the record detail's overflow menu offers only *Share*, and the status strip does
not filter. An approver who followed a menu labelled **Inbox** (zh-CN
「待我审批」, ja-JP「受信トレイ」, es-ES *Bandeja de Entrada*) reached a page with
no approve or reject anywhere on it. The platform's approval centre — which does
support both, with hover approve/reject on each row and `j`/`k` to move, `Enter`
to open, `a` to approve, `r` to reject — was reachable only from a bell
notification or by typing a URL.

The entry is now:

```ts
{ id: 'nav_approval_requests', type: 'component', componentRef: 'approvals:inbox',
  label: 'Inbox', icon: 'inbox', requiresObject: 'sys_approval_request' }
```

`component`, not `url`. The approval centre is a first-party console surface
registered in the runtime's `ComponentRegistry`, which is exactly what the spec
documents `component` for — "a first-party UI shipped with the platform,
typically admin/setup surfaces that have no row in any data store" — while `url`
is documented as the external-link type. Taking `url` would have meant writing a
console-internal route plus this app's own name into metadata; a `componentRef`
resolves against the current app base instead, so the entry keeps the user
inside HotCRM's shell without naming either. It also fails loudly: an
unregistered ref renders "Component not registered", where a stale URL bounces
silently to the console home.

No second "approval history" entry was added. The approval centre already
subsumes the object list it replaces — **My Pending** / **Submitted by me** /
**All** tabs plus a status filter over Pending, Approved, Rejected, Recalled and
Returned for revision — so a second entry would only add a weaker view of the
same rows. Labels are unchanged in all four locales, and `requiresObject` is
retained, so the entry still hides itself where the approvals plugin is not
installed.

`test/docs-revenue-approvals-navigation.test.ts` pins the new shape and, because
no metadata check can see a component ref resolve, also pins `approvals:inbox`
against the installed console's own bundle — so a console release that renames
or drops the surface turns that test red instead of leaving the sidebar quietly
dead. Refs #1123.
