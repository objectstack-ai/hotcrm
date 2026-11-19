---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Leads, opportunities, accounts and cases open on the platform's standard record page; quote and deal lines are a table in the record's body (#2382).**

FROM → TO for the record page layout:

- **Lead, opportunity, case.** FROM a hand-built page of tabs (Details / Related / Activity, and History on a lead) TO the standard record page: the header with the record's actions, key facts and the status path, the details on the left, a card per kind of linked record on the right, and one **Activity** timeline (comments, logged calls and meetings, field changes). The warning banners stay where they were, under the header: a lead's suspected or confirmed duplicate, a deal waiting on approval, a case past its SLA.
- **Account.** FROM a page with its own header (name, industry and type) and a **Discussion** feed TO the standard record page: the **Activity** card is its timeline, and logged calls and meetings show there.
- **Opportunity.** The side rail of quotes, products and tasks is gone; the deal's **product lines** are a table in the body, under the first section, and its quotes and tasks are cards on the right. **New** on the line table opens the line form, whose product picker offers active products only, as the old **Add** picker did.
- **Quote.** Its **lines** move FROM a card on the right TO a table in the body, with product, quantity, sales price, discount and total, a page at a time.
- **Key facts.** A lead shows Status, Lead Score, Lead Source, Email and Phone; a deal Amount, Close Date, Probability, Owner and Account; a case Status, Priority, SLA Due Date, Owner and Account. None repeats the record's title. The owner of a lead, and a deal's Expected Revenue, are in the details instead.
- **Linked tasks** on a lead, a deal and a case list the open ones only, as **Open Tasks** did. A lead's header still leads with **Qualify Lead**, **Convert Lead** and **Schedule Follow-up**; the call and meeting buttons are under **⋯**.
- A case's status path now shows every status, **Waiting on Support** included, which the old page left out. A case's **Priority Rank** sort key moves into the collapsed **System** section.

Nothing in the data changes. A list of a lead's tasks, events or campaign memberships, or of an account's deals, keeps its columns.
