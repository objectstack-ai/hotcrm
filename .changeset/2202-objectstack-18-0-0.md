---
'hotcrm': patch
---

Upgrade the ObjectStack platform to 18.0.0, the first general-availability release of major 18

All 23 `@objectstack/*` dependencies move from 18.0.0-next.5 to 18.0.0 together, pinned exact.
`specVersion` and `engines.protocol` follow to `^18.0.0` in `objectstack.manifest.json` and in both
package manifests. No third-party package changes version, and no app metadata had to change.

**This release still needs an ObjectStack 18 host.** A 17.x host refuses the artifact at the
protocol handshake, as before.

What HotCRM users see on the new platform:

- **The public Support form preselects Priority.** It opens on *Low*, the option the app marks as
  the default, so a visitor who leaves it alone can submit. Before, the field was empty and the form
  refused "Required: Priority".
- **Import with a saved mapping works from the Import wizard.** Choosing a mapping the app ships,
  such as *Account Import (CSV)*, under *Saved mapping* now imports the file through that mapping,
  with its value translations (*Client* becomes *Customer*). Before, the wizard sent the rows in a
  format the mapping does not declare, and the import failed.
- **Clearing a line item's Sales Price names the field.** The refusal reads "Sales Price is
  required" (in Chinese, "销售单价不能为空") instead of the column key `unit_price`.
- **The person who submits an approval is told the outcome.** When a manager approves or rejects
  a request, its submitter gets a *Request approved* or *Request rejected* notification from the
  platform. The app's own notices to the record owner stay, so an owner who submitted the request
  themselves now gets both.
- **Writes an approval makes after the decision are the approver's.** For example, when a manager
  approves a large deal, its approval date is written as the manager, and *Last Modified By* names
  them.
- **Recalling a large-deal approval re-opens it.** A recall now puts *Approval Status* back to
  what it was before the request (*Not Required*), and the Large Deal Approval starts again on
  that change. The deal stays locked under a new pending request. Before, a recall left the status
  at *Recalled*, unlocked the deal, and the deal never re-entered approval.
- **Setup › Access Control lists the app's own sharing rules** under *Declared Sharing Rules*,
  read-only, where each can be switched off or cloned. *Sharing Rules* keeps listing the rules
  your organization creates.

What administrators, operators and integrators should know:

- **A database an 18.0 pre-release created must be upgraded before 18.0.0 serves it.** Every
  HotCRM 5.x deployment runs on an `18.0.0-next` host, so this applies to all of them. 18.0.0
  refuses to start on such a database ("This database carries no organization-ownership marker").
  Start 18.0.0 once (the start is refused, after it has created the new tables), take a backup, run
  `os migrate organization-ownership --out plan.json`, review the plan, then run
  `os migrate organization-ownership --apply --plan-file plan.json --backup-taken` and start again.
  A local development database is upgraded by `os dev` itself, which keeps a copy first.
- **A front-end on another origin must be named to call the API.** With no `OS_CORS_ORIGIN` set,
  the server admits no cross-origin browser caller (a loopback origin is still admitted in
  development). The console and the public forms are served by the server itself and are not
  affected. An embedded form or a portal on another domain sets
  `OS_CORS_ORIGIN=https://its.domain`.
- **A production `os serve` with no `OS_AUTH_SECRET` refuses to start.** `os start` supplies one.
- **Mail bodies are readable only with `manage_platform_settings`.** An organization
  administrator still sees that an email from *Send Email* was sent, to whom and with what result,
  but not its text.
- **A flow resume that carries both `inputs` and `variables` is refused with `400`.** Send the
  screen's answers under `inputs` only. The console already does.
- **No app data changes.** No object, field or stored value changes in this release, and nothing
  needs to be reloaded.
