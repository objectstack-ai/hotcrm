---
'hotcrm': patch
---

Simplified Chinese is now complete on every authored surface — the last 98 gaps outside picklist options are filled, and a test keeps them filled.

#645 finished select-option coverage in Chinese, which left zh-CN complete on the
one surface anyone had a ledger for. The other four an authored bundle owns were
still English, and they were not small: **every page in the app** rendered its
nav label, breadcrumb and header in English, so a Chinese-language trial saw
"Opportunity Detail" above a fully translated opportunity record. The six
win/loss widgets #593 added to the Sales dashboard shipped untranslated for the
same reason, as did 55 field labels/help strings, the two Lead empty states, and
the campaign picker inside `create_campaign`.

The `pages` group did not exist in `zh-CN.ts` at all, which is why the whole
surface was missing rather than partly filled. Header copy is addressed by the
PAGE name (`pages.<name>.title` / `.subtitle`) — a `page:header` carries no
stable id, so the page name is the only identifier that reaches it. Strings
holding `{field}` tokens keep the token spelling verbatim: the console
substitutes on the raw key, so a translated token resolves to nothing and the
header renders blank.

**Why no existing check caught this.** `objectstack lint` has the rules that find
every one of these gaps, and CI never runs them: `pnpm lint` is
`objectstack lint --skip-i18n`, and `objectstack lint` exits 0 on warnings
regardless. The i18n rules are switched off in the one place that would fail a
PR. So the guard lands in `test/metadata-references.test.ts` — five assertions
walking the metadata (357 field strings, 8 pages, 90 widget strings, 4 empty
states, 11 action-param labels) and requiring a zh-CN entry for each. All five
were confirmed to fail when a translation is removed; this suite already carries
one green-but-vacuous test in its history, which is why they were mutation-checked
rather than trusted.

Scoped to zh-CN deliberately. `en` / `ja-JP` / `es-ES` still carry the debt
enumerated in #645 and #494 — widening these assertions is that work's finish
line, not its entry fee.

View **tab** labels remain untranslatable and are not addressed here: `tabs[].label`
has no translation key in `ObjectTranslationDataSchema` and no resolver in
`i18n-resolver.ts`, so the gap is upstream rather than in this repo (#661).
