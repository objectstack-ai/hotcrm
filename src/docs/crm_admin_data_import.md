---
title: Importing Data — Order, Matching & Refusals
description: The order to import accounts, contacts and leads in, how a row is matched to a record that already exists, and the refusals an import can meet.
order: 3
# sources: the import mappings and integrity rules this doc describes. Build
# ignores unknown frontmatter keys.
sources:
  - mapping:crm_account_import
  - mapping:crm_contact_import
  - mapping:crm_lead_import
  - object:crm_account
  - object:crm_contact
  - object:crm_lead
---

# Importing Data — Order, Matching & Refusals

For the administrator loading an existing customer base into HotCRM. This page
covers what HotCRM does with your rows; the file templates and the step-by-step
import screens are in the product documentation's import guide.

## Import in this order

1. **Accounts** first.
2. **Contacts** next: every contact names its account, and the account must
   already exist.
3. **Leads** last.

Open **Import** on the **Accounts**, **Contacts** or **Leads** list and upload
your file. When its columns are the ones HotCRM's template uses, the wizard
picks the saved mapping HotCRM ships for that object, such as
**Account Import (CSV)**: it knows the column headings and translates the
values other systems use, so there is nothing to map by hand. On the last step,
**Validate data** checks every row and writes nothing; import only once it is
clean.

An import can be undone from **History** in the same dialog. Undo in the
reverse order (leads, then contacts, then accounts), so no contact is left
pointing at an account that is gone.

## A row updates the record it matches

Each saved mapping matches a row to an existing record by a business key:

| Object | Matched on | What that means |
|---|---|---|
| **Account** | **Account Name** | A row naming an account that already exists updates it. Account names are unique within your organization. |
| **Contact** | **Email** | A row whose email already belongs to a contact updates that contact, including the account it sits under. One email address belongs to one contact in your organization. |
| **Lead** | **Email** | A row whose email already belongs to a lead updates that lead. |

So re-running a corrected file updates rather than duplicates. It also means
a row is matched to a record you did not mean: if the demo company is still
in place, a real account that shares a demo account's name updates the demo
record. Clear the demo records first; see the
[Go-Live Checklist](./crm_admin_setup.md).

## Leads that repeat someone you know

A lead is never refused for repeating an email address. An import row whose
email matches an existing lead updates that lead, as above. When a new lead's
email belongs to a contact instead (or, for a lead created by hand or by a web
form, to an older lead), the lead is still created, and HotCRM sets its
**Duplicate Status** to **Suspected** and links it to that record: a contact
wins over a lead, and the oldest lead over newer ones. Review them in the **Suspected Duplicates** tab on **Leads**. A person
sets **Confirmed** after checking that the two are the same; nothing is merged
or deleted on its own.

## Owners

Each file can carry an owner column holding a user's email address.

- An address that matches a user makes that user the owner.
- An address that matches no user fails the row. Nothing is guessed: invite
  the user first, or clear the cell.
- A blank owner makes **you**, the person running the import, the owner. This
  holds for leads too: imported leads are not spread across the sales reps the
  way a web-form lead is. Reassign them after the import if they should be.

## Common refusals

A refused row names its row number and the field, so you can fix the file
and run it again. The ones you will meet most:

- **A required value is missing** — for example a contact without its first
  name, last name, email or account.
- **A value is not one of the options** — picklists take HotCRM's own labels or
  codes, in any letter case, plus the common words other systems use. Anything
  still unknown fails the row rather than being dropped.
- **A reference matches nothing** — an account name on a contact, or an owner
  email, that names no existing record.
- **A website is not a full address** — write it with `https://`.

Business rules run during an import exactly as they do on a save: a new lead
gets its follow-up deadline, and a row that breaks a rule the app enforces is
refused with that rule's own message.
