---
"hotcrm": patch
---

**The Convert Lead screen now says which account the lead will join, before you submit.** It used to ask only **Create Opportunity?** (是否创建商机？ in Simplified Chinese) and then matched an account by the lead's company in silence. Now the screen names the existing account the lead will join, by that account's own name, or says that no account you can see matches and that converting creates a new account named after the lead's company. It reads in every shipped language. If the account is not the one you expected, cancel, correct the lead's **Company**, and convert again.

The match is still the same normalized company-name match, and it still only looks at accounts you can see. An account owned by a colleague and not shared with you is never matched, and the screen now tells you a new account will be created. If that account has exactly the same name, the conversion is refused as a duplicate record and nothing is created, as before. If its name differs only in capitalisation or spacing, a second account is created, as before. Ask the account's owner or an administrator to share it with you before converting.

The match now happens when the screen opens, and the conversion acts on that match. If the named account is deleted while the screen is open, the conversion is refused and nothing is created. Before, a new account the screen had never mentioned was created instead.

**Add to Campaign on a contact is declared on each row's ⋮ menu only.** It also carried a list-header placement. That header button never appeared, because the action is offered only for a contact who has not opted out of email, and a list header has no contact. The placement is gone so that a later change to that rule cannot bring the header button back. On **All Contacts** you still tick rows and run it from the selection toolbar.
