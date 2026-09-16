# HotCRM Requirements Log

> How a **customer's raw requirement** becomes a decision about how the
> **standard product** responds — managed as repo files, not an issue tracker.
>
> Development is AI-driven. These records are the human-or-customer **input** an
> AI agent reads before authoring metadata; there is no GitHub issue ceremony.
> One file per requirement: [`TEMPLATE.md`](TEMPLATE.md) → `NNNN-slug.md`.

## Why file-based

HotCRM is a **productized** marketplace app: one standard product installed by
many customers. The hardest question is never "can we build it" — it is **"does
this belong in the standard product, or only to this one customer?"** That
decision must be written down, traceable, and re-readable by the next agent.
A rolling backlog in an external tool loses the *why*; a record next to the
metadata keeps requirement → disposition → change in one place.

## Lifecycle

```
Intake  →  Triage (disposition)  →  Build  →  Trace  →  Close
raw words   A/B/C/D + rationale     metadata   link PR    Shipped/Declined
```

1. **Intake** — capture the customer's requirement **verbatim, in their original
   language**. Do not pre-interpret; the raw words are the source of truth for
   what was actually asked.
2. **Triage** — analyse what the standard product does today, then assign a
   **disposition** (below) with a rationale.
3. **Build** — implement per the disposition (config / standard metadata /
   overlay), through the normal change loop (`pnpm verify` + a changeset).
4. **Trace** — link the changeset / PR / overlay package on the record.
5. **Close** — mark `Shipped`, `Declined`, or `Deferred`.

## The disposition framework (how the standard product responds)

Every requirement lands in exactly one bucket. **Default to keeping the standard
product generic — the burden of proof is on promoting something into the core.**

| | Disposition | Meaning | Where it lands |
| --- | --- | --- | --- |
| **A** | **Standard — already supported** | Existing metadata already does it via configuration | No new core metadata; document the config steps |
| **B** | **Standard enhancement** | A gap that is **broadly valuable to most customers** | Add to HotCRM core `src/` — ships to **all** installs (changeset + verify) |
| **C** | **Customer-specific customization** | Valuable to **this customer only**, or too specific to generalise | An ObjectStack **overlay / extension package installed on top of HotCRM** — **never committed into HotCRM core** |
| **D** | **Decline / defer** | Out of scope, or not now | Record the rationale + a revisit trigger so it is not re-litigated |

### Why C does not enter the core

The standard-vs-custom seam is an ObjectStack platform capability, not a HotCRM
invention. Keep per-customer shape **out** of `src/` so the standard product stays
generic and upgrade-safe:

- **Customization overlay** (framework ADR-0005) — a customer can override/extend
  metadata without forking the base object.
- **Package-scoped resolution** (framework ADR-0048) — a customer extension is its
  own package; it coexists with HotCRM via `packageId` scoping.
- **Protection model** (framework ADR-0010) — base metadata stays protected from
  ad-hoc customer edits.

If a "customer-specific" request keeps recurring across customers, that is the
signal to **re-triage it from C to B** and promote it into the core.

## File layout

```
docs/requirements/
├── README.md          # this model
├── TEMPLATE.md        # copy this for each new requirement
└── NNNN-slug.md       # one record per requirement (e.g. 0001-lead-scoring.md)
```

- IDs are zero-padded, monotonic (`0001`, `0002`, …).
- Records are append-only history: supersede with a new record + a note, do not
  silently rewrite a closed decision.
- The raw requirement keeps the customer's **original language**; the analysis,
  disposition, and response are written in **English** (repo doc rule).

## What freezing protects (2026-09-16 maintainer ruling)

The maintainer's ruling of 2026-09-16, **as adopted rather than as typed**. The PM put
this wording to the maintainer, who adopted it with 「其他同意」 — "agreed to the rest".
The sentence below is therefore the PM's drafting carrying the maintainer's decision; it
is quoted exactly and kept untranslated, because the adopted words are the ruling.

> 写时为真的陈述冻结；写下时就已失效的路径按错误改正。这条写进 `docs/requirements/README`，以后不再逐卡吵。

The append-only rule above freezes a **decision**. It does not freeze a path that
named nothing on the day it was typed. Which of the two you are holding is settled
by **two timestamps**, and by nothing else:

| The record's commit, against the change it cites | What the sentence is | Verdict |
| --- | --- | --- |
| Committed **before** the structure it names moved, was renamed, or was deleted | **true when written** — a record of the tree as it then stood | **Freeze.** Editing it rewrites the history the record exists to hold. |
| Committed **after** that change | **already false when written** — it never named anything | **Correct it.** That is a typo, not a record. |

Scope: the requirement records in this directory. What a document that describes a
superseded tree **on purpose** owes is a different question, and is not decided here.

### Deciding it, for any record

1. Find the commit that wrote the sentence — ⛔ not the record's `Raised:` date,
   which is the customer's date and can be weeks earlier:
   `git log --format='%H %cI' -- docs/requirements/NNNN-slug.md`.
2. Ask whether the cited path was in **that commit's own tree**:
   `git ls-tree <that commit> -- <the path the record cites>`. Empty output means
   the path was already gone when the sentence was written ⇒ **correct it**; a hit
   means it still resolved then ⇒ **freeze it**.

A lookup in one commit's tree answers this without walking ancestry, so it is cheap
and it stays correct on the shallow checkout CI hands you. ⛔ Do not reach for
`git log --diff-filter=A -- <path>` there: the parents that would disprove it are
absent, so it names the graft root as the adding commit and reads exactly like a
real answer.

When the verdict is **correct it**: repoint per path, reading each successor off the
tree rather than prefixing mechanically; keep the edit to the stale path and leave
the rest of the record alone; and where one file was split in two with no
same-named successor, name every successor the sentence's point depends on.

### Why an error is not what freezing protects

This file opens by saying what these records are — "the human-or-customer **input**
an AI agent reads before authoring metadata". Freezing keeps the record of what was
true at triage time. A path that resolved to nothing on the day it was written has
no such fact underneath it, so freezing it protects nothing, and it costs something
real: the next agent reads the record as the spec it starts from and is sent to a
directory that does not exist.

### The two worked examples, both in this directory

The ADR-0130 package move (`36b27dd`, 2026-09-14T14:07:19Z) put every authored file
under `src/{package}/{type}/`.

- **[REQ-0001](0001-agency-tier-lead-tagging.md) — frozen.** Every commit that
  touched it predates the move (the latest is `3b72afa`, 2026-08-27), and
  `git ls-tree` at that commit finds the routing-flow directory the record names.
  True when written ⇒ its pre-move path stays exactly as written.
- **[REQ-0002](0002-it-services-project-delivery-and-cost.md) — corrected.** Its
  authoring commit (`9f13c77`, 2026-09-14T14:36:11Z) lands **29 minutes after** the
  move, and `git ls-tree` at that commit finds none of the three paths it cited.
  They were typos the day they were typed, so PR #1942 repointed them.

Same directory, opposite verdicts, and only the timestamps separate them. ⛔ Do not
re-argue this card by card: measure the two, and apply the ruling above.

## How AI agents consume this

A requirement record is the **spec an agent starts from**. The
[`.github/tasks/new-feature.md`](../../.github/tasks/new-feature.md) flow should
reference the record id; the agent reads the disposition to decide *where* the
metadata goes (core `src/` for B, an overlay package for C) before writing any
`*.object.ts`.

## Traceability

- Each record links the changeset(s) / PR(s) / overlay package that implemented it.
- Conversely, a changeset that answers a requirement names its `REQ-NNNN` id, so
  the link is bidirectional.

## Index

| ID | Title | Source | Disposition | Status |
| --- | --- | --- | --- | --- |
| [0001](0001-agency-tier-lead-tagging.md) | Auto-tag leads by agency-tier hierarchy | Example customer | C customer-overlay | Triaged |
| [0002](0002-it-services-project-delivery-and-cost.md) | CRM-to-delivery process: customers, leads, opportunities, project initiation, cost planning, time and cost tracking, reporting | IT-services / software-outsourcing customer | B standard-enhancement (two tracks; C/D items noted) | Triaged |
| [0003](0003-account-registration-category-and-approval.md) | Account registration identifier, a category that gates capability, the business-profile block, and account approval | IT-services / software-outsourcing customer (REQ-0002 Track A) | B standard-enhancement (C items noted) | Triaged |
| [0004](0004-contact-buying-centre-map.md) | A buying-centre map on the contact — role, attitude, relationship strength | IT-services / software-outsourcing customer (REQ-0002 Track A) | B standard-enhancement | Triaged |
| [0005](0005-lead-need-type-value-and-approval.md) | Need type and estimated value on the lead, and an approval gate before conversion | IT-services / software-outsourcing customer (REQ-0002 Track A) | B standard-enhancement | Triaged |
| [0006](0006-opportunity-qualification-and-status-approval.md) | Opportunity qualification fields, the deal narrative block, and approval on status change | IT-services / software-outsourcing customer (REQ-0002 Track A) | B standard-enhancement (C items noted) | Triaged |
