---
'hotcrm': patch
---

Extend the Chinese term guard from object names to `status.options.*` and field
`label`s, and correct the one live defect it found — `crm_quote.crm_contact`'s
`help` string told Chinese users a quote had to reach 「已呈现」, a status the
console has never shown. The pack's own `status.options.presented` says 已提交,
thirteen lines above the sentence that contradicted it.

#837 built the mechanism and scoped it to object names. #802 was filed on four
defects one level down, all found by human eyes and none by a machine:
`presented` written 已呈现/已呈現 (#765 §3, six sites on two pages), `expired`
written 已到期 on two different pages (#793 and #801 甲), and `expiration_date`
written 过期日期 (#801 乙, four sites). The docs were swept clean at the time.
The pack was not: the sentence corrected here was introduced later, by a feature
PR (#1017/#1068), after #794 had declared the repository clean of 已呈现. That
is the whole argument for a standing gate over a careful grep — the grep was
right on the day it ran.

A status term collides with prose in a way an object name does not, and the
card would not be dispatched until that was answered. It is answered by ledger
granularity rather than by syntactic position. The collision is always on the
ROOT — 到期, 呈现 — and never on the whole retired spelling: across the 134
Chinese pages, 71 lines carry 到期 and 14 carry 呈现, and zero carry 已到期,
过期日期 or 已呈现. So 到期日期 is guarded as a field label while 每日到期扫描,
自动到期, 报价单到期, 即将到期 and 到期日 are left alone, with no exemption
list and no narrowing of the scan.

The alternative the card proposed — scan only status-table cells and `**bold**`
references — was measured against the three fix commits and rejected as the
weaker rule. Six of the nineteen historical defect sites carried no markup at
all, including `不要更改已呈现报价上的定价` and the bare field list in the cell
`报价日期、过期日期、付款条款`. Narrowing by position would have dropped about a
third of the defects the guard exists for, and #801 甲 is already on record that
this class is consumed across pages rather than within one.

That boundary is now pinned instead of promised. A `SPARED` ledger names the
mechanism prose the `presented` and `expired` sweeps had to leave alone,
requires each phrase to still be in the corpus, and requires no retired spelling
to be a substring of any of them. Retire a bare root and the failure lands
there, on legitimate prose, rather than in CI across the whole corpus — the
noisy-gate-gets-silenced outcome #736 recorded and this card was held for.

Two smaller mechanics came with the extension. A pin names the dotted path it
derives from (`fields.status.options.presented`), and the path is resolved
rather than trusted, so a typo cannot produce a pin that guards nothing.
`hant: null` declares a term identical in both scripts — 已提交 and 到期日期
share every character — and the declaration is verified by requiring the
Simplified spelling to appear on the Traditional pages. It is also the one value
the mistake that `hant !== hans` exists to catch cannot produce: filling the
column in wrongly yields a string, not `null`.

`ALLOWED` stays empty after the extension, re-measured rather than assumed.
