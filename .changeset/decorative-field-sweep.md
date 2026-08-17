---
'hotcrm': minor
---

Enforce-or-remove, decided per field: nine inert fields are gone, and the
account hierarchy is now a real roll-up.

A consumer scan found ten declared fields that nothing in the product read or
wrote. Each got its own verdict rather than one verdict for the batch. The
common thread in the nine removals is that none of them looked absent — they
looked wired, which is the shape that misleads the next author into building on
them.

**Removed from `crm_product`:**

- **Quantity on Hand** and **Reorder Point**, with the **Low Stock** list view
  and its **Low Stock** tab. Nothing ever decremented stock, and the view was
  not the report it looked like: its filter compared quantity against a
  hardcoded `10` rather than each product's own reorder point. HotCRM sells from
  a catalog; stock belongs to the fulfilment system that owns it.
- **Taxable**. No quote or line item ever consulted it —
  `crm_quote_line_item.tax_rate` defaults to `0` and is typed per line — so
  clearing the flag on a zero-rated product changed no total anywhere.
- **Billing Type** and **Unit of Measure**, and the seeded values on all 13
  demo products. The docs said billing type "drives how the quote calculates
  totals"; no quote total, revenue report or line-item behaviour ever read it.

**Removed elsewhere:**

- `crm_case.customer_signature` — a signature pad on the resolution form that
  no close-case step, SLA measure or export ever read back.
- `crm_case.parent_case` — a case hierarchy nothing traversed: no rollup, no
  cascading close, no related-case handling.
- `crm_task.estimated_hours` / `actual_hours` — no rollup summed them, no
  variance report compared them, nothing warned when actual overran estimate.
- `crm_contact.reports_to` — the org chart the contact docs described as "a
  clickable tree on the account detail page" that the Copilot "uses when
  summarising the account". Neither existed: no page rendered it and no skill
  read it.
- `crm_contact.birthdate` — importable, read by nothing. Personal data held for
  no stated purpose is a liability rather than a feature.
- `crm_campaign.parent_campaign` — campaign hierarchy, mentioned in no doc and
  read by nothing. Its honest consumer would be a rolled-up ROI, which cannot
  be one declaration: `roi` is a formula over each campaign's own cost and
  revenue, so a hierarchy ROI would put two differently-scoped ROI numbers on
  one record.

**Kept and enforced — `crm_account.parent_account`:**

The hierarchy stays, and now does something. `crm_account` gains **Child Account
Revenue** (`child_account_revenue`), a roll-up of the **Annual Revenue** of an
account's **direct** children, maintained by the platform: it moves when a
child's revenue is edited, when a child is re-parented, and when a child is
deleted. This is the roll-up the accounts documentation already promised and
never had. It is one level deep — a grandparent totals its own children, not the
whole tree — and it is on the account form's **Financials** section.

**Migration — what changes for users:**

- **Product → Low Stock** view and tab are gone, as are the *Inventory
  tracking*, *Billing types* and *Units of measure* sections of the product
  documentation. Values previously stored in the five removed product fields are
  dropped with the columns; export them first if your org typed anything into
  them by hand.
- The **contact import template** no longer accepts a `Birthdate` column. A file
  that still carries one will have that column ignored — re-cut your template
  from *Guides → Importing your data*. The **account** template is unchanged and
  still carries `Parent Account`.
- The case form loses **Parent Case** (SLA tab) and **Customer Signature**
  (Resolution tab); the task form loses **Estimated Hours** and **Actual
  Hours**; the contact form loses **Reports To** and **Birthday**; the campaign
  form loses **Parent Campaign**. Any values held in those columns are dropped
  with them.
- Accounts gain a read-only **Child Account Revenue** on the *Financials*
  section. It is computed, not typed, and is blank (zero) for an account with no
  children.
- The account hierarchy still does **not** cascade sharing — it never did, and
  the accounts page said otherwise until now. Use the sharing rules under
  *Administration → Sharing* for that.

Authorized by the maintainer ruling of 2026-08-17, 「逐个 enforce-or-remove
（推荐）」: a declared-but-unenforced field ends the card either genuinely
enforced or genuinely gone.
