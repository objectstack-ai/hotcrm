---
'hotcrm': minor
---

Campaign members can now be **contacts**, campaign metrics recompute **live**, and the engagement-tracker fields nothing could ever write are **removed**.

`crm_campaign_member` was the app's clearest case of metadata promising a
capability the product does not have. It declared a seven-value engagement
lifecycle — `sent → opened → clicked → responded → converted`, with `bounced`
beside it — plus `first_opened_date` and `first_clicked_date` stamps. Exactly one
of those values had a writer: the enrollment flow stamps `sent`. Nothing on the
platform can produce the rest. `@objectstack/plugin-email` is transport-pluggable
**outbound** delivery (`sys_email.status` is `queued | sent | failed`); there is
no open/click webhook, no bounce ingestion and no tracking pixel anywhere in the
installed runtime, so a marketing team reading this object was being shown
engagement tracking that could never populate.

Three things changed together, because they are one contract.

**The trim.** `first_opened_date`, `first_clicked_date` and the
`opened`/`clicked`/`bounced` statuses are gone, along with their entries in all
four locale packs — ADR-0049's enforce-or-remove spirit rather than wiring a
tracker the platform has no engine for. They come back the day a real tracking
integration exists to write them.

**The writers.** Every value that survived now has one that actually runs:

| field / value | writer |
| --- | --- |
| `status: sent` | the enrollment flow, `create_campaign` (leads), `add_contact_to_campaign` (contacts) |
| `status: responded` | the new **Mark Responded** action on a campaign member |
| `status: converted` | `campaign_lead_conversion_refresh`, when the member's lead converts |
| `status: unsubscribed` | a rep on the member row — and it now round-trips |
| `response_date`, `has_responded` | the action, kept in lockstep by `campaign_member_lifecycle` on every write path |

Unsubscribing a member syncs `email_opt_out` back to that person's lead or
contact. The app already honoured that flag in two places — the enrollment
filter and the Send Email action — while nothing ever set it, so an unsubscribed
person stayed enrollable by the very next campaign.

**Contacts as members.** The enrollment flow gained a member-source choice
(leads by qualification status, contacts by department) and the contact list
gained an **Add to Campaign** selection action, mirroring the lead path. Until
now `crm_campaign_member.crm_contact` was a lookup no writer populated, so
campaigns could only ever reach leads — never the existing customer base.

**Live metrics.** The completion-time snapshot is gone. Four triggers — a
membership change, an opportunity's campaign attribution changing, a lead
converting, and the campaign's own status moving — each recompute the whole
metric block. Previously the only writer fired on the transition into
`completed`, so every metric on every running campaign read 0 and
`response_rate` rendered 0%, becoming accurate on the day the campaign ended and
nobody was looking. `budgeted_cost` / `actual_cost` also moved into a form
section of their own beside `roi`, which divides by `actual_cost`: they are
manual-entry by design, and a manual field buried at the end of a seven-field
row is a field nobody fills in.

Fixes #597.
