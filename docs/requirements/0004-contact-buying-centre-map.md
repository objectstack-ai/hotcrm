# REQ-0004: A buying-centre map on the contact — role in the decision, attitude to us, relationship strength

- **Status**: Triaged
- **Source**: IT-services / software-outsourcing customer — the same one-sheet spreadsheet handed over on 2026-09-14 and triaged as [REQ-0002](0002-it-services-project-delivery-and-cost.md). This record takes its step **2**.
- **Raised**: 2026-09-14
- **Disposition**: **B standard-enhancement** for `crm_contact`. No **C** item in this record; one noun is **A** (already supported) and is called out below.
- **Traceability**: parent record — [REQ-0002](0002-it-services-project-delivery-and-cost.md); changeset / PR — to be filled in when built.

> **Why this record exists.** REQ-0002's *Product response* rules Track A as: "**B (Track A)** —
> to be filed as REQ-0003 onward, one record per object, each carrying its own
> standard-versus-overlay split." This is that record for `crm_contact`.

## Raw requirement (verbatim)

Step 2 of REQ-0002's table, reproduced from that record **without change** — the customer's own
wording and punctuation. ⛔ Not normalised, ⛔ not translated.

| 业务环节 | # | 业务步骤 | 操作岗位 | 操作人 | 责任人 | 系统路径 | 备注说明 |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 客户管理 | 2 | 客户联系人信息维护 | 销售岗 | 销售人员 | 销售负责人 | CRM→客户管理→客户详情→联系人维护 | 维护联系人姓名、性别、部门、职务、角色、对我司态度、与销售关系强度、联系方式等信息。 |

## Standard product analysis

Measured on `main` (`9f13c77`) with
`grep -oE "^    [a-z_]+: Field\.[a-zA-Z]+" src/sales/objects/contact.object.ts`: `crm_contact`
declares **23 fields**. The roster stays in the metadata and is ⛔ not transcribed here; what
follows names only the fields this step turns on.

Read the step's noun list against the object and it splits cleanly in two.

**Already there.** 姓名 — `salutation` + `first_name` + `last_name`, with the `full_name`
formula as the record title. 部门 — `department`, a select. 职务 — `title`. 联系方式 — `email`,
`phone`, `mobile` and the structured `mailing_*` block. The record also already carries
`crm_account` as a master-detail parent, so every contact is anchored to the account whose
buying centre it belongs to, plus `is_primary`, `do_not_call` / `email_opt_out` and
`last_contacted_date`.

**Missing — all three of the attributes that make this a map rather than a directory.**

1. **角色 — the person's role in the purchase decision.** Nothing on the object says whether
   this person decides, pays, uses, evaluates, or merely opens the door. `title` is the
   employer's job title, which is not the same fact: a "部门经理" may be the decision maker on
   one deal and a blocker on the next, and `is_primary` is a single flag about who we call,
   not a role.
2. **对我司态度 — their stance toward us.** No field. Nothing in the app records whether a
   named individual is a champion, neutral, or hostile.
3. **与销售关系强度 — the strength of the relationship with our salesperson.** No field. The
   closest existing signal, `last_contacted_date`, is *recency*, which is machine-derived and
   a different fact: a weekly call with someone who will not take our side is not a strong
   relationship.

One noun lands as **A**: 性别. The standard product records `salutation`, which is what
correspondence and the UI actually need, and it is already there. No demographic attribute
enters core for this. **Re-triage trigger → B:** a customer with a concrete, stated processing
purpose for the attribute itself rather than for addressing.

## Disposition & rationale

**B — standard enhancement.** These three are the **buying centre**, one of the oldest and most
portable primitives in B2B selling: any deal above a single-signature purchase is decided by
several people with different roles, different stances and different relationships to the
seller. The shape is the customer's *process-independent* part, unlike the IT-services
vocabulary elsewhere in REQ-0002:

- It is **not** one company's org chart. The customer names no specific role titles in this
  step — 角色 is an abstract slot, and core fills it with generic values (decision maker,
  economic buyer, technical evaluator, user, influencer, gatekeeper) that every industry reads
  the same way. Contrast REQ-0002's **C** list, quoted verbatim: "the signing-entity list
  (软通签约主体), the revenue-recognition vocabulary, the US EAR flag, and the '铁三角' role
  model — one company's org and compliance shape." **铁三角 is a role model on the deal team
  (our side); this record's 角色 is a role in the customer's buying centre (their side).** They
  are different facts on different objects, and the C verdict on the first does not reach the
  second.
- HotCRM already leans on it implicitly and cannot express it. `is_primary` is a degenerate
  one-bit answer to "who matters here"; an opportunity has a `primary_contact` lookup and no
  way to say what the other contacts do. Every downstream ask on top of this — stakeholder
  coverage on a deal, a "no champion identified" risk signal, a relationship-map view — is
  blocked on the three attributes not existing.
- **Coverage, not gating.** These are sales intelligence, not a control: ⛔ nothing here should
  refuse a write. A missing champion is a warning at most (AGENTS.md metadata semantics rule
  8 — a machine signal warns and lets the write through).

**No C in this record.** Nothing in step 2 is specific to this customer; the whole step is the
generic buying-centre shape.

## Product response

**B — the standard metadata to add under `src/sales/`.**

- `src/sales/objects/contact.object.ts` — three selects, generic option sets, in their own
  `fieldGroups` entry (a "Buying centre" / decision-map group) so the form layout stays
  **derived** and no `record:details` section has to be authored:
  - **role in the buying centre** — a select; multi-select is a decision for the implementing
    PR, since one person can be both evaluator and user (`Field.select({ multiple: true })` if
    so);
  - **attitude toward us** — an ordered select (e.g. champion → supportive → neutral →
    skeptical → blocker);
  - **relationship strength** — an ordered select; ⛔ not a free-text score and ⛔ not derived
    from `last_contacted_date`, which measures something else.
- Option values are authored English-first in the shared picklist style
  (`src/sales/objects/_picklists.ts` is where the canonical sets already live) and translated
  in all four locale packs `src/sales/translations/{en,zh-CN,es-ES,ja-JP}.ts` — label,
  every option label — per the constraint checklist.
- A user-facing page under `content/docs/` explaining the buying-centre concept to sales users
  — business concepts, ⛔ never a hand-copied field roster.
- Nothing else changes: no hook, no flow, no validation. These fields are read by people and by
  later reporting, not by a gate.

**A** — 性别: `salutation` already covers the addressing need; no change.

**Not in this record** — steps 1 / 3 / 4 / 5 are
[REQ-0003](0003-account-registration-category-and-approval.md), steps 6–7 are
[REQ-0005](0005-lead-need-type-value-and-approval.md), steps 8–14 are
[REQ-0006](0006-opportunity-qualification-and-status-approval.md), steps 15–40 are REQ-0002's
Track B.

## Acceptance

This record is satisfied when, on a HotCRM install with no overlay:

1. A contact form shows a buying-centre group carrying role, attitude and relationship
   strength, rendered from `fieldGroups` with no per-field enumeration authored anywhere.
2. The three fields are filterable and groupable in a contact list view — an account's contacts
   can be read as a map ("who decides, who is on our side") rather than a directory.
3. Every option label resolves in all four locale packs; the zh-CN wording is the pack's, ⛔ not
   coined afresh in the doc page.
4. No write is refused by any of the three fields — a contact with all three blank saves
   exactly as it does today.
5. `pnpm verify` green and one changeset naming `REQ-0004`.
