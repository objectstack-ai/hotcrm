# REQ-0001: Auto-tag leads by the customer's agency-tier hierarchy

> **Illustrative example** — a worked sample showing the record format and the
> disposition framework. Replace or delete it when the first real requirement lands.

- **Status**: Triaged
- **Source**: Example customer — mid-market manufacturer
- **Raised**: 2026-06-21
- **Disposition**: C customer-overlay
- **Traceability**: (example) overlay package `hotcrm-ext-acme` — not yet built

## Raw requirement (verbatim)

> 我们所有线索都来自代理商，代理商分 8 个等级（S/A/B/C/D/E/F/观察）。线索进来要按
> 来源代理商的等级自动打标；S/A 级线索自动分配给大客户销售组，其它按区域轮询。

## Standard product analysis

HotCRM core has `crm_lead` with owner assignment driven by a routing flow
(`src/flows/*`). It has **no** concept of an "agency tier" — that 8-level taxonomy
is **this customer's partner-org structure**, not a general CRM primitive. Core
already supports region / round-robin routing.

## Disposition & rationale

**C — customer-specific.** The 8-tier agency taxonomy and the S/A → key-account
routing rule encode one customer's go-to-market structure. Baking an 8-level enum
and a bespoke routing branch into core `crm_lead` would impose one customer's
model on every other install.

**Re-triage trigger → B:** if multiple customers ask for configurable
lead-tiering, promote a *generic* `lead_tier` picklist + a configurable routing
rule into core, and retire this overlay.

## Product response

Author a customer overlay / extension package on top of HotCRM — do **not** edit core:

- Extend `crm_lead` with an overlay field `agency_tier` (select) via the
  customization overlay (framework ADR-0005), not a core schema edit.
- Add an overlay flow that sets `agency_tier` from the source agency and routes
  S/A tiers to the key-account group.
- Ship it as its own `packageId` so it coexists with HotCRM (framework ADR-0048)
  and leaves base metadata protected (framework ADR-0010).

## Acceptance

In a HotCRM instance with the overlay installed: importing a lead from an S-tier
agency sets `agency_tier = S` and assigns the key-account group; a C-tier lead
falls through to regional round-robin. Core HotCRM (without the overlay) is
unchanged.
