---
'hotcrm': patch
---

Give the *Built-in vs personal vs shared* bullet in `guides/search-and-navigation`
examples that exist, in all three locales.

The bullet that teaches what a **built-in** view IS held up two names, and neither
was a view:

- ***All Open Opportunities*** is a splice of two real ones. The opportunity view
  set in `src/views/opportunity.view.ts` ships **Open Deals**
  (`open_opportunities` — the default, pinned tab) and **All Opportunities**
  (`all_opportunities` — the unfiltered book). A reader who went looking for the
  spliced third name found nothing and had no way to tell that the two halves
  were both there under other spellings.
- ***Pending My Approval*** is the phantom PR #969 removed from
  `content/docs/revenue/approvals.mdx` and #960 from
  `getting-started/quick-tour`; this page was its last landing place. The
  approvals plugin ships **My Pending** / **I Submitted** / **Completed** /
  **All** on `sys_approval_request`.

The zh pages were each wrong in their own way, so neither was fixed by
translating the English: zh-Hans said 「待我审批」, which is real but is the
**navigation** label of `nav_approval_requests` rather than a view; zh-Hant said
「待我審核」, which no surface can show at all — this app ships en / zh-CN /
ja-JP / es-ES and no Traditional Chinese pack. Both now name the real views and
quote the zh-CN labels the console actually resolves (「进行中商机」,
「全部商机」, 「我的待办」).

The names were swapped without adding a denial: unlike the approvals page, this
bullet is an *example*, not a navigation roster, so there is no wrong list for a
reader to reconcile. `src/` is untouched.
`test/docs-search-navigation-views.test.ts` pins it from both ends — every
emphasised name in the bullet must be a label some view in this app or its
plugins really carries (bold or italic, since the phantoms were italic), every
「…」 gloss must be a string a locale pack really ships, and the source side pins
**Open Deals** as the default tab, **All Opportunities** as unfiltered,
**My Pending** on the plugin, and the zero-hit status of the two retired names —
so a future release that ships a view by one of them fails a test rather than
making the page accidentally right.
