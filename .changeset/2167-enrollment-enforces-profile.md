---
'hotcrm': minor
---

Only people allowed to create campaign members can enroll anyone in a campaign

**Who can enroll now.** Enroll Members on a campaign, and Add to Campaign on the lead and contact
lists, now write as the person who runs them, so that person's own permission to create campaign
members decides. Marketing User and the administrators enroll as before. Sales Rep and Sales Manager,
whose profiles have always said that enrollment belongs to marketing, are no longer offered Enroll
Members or Add to Campaign, and a request that reaches the server anyway is refused. Until now two
elevated paths let them enroll all the same.

Mark Responded works the same way: it records the response as the person who presses it. It is
offered to the users who may edit campaign members (Marketing User and the administrators), and a
sales rep or manager is refused.

**What Enroll Members says.** A run in which anyone was refused used to report success. It now ends
with a refusal that gives both counts: *"Enrollment refused for 4 of the people selected: 0 enrolled,
4 refused."* A clean run ends with *"Eligible members enrolled in campaign."* A refused person is not
added to the campaign.

**What Add to Campaign answers.** From the selection toolbar it asks for the campaign once, lists the
people you ticked, then enrolls each of them on their own and reports *Succeeded* with a count. From a
row's menu it shows *"Leads added to campaign!"* or *"Contacts added to campaign!"*. A person already on
the campaign is skipped and still counts as a success. A campaign id that names no campaign is now
refused, where it used to write a member that pointed at nothing.

**For API callers**, the two Add to Campaign actions and Mark Responded change shape:

- `POST /api/v1/actions/crm_lead/create_campaign` and `POST /api/v1/actions/crm_contact/add_contact_to_campaign`:
  the campaign was sent as `params.crm_campaign` and is now sent as `params.campaignId`; the old key
  is refused with 400 as an unknown param. The answer was `{ campaignId, count, skipped, ids }` and is
  now the flow's result, `{ success, output: { enrolled } }`, where `enrolled` is `false` for a person
  already on the campaign. A caller who may not create campaign members gets 400 `FLOW_FAILED`.
- `POST /api/v1/actions/crm_campaign_member/mark_responded`: the answer was `{ id, status, response_date }`
  and is now the updated member (`{ operation: 'update', object, id, record }`). A caller who may not
  edit the member gets 403 `PERMISSION_DENIED`.

*Campaign Members*, *Profiles*, *Automation*, *Leads*, *Email & Calendar* and *API reference* describe
the new behaviour in all three languages.
