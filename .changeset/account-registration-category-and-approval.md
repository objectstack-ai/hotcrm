---
'hotcrm': minor
---

An account now records **who it is on paper**, **what it spends**, **what it may be sold**,
and **whether it has been signed off**. Six new fields on `crm_account`, a new **Business
Profile** section, a capability gate on new opportunities, and an account approval flow
(REQ-0003 — the `crm_account` half of REQ-0002's steps 1, 3, 4 and 5).

**Registration Number.** The counterparty's registered identity as issued by its own
government registry. Until now nothing on the account carried one: `Account Number` is a
sequence *we* issue and already spends itself as half the record title, so invoicing,
credit checks and entity resolution had no key to work from. The field is deliberately
country-neutral — the requirement arrived as 社会信用代码 because that customer registers
in China, but a Japanese install writes 法人番号 here, a German one a
Handelsregisternummer and a US one an EIN, and a field named after one country's registry
could not be renamed by any of them. It is searchable, so the value is findable from
global search and the lookup picker.

**Commercial Capability, and the gate that reads it.** Some counterparties are payable but
not sellable — tender agencies, resellers-of-record, intra-group billing entities, dormant
accounts. An account set to *Settlement Only* stays fully usable for invoicing, payments
and collections, but **a new opportunity can no longer be opened against it**: the save is
refused, naming the account and the remedy. The restriction is a **transition gate, not an
invariant** — opportunities that already point at the account keep working and keep being
editable, including after someone reclassifies it, and only the new link is refused. The
gate sits beside `Account Type` rather than inside it, because type is a relationship
stage that the system itself advances (a won deal promotes an account to *Customer*), and
a restriction that a won deal could silently overwrite would not be a restriction.

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

Ships in all four locale packs (en, zh-CN, es-ES, ja-JP), with the account, automation and
approval documentation updated in English, Simplified and Traditional Chinese.
