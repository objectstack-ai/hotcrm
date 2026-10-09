---
'hotcrm': patch
---

The account page header shows the account's name, and the demo accounts can be edited

- **The header shows the account's name.** In English, the record page title
  read "Account Detail" (the page's label) on every account. The English
  language pack carried no header title for that page, so the platform used
  the page label in its place. The pack now carries it, as the Chinese,
  Spanish and Japanese packs already did.
- **The nine demo accounts are no longer locked.** The platform loads demo
  rows without running automation, so these accounts never entered the
  account approval flow. They still took the field's default, **Pending**, so
  each one showed "Locked for approval", Edit was disabled, and **Recall
  approval** found nothing to recall. The demo rows now arrive as **Approved**,
  which is the state of an established account. An account a user creates
  still starts at **Pending** and enters the approval flow, as before.
- **The accounts guide describes the tabs that are really there.** The
  *Account detail layout* section, in English and both Chinese versions, listed
  seven tabs the record page does not have. It now describes **Details**,
  **Related** and **Attachments**, the **Approvals** tab that an account
  shows once it has been through approval, and the **Discussion** feed below
  the tabs.
