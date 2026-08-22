---
'hotcrm': patch
---

The Chinese sales pages now name lead statuses, the quote expiry date, the
reports-to field and every field-group heading the way the shipped locale pack
does.

`src/translations/zh-CN.ts` is what a Chinese reader sees on screen, and four
pages had drifted from it. Each of these sent a reader looking for a word the
product never displays:

- **Lead statuses.** `crm_lead.status` ships 「已确认 / 未通过 / 已转化」; the Leads
  pages called them 「已审核 / 不合格 / 已转换」 — in the status table and in every
  sentence downstream of it (the reopen note, the duplicate-handling step on the
  Traditional page, the conversion section heading and its steps, the rep tip).
  All of them now follow the pack, on both zh-Hans and zh-Hant.
- **The convert vocabulary.** `convert_lead` is 「转化线索」 and `is_converted` is
  「已转化」, so the pages' 「转换」 spelling disagreed with the button the reader
  clicks — and with the same page's own conversion block, which already said
  转化. The verb face is now 转化 throughout.
- **`expiration_date`.** The Simplified quotes page called it 「过期日期」 in four
  places while the pack says 「到期日期」 — and the same page already used 到期日期
  in three others, so it contradicted itself. The Traditional twin was correct
  throughout; neither page can be used as the other's proofreading baseline.
- **The `expired` quote status** on the Traditional sales index, which said
  「已到期」 where the pack says 「已過期」 — the same word fixed on the quotes page
  earlier, on a page that fix did not cover.
- **`reports_to`.** The contacts pages' prose still called it 「汇报对象」 after the
  field-group tables were corrected to the pack's 「直属上级」, leaving each page
  disagreeing with itself two screens apart.
- **Field-group headings.** The block tables on the Leads and Contacts pages are
  the objects' field groups, whose Chinese headings live in each object's
  `_sections`. Rows that translated the English heading independently now use
  the shipped one: 身份 → 身份信息, 联系信息 → 联系方式, 资格审核 → 资格评估,
  转换 → 转化, 客户与角色 → 客户与职务, and 指派 → 分配 on the Traditional leads
  page.

Verb and mechanism usages are deliberately untouched, because they are not
labels: 「报价到期」 names the nightly mechanism, 「每日过期扫描」 the sweep,
「即过期的报价」 and 「通过资格审核」 are actions a person takes, not the
`qualification` field group.

Terms belonging to a different object keep that object's wording — the pack
gives `crm_lead._sections.qualification` 「资格评估」 and `crm_opportunity.stage`
「资格审查」 on purpose, so same-named things are not unified across objects.

Documentation only: the locale pack is the contract, so nothing under `src/`
changed.

Fixes #801.
