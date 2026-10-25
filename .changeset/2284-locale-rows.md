---
'hotcrm': patch
---

The Sales Home tabs and the two public forms are translated, and the en pack carries the approval flow names

**Sales Home tab labels (#2284).** The **My Leads**, **My Open Deals** and **My Open Tasks** tabs
on Sales Home stayed English in Chinese, Japanese and Spanish: a tab is translated under its
`value`, and these three had none. Each tab now has one (its URL `?tab=` token, the key of the
view it embeds), and the four locale packs label it, with the wording each pack already uses for
that view.

**Public form titles (#2284).** The Web-to-Lead form at `/forms/contact-us` is headed **Contact
Us**, and the Web-to-Case form at `/forms/support` **Contact Support**. Neither form had a title
before, so a visitor saw English or the object name; the platform serves the title in the
visitor's language, and each pack translates both (zh-CN 联系我们 / 联系支持团队, ja-JP
お問い合わせ / サポートへのお問い合わせ, es-ES Contáctenos / Contactar con Soporte).

**Approval flow and step names.** The Chinese, Japanese and Spanish packs already translated the
six approval flows and their steps (shipped with the 18.1.0 upgrade); the English pack now
carries the same keys with the source wording.
