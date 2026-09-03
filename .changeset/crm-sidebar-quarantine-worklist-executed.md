---
'hotcrm': patch
---

Name this app's own sidebar in English on the four zh-Hant pages that still
named it in Traditional Chinese, and empty the quarantine ledger that was
holding those five pairs — in one commit, because the two halves fail in
opposite directions.

`KNOWN_UNRESOLVED_CRM` in `test/docs-setup-navigation-names.test.ts` quarantined
five `group → child` citations rather than rewriting them, on purpose: which
locale a zh-Hant reader should be sent to was the open question on #1368, and
rewriting the pages first would have pre-empted the ruling. That block wrote its
own unblock condition into a comment — *"when #1368 is decided, these five lines
are the worklist"* — because it could not write one into code. #1368 decided on
2026-08-31, and this is that worklist executed.

The convention holds on its measured reason: this app ships `en` / `zh-CN` /
`ja-JP` / `es-ES` and no Traditional-Chinese bundle, so a zh-Hant reader's
console falls back to **Simplified**, and a Traditional page names navigation in
English rather than mix Simplified glyphs into Traditional prose. It is *not*
that the reader sees an English console — that reason was measured false and is
retired.

Six citation sites, four pages, each replacement taken from the page's English
twin rather than translated back:

- `guides/email-and-calendar.zh-Hant.mdx` — **My Work → My Calendar**
- `sales/activities.zh-Hant.mdx` (twice) — **My Work › My Tasks**
- `sales/leads.zh-Hant.mdx` — **My Work › My Leads**
- `sales/meetings-and-calls.zh-Hant.mdx` — **Activity › Events** and
  **My Work › My Calendar**

The last group is the one worth reading twice. The Traditional citation was
`活動 › 活動` — group and child spelled the same word — and it does *not* mean
*Activity → Activities*, which this app ships nowhere. It resolves against
`src/apps/crm.app.ts` to `group_activity → nav_event`: **Activity › Events**.
The pair looked self-referential only because zh-CN labels the group and the
Events entry with the same string, `活动`.

The prose and the ledger had to land together. Fixing the pages alone turns
*"holds no quarantined pair the docs no longer cite"* red, naming all five
entries; deleting the five lines alone turns *"name a group and a child this app
really ships, in one locale"* red, naming all six sites. Both reds were measured
by ablation before the fix, so the pairing is a demonstration rather than a
claim, and the next reader has the failure text rather than the advice.

The block's comment is corrected in the same change. It said #1368 *"carries
`needs-user-decision`"*, which stopped being true when the card was decided — a
quarantine note that misstates its own unblock condition is how the next reader
concludes the block is still live. The set itself stays, empty and still checked
in both directions, exactly as `KNOWN_UNRESOLVED` does: an asserted zero, not an
absent one.

Prose and ledger contents only — no rule change. `CITATION`, `CRM_CITATION`,
`APP_WORDS`, `RETIRED_UI_NAMES` and the platform ledger `KNOWN_UNRESOLVED` are
untouched.
