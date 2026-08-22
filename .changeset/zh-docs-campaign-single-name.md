---
'hotcrm': patch
---

Call `crm_campaign` by one name in the simplified-Chinese docs. The locale pack
ships the object as 「营销活动」 and fourteen zh-Hans pages already used that
word, but the two administration pages called it 「市场活动」 — so the sharing
page named the master one way and the detail directly under it the other, on
adjacent rows of the same table:

```
| 市场活动     | 公共只读             | 营销创建，销售查看                     |
| 营销活动成员 | 由父级控制（市场活动） | 成员关系是市场活动的一个属性 …… |
```

An admin reading that table cannot tell whether 「市场活动」 and 「营销活动成员」
belong to the same object family, and neither word takes them to the right entry
in Setup, where the object is listed as 「营销活动」.

Now every zh-Hans page — the OWD table, the built-in sharing-rules table, the
three profile grants, and the marketing card on the docs home page — uses
「营销活动」, matching the pack and the traditional-Chinese pages (which already
said 「行銷活動」 throughout). No label, no English page and no zh-Hant page
changed; this is a wording fix in the simplified-Chinese documentation only.
