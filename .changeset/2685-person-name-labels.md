---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A person's name is labelled like a Chinese address book, leads every contact and lead list, and is stored on the lead (#2685).**

FROM → TO:

- **zh-CN labels, on contacts and leads.** FROM 名 / 姓 / 全名 TO 名字 / 姓氏 / 姓名, the words a phone's address book uses. English, Spanish and Japanese are unchanged, and no help text is added.
- **Contact lists and cards.** FROM a First Name column (the link) beside a Last Name column, ordered by last name, and directory cards titled by the last name with the first name beneath, TO one **Full Name** column that opens the contact, ordered by full name, and cards titled by the full name. **Primary Contacts** leads with the full name too, and so does **Lead Calendar**; the other lead lists already did. A record whose first or last name is empty still shows its name and opens from it.
- **A lead's Full Name.** FROM a formula computed when it is read and stored nowhere TO a stored field computed on every save, as on a contact, so lead lists sort by it and search matches it.
- **Lead conversion onto an existing contact.** FROM comparing the first names and the last names one by one TO comparing the two full names. A contact 欧阳娜娜 (last name 欧阳, first name 娜娜) and a lead entered as last name 欧, first name 阳娜娜 have the same name, so conversion no longer asks to confirm joining them. A different name still asks.

**Upgrading an existing database.** The lead's Full Name is a new column, and rows saved before this release hold no value until they are next saved: on such a database the lead lists show an empty name, and the boot log names the field. Fill every row with the platform's migration, after a dry run:

```bash
os migrate stored-expressions --object crm_lead --field full_name            # dry run: counts the rows
os migrate stored-expressions --object crm_lead --field full_name --apply    # fills them
```

It is rerunnable and only writes rows that still hold no value. A new database needs nothing.
