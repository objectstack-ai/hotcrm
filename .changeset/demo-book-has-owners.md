---
'hotcrm': patch
---

Hand the seeded demo book to the demo roster, so a salesperson whose agent connects
over OAuth sees a **subset** of the pipeline instead of nothing at all.

### What was measured

`demo_bootstrap` claims every ownerless seeded row for the FIRST user — the dev admin
— and it has to: a seed cannot name a user, and that flow ships in the artifact, so it
must not know the demo people. The result is that the entire demo book sits on one
identity.

Over an API key that is invisible: the request runs as the human, so `viewAllRecords`
applies. An agent session does not get that. The agent ceiling
(objectstack-ai/objectstack#16549) admits only the rows the caller **owns** or holds a
**share** on, and `viewAllRecords` deliberately does not lift it. So the reporter,
signed in as `sales.manager@objectos.ai`, measured `crm_opportunity` **0** and
`crm_task` **0** where the same objects answer 23 and 59 over an API key. Only the
accounts survived — 5 of 9 — because the territory rules materialise real
`sys_record_share` rows.

Re-derived on a fresh box at `de6ed9e`, before any change: `crm_account` 9 / admin,
`crm_opportunity` 23 / admin, `crm_lead` 21 / admin, `crm_task` 7 / admin, `crm_event`
27 owned by **nobody**, and `sys_record_share` empty. Every persona's agent reads zero.

### What changed

`pnpm demo:staff` gained a step. After it creates the demo people and before it
re-evaluates the sharing rules, it re-stamps `owner_id` on the objects declared in
`src/sharing/demo-staffing.ts`, routed by the **territory** of the account each row
hangs off — NA rows to the NA rep, EMEA to the EU rep, anything with no resolvable
territory to the manager. After it:

```
object             routed   na.rep   eu.rep   sales.manager   dev admin   nobody
crm_opportunity        23       16        5               2           0        0
crm_lead               21        0        0              21           0        0
crm_task                7        6        0               1           0        0
crm_event              27       21        2               4           0        0
```

Each identity holds a subset, which is the point: handing the whole book to one demo
user would have replaced "sees 0" with "sees all" and lost the demonstration that
row-level security is on at all. Read as each persona, the split is visible without any
agent: the NA rep reads 16 opportunities and 21 events and **no** leads or cases; the EU
rep reads 5 and 2.

⛔ **No profile, permission set or sharing rule is touched.** The ceiling that produced
the zeros is the platform working correctly, and widening a grant to raise the numbers
would have converted a demo-fidelity defect into a security-shaped one.

⛔ **`crm_account` is deliberately NOT routed.** It is `sharingModel: 'private'`, so the
OWD baseline already admits a record's owner — a share to the owner proves nothing, and
the two territory reps exist precisely to read accounts they do not own. It is also the
one object that already answered non-zero over OAuth, and it did so through a share
rather than through ownership.

The step claims only rows sitting on the dev admin or on nobody. A row a live workflow
already assigned — the SLA sweep escalates cases and the escalation hook hands the
resulting tasks to the service manager — is left where it is. So the run is idempotent
(a second pass writes 0) and order-independent (correct whether or not `demo_bootstrap`
has swept yet), and the sweep never takes the rows back: it selects `owner_id: null`.

The script also re-reads the census from the server afterwards and fails on anything
that does not land where it was sent, so a PATCH that reported success and changed
nothing cannot pass as a fix.

### What an installed org receives: nothing

Measured, not assumed. `dist/objectstack.json` is **byte-identical** before and after
this change (sha256 `5da76e49…` at both `de6ed9e` and this branch), and
`scripts/publish-marketplace.mjs` publishes that file and nothing else. Both edited
source files are outside the artifact by construction — `src/sharing/demo-staffing.ts`
is not exported from the sharing barrel and `scripts/` is not built at all, which
`test/demo-staffing.test.ts` pins from the other side. What changes is the outcome of
the documented demo boot procedure, which is the product's showcase and the reason this
was filed at p1; a maintainer who reads "releases nothing to HotCRM users" as "installed
orgs receive nothing" can downgrade this to the empty-frontmatter form in one line.
