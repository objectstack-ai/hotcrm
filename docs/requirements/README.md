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
