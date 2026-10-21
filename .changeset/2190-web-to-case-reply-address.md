---
'hotcrm': patch
---

The public support form now asks who is writing in, so the agent who gets the case can answer them

A case from the public support form (`/forms/support`) used to carry no way to reach the person who sent it. The
form asked only for a subject, a description, a case type and a priority, and a case has no account or contact
when an anonymous visitor raises it, so the agent it was routed to had nobody to reply to.

- **The form now asks for the visitor's name and email.** The email is required: the form will not send without
  it, and the server refuses a submission that leaves it out (`400 VALIDATION_FAILED`, on `supplied_email`). The
  name is optional.
- **The case keeps them as Supplied Name and Supplied Email.** They sit beside **Contact** in the case's *Case
  Information* section, on the case form and in the **All Cases** and **Unassigned — triage** lists. The email is a
  mail link, so the agent can reply from the case. Both labels are translated into Chinese, Spanish and Japanese.
- **They are what the visitor typed, and nothing more.** The app never links the case to a contact or an account
  because the email matches one: an anonymous address is not verified. The agent links the case to the right
  contact after checking who wrote in.
- **Nothing else a visitor can set has changed.** The form still cannot set the case's contact, account, owner,
  status, escalation, resolution or internal notes.
- **Cases your team raises are unchanged.** Both fields are optional there, and an agent can fill them in or
  correct them on the case.
