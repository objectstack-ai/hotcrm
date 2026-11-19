---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A person's name is labelled like a Chinese address book, and it leads every contact and lead list (#2685).**

FROM → TO:

- **zh-CN labels, on contacts and leads.** FROM 名 / 姓 / 全名 TO 名字 / 姓氏 / 姓名, the words a phone's address book uses. English, Spanish and Japanese are unchanged, and no help text is added. The Chinese import guide names the required fields the same way.
- **Contact lists and cards.** FROM a First Name column (the link) beside a Last Name column, ordered by last name, and directory cards titled by the last name with the first name beneath, TO one **Full Name** column that opens the contact, ordered by full name, and cards titled by the full name. **Primary Contacts** leads with the full name too, and so does **Lead Calendar**; the other lead lists already did. A record whose first or last name is empty still shows its name and opens from it.
- **Lead conversion onto an existing contact.** FROM comparing the first names and the last names one by one TO comparing the two full names. A contact 欧阳娜娜 (last name 欧阳, first name 娜娜) and a lead entered as last name 欧, first name 阳娜娜 have the same name, so conversion no longer asks to confirm joining them. A different name still asks.
- **Add to Campaign on an opted-out lead.** The refusal FROM naming the lead first name then last name, so a lead entered as last name 张, first name 伟 read 「伟 张」, TO naming it by its full name, 「张伟」, in every language.
