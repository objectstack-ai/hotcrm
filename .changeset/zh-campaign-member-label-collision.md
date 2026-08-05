---
'hotcrm': patch
---

Rename the Chinese label of `crm_campaign_member` from 「活动成员」 to
「营销活动成员」, so a marketing object stops reading as part of the calendar
family.

Chinese translates both *campaign* and *event* with a word built on 活动, and the
zh-CN pack had resolved that collision for three of the four objects but not the
fourth:

| object | master | zh-CN label (before) | after |
| --- | --- | --- | --- |
| `crm_campaign` | — | 营销活动 | unchanged |
| `crm_campaign_member` | `crm_campaign` | **活动成员** | **营销活动成员** |
| `crm_event` | — | 活动 | unchanged |
| `crm_event_attendee` | `crm_event` | 活动参与者 | unchanged |

Dropping 「营销」 left a member object whose master is a campaign sharing a name
space with the event tree. A Chinese user reading the navigation, a list header
or the Org-Wide Defaults table saw 活动 / 活动成员 / 活动参与者 and took the three
for one family — meeting, its members, its attendees — when 活动成员 belongs to
the other tree entirely. On the Org-Wide Defaults page the three rows are
adjacent, and only the parent object in parentheses said otherwise.

The English labels (`Campaign Member` / `Event` / `Event Attendee`) never had the
collision and are untouched, as are es-ES (`Miembro de Campaña` vs `Evento`) and
ja-JP (`キャンペーンメンバー` vs `イベント`), which were checked and are clear.

The zh-Hans and zh-Hant documentation pages translate object labels themselves
rather than reusing the locale pack, so they carry the same rename: 营销活动成员
and 行銷活動成員 respectively, in the Org-Wide Defaults table, the profile grant
lists, the automation examples and the Marketing Cloud pages.
