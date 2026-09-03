---
'hotcrm': patch
---

The Chinese security page uses one word for the second sign-in factor.

`reference/security-and-compliance` ships three locales, and both Chinese faces
named the second sign-in factor two different ways, eight lines apart. The
anti-abuse correction at the top of the authentication section used the
platform's own term — 「两步验证」 / 「兩步驗證」 — while the MFA bullet below it
used a coined 「双因素」 / 「雙因素」. Both spellings were shipping, in the same
locale, on the same screen of the same page.

`AGENTS.md` Documentation discipline rule 6 settles which one wins: UI nouns take
the zh-CN language-pack wording, and a fresh translation is never coined for
something the app already labels. Measured on the installed
`@objectstack/service-settings@17.2.0`, the pack calls it 「两步验证」 in both
places it names the factor:

| pack key | text |
| --- | --- |
| `settings.auth.keys.lockout_threshold.help` | …0 表示关闭密码阶段的锁定;此时**两步验证**仍保留其内置限制(15 分钟内 10 次)… |
| `settings.auth.keys.mfa_required.help` | …启用此项也会开启**两步验证**功能,以便用户注册。 |

「双因素」 does not occur anywhere in that pack. So the MFA bullet on each
Chinese face now reads 「两步验证默认关闭。」 / 「兩步驗證預設關閉。」, matching
both the console the reader is being sent to and the sentence eight lines above
it, which already said 「两步验证在这里默认关闭(见下方 MFA 一节)」 about the
very same fact.

The Traditional form is the corpus's own, taken verbatim from line 46 of the
same file rather than glyph-converted: 「兩步驗證」 was already on the page.

One bullet per locale — those two were the only occurrences of the coined
spelling anywhere under `content/docs`. Nothing else on the page refers to the
bullet by either term; the cross-reference into that section points at it by
acronym (「见下方 MFA 一节」), so no link or reference changes. The English face
needs no change: "two-factor" is unambiguous there. No behaviour, metadata or
setting changes — this is the page's wording only.
