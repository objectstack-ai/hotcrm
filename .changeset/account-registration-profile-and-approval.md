---
'hotcrm': minor
---

An account now records **who it is on paper**, **what it spends**, and **whether it has
been signed off**. Five new optional fields and one new gated field on `crm_account`, a
new **Business Profile** section, and an account approval flow (REQ-0003, the
`crm_account` half of REQ-0002's steps 1, 3, 4 and 5).

**Registration Number.** The counterparty's registered identity as issued by its own
government registry. Until now nothing on the account carried one: `Account Number` is a
sequence *we* issue and already spends itself as half the record title, so invoicing,
credit checks and entity resolution had no key to work from. The field is deliberately
country-neutral — the requirement arrived as 社会信用代码 because that customer registers
in China, but a Japanese install writes 法人番号 here, a German one a
Handelsregisternummer and a US one an EIN, and a field named after one country's registry
could not be renamed by any of them. It is searchable, so the value is findable from
global search and the lookup picker.

**Business Profile** — **Incumbent Vendor**, **Annual Purchasing Budget** and **Payment
Cycle**, in their own new section. Generic B2B sales intelligence: who holds the account
today, how much there is to win this year, and how they pay. The existing `Annual Revenue`
answers none of the three — it is what the counterparty *earns*, not what it will *spend*
with vendors.

**Approval Status**, and the **Account Approval** flow behind it. A newly created account
now starts at *Pending*, appears in the approval inbox HotCRM already mounts, and reaches
*Approved* only through a decision on that request. The shape is the one
`crm_opportunity.approval_status` already uses — `readonly`, with a real field-level
default — and not a second boolean beside `Active`, which answers a different question
("is this account live at all", rather than "has this record been signed off"). An install
that wants no account sign-off changes that one default to *Approved*, whereupon the flow's
start condition is false for every record and the gate is off but still switchable.

**Commercial Capability** ships as metadata only and **gates nothing yet.** The field
records whether new business may be opened against an account (*Full* / *Settlement Only*),
which is the primitive REQ-0003 cares most about — some counterparties are payable but not
sellable. The rule that was to enforce it cannot currently be authored: it was specified as
a `validations[]` entry on `crm_opportunity` reading its account's category, and a
validation predicate can read only the opportunity's own stored columns. Until that is
resolved the value classifies and does not restrict, and the field is documented as such
rather than shipped as a promise the product does not keep.

Ships in all four locale packs (en, zh-CN, es-ES, ja-JP).
