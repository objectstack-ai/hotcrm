---
'hotcrm': patch
---

Name both **Add to Campaign** paths on the campaign members page. Item 2 of
"How members get enrolled" called the lead-side action "the only picker-driven
path that ships", and told the reader to open a lead and run it. Neither half
was true, and neither had gone stale — both were false the day the sentence was
written.

`add_contact_to_campaign` (`src/actions/contact.actions.ts`) is the contact-side
mirror of `create_campaign` on the lead: the same **Add to Campaign** label, the
same `locations: ['list_toolbar', 'list_item']`, and the same field-backed
campaign param, which is what makes the console resolve a real record picker
instead of a paste-the-ID box. It has shipped since #597, the card that also
wired `bulkActions: ['add_contact_to_campaign']` into the contact grid — so
there have always been two picker-driven paths, not one.

Both are list actions. Neither is reachable by opening a record: nothing under
`src/pages/` names either action, so "open a lead … and run **Add to Campaign**"
described a gesture the console does not offer. The page now says what the
console does offer — tick rows in a lead list or a contact list and run the
action from the selection toolbar, or run it on a single row from that row's ⋮
menu, and choose the campaign from the picker.

The dedupe difference is worth a clause, so it gets one. Each action scopes its
skip-check on its own relationship — the lead path compares `crm_lead` values,
the contact path `crm_contact` — so re-running either never double-counts a
touch, while a person enrolled once as a lead and once as a contact is
deliberately two memberships rather than a duplicate. The contact action's
header states that as a deliberate difference, not an oversight.

The true half is kept: there is still no *Add Members* picker on the campaign
that reaches lead and contact list views. `marketing/campaigns` already carried
the truthful version — "the **Add to Campaign** action on any lead/contact" —
and after this change the two marketing pages agree.

zh-Hans names the action as the zh-CN pack does (加入营销活动 — one label for
both actions); zh-Hant mirrors it in that page's own Traditional conventions
(加入行銷活動), never a mechanical conversion.
