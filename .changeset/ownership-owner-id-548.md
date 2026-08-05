---
'hotcrm': major
---

**Owner is now one field, and changing it really does transfer the record.**

Every business object used to carry two owners: the **Owner** you saw on forms,
views, highlight strips and reports, and a separate hidden column the platform
used for every access decision. Nothing kept them in step. Reassigning Owner
moved the record in every list and report and moved **no access at all** — the
previous owner kept it, the new owner never got it. Records created on someone
else's behalf were scoped to whoever created them, and sharing rules,
`own`/`own_and_reports` read scopes and the *Private deal* row filter all
resolved against a column the UI never showed.

HotCRM now has exactly one Owner: the platform's ownership column. One field on
the form, one column in the "My …" views, one answer to *"who owns this?"*.

**Changing Owner is now a permission.** Because reassigning really does move
access, it is gated separately from ordinary edit rights:

| Persona | May reassign |
| --- | --- |
| System Administrator | every object |
| Sales Manager | leads, accounts, contacts, opportunities, quotes, tasks, meetings, forecasts |
| Service Agent | tasks only — so escalation can hand work to the account owner |
| Sales Rep, Marketing User | nothing; records are assigned *to* them |

A user without the grant who tries to reassign now gets a clear refusal instead
of a change that appeared to work and did nothing. Three everyday actions are
deliberately **not** transfers and need no grant: creating a record (it is
stamped to its creator automatically), saving a form without touching Owner, and
automation acting on your behalf — lead round-robin, the nightly renewal /
follow-up / forecast sweeps.

**Import files that name an owner now need the transfer grant.** `Account Owner
Email` / `Contact Owner Email` / `Lead Owner Email` target the real ownership
column, so a file that assigns rows to other people is a bulk transfer and is
refused unless the importing user may perform one. Leaving the column blank is
unchanged: the row lands with the importer.

**Ownership changes still appear on the record timeline**, and every transfer is
recorded in the audit log.

## Migration — run the backfill BEFORE upgrading

FROM: two columns, `owner` (displayed) and `owner_id` (enforced).
TO: one column, `owner_id`, labelled **Owner** everywhere.

On any org where somebody reassigned Owner, the two columns disagree today: the
record shows one person and is accessible to another. The upgrade keeps the
**enforced** value, so those records keep their current access and their
displayed owner changes to match it.

If you want the *displayed* owner to win instead, run the one-time backfill
**while the org is still on the previous release** — after the upgrade the old
column is gone and its values cannot be read back:

```
pnpm backfill:owner --url https://<your-org> --email <admin> --password <pw>
pnpm backfill:owner --url https://<your-org> --email <admin> --password <pw> --apply
```

The first command reports; only `--apply` writes. It copies the displayed owner
onto the enforced one wherever they diverge, skips rows whose Owner names no
real user (the old field had no referential integrity, so it could hold any
string), never blanks an existing owner, and is safe to re-run. It needs an
administrator account, because a backfill is a bulk transfer.

Nothing to do if nobody ever reassigned an Owner: the two columns already agree
and the backfill reports zero divergences.
