---
'hotcrm': patch
---

Sales docs: rewrite the lead / contact "what a record stores" tables against the
objects' field groups, and describe the new-contact prompt as the owner
notification it is.

The block tables at the top of the Leads and Contacts pages (and their zh-Hans /
zh-Hant siblings) claimed a field layout the objects never declared, so a reader
went hunting in the wrong section — or for a field that does not exist:

- **Leads** listed a *tags* field. `crm_lead` has no such field; it is removed,
  the same ghost-field class fixed in the previous pass. Annual revenue, number
  of employees and website were listed under **Company Information**; the first
  two are declared in `additional` and the third in `contact_info`, so all three
  rows move. `crm_lead` declares **10** field groups, not the 9 the page
  counted: the whole **Duplicate Management** group was missing from the table
  even though the same page teaches you how to work duplicates further down, and
  it is now a row of its own.
- The lead intro no longer says the *detail screen* has these collapsible
  sections. `crm_lead` is the one object with an authored record page, and its
  Details tab curates five sections of its own — so the table is now stated for
  what it is, the record's declared field groups, rather than as a map of a
  screen that groups them differently.
- **Contacts** put the primary-contact flag under **Account & Role** and
  reports-to under **Additional Info**; `is_primary` is declared in
  `preferences` and `reports_to` in `account_info`. The contact owner, the
  profile picture and the last-contacted date were absent from the table
  entirely, and the mailing address row now names the five fields it holds.
- The **Built-in rules** section promised a *contact_welcome* email template
  sent to the new contact. Nothing of the sort ships: `contact_welcome` is the
  name of a record-change flow and of its notification topic, the notification
  goes to the contact's **owner** on the inbox and by email ("Reach out to
  welcome them"), and it is skipped entirely for a contact with no owner — the
  seeded and integration-written records — or with *Email Opt Out* ticked. The
  admin tip pointing at "email-template settings" for the same non-existent
  template is corrected with it and now names `src/flows/contact-welcome.flow.ts`.

Documentation only; no metadata, behaviour or field changes.
