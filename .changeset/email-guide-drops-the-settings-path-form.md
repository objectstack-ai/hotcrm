---
'hotcrm': patch
---

The email guide stops citing a **Settings** app HotCRM does not have.

`content/docs/guides/email-and-calendar.mdx`, under the heading `## Email
templates (not shipped yet)`, sketched the intended surface as "reusable
templates saved in **Settings → Email Templates**". There is no Settings app:
measured against `@objectstack/platform-objects` 17.3.0, the app switcher ships
exactly `Setup` / `系统设置` / `セットアップ` / `Configuración` and `Studio`, and
`Settings` is an app label in no shipped locale and a navigation label of
neither app. The one real Email Templates page is Studio → Integration → Email
Templates, and that is the platform's authentication-mail page — it does not do
the per-team folders, approval gating and AI personalisation this sentence
promises, so redirecting the sketch at it would have turned an honest "not
shipped yet" into a false claim about a page that does exist.

So the path form is dropped rather than repointed, following this page's own
zh-Hans and zh-Hant twins, which already write it as a plain noun phrase
(「邮件模板」设置页 / 「郵件範本」設定頁) instead of a navigation path. The
sentence now reads "reusable templates saved on an **Email Templates settings
page**" — an indefinite article, for a page that does not exist — and the
paragraph below it still says HotCRM ships none of it. The English page was the
only one of the three faces still naming an app.

One same-class instance on this same page is deliberately **not** fixed here and
is reported instead as #1808, because it is outside this card's ruled scope: under
`## Connecting your inbox (not shipped yet)`, the intended flow is still cited
as a bold `Settings → …` path. Its own next line already says no such settings
page exists, so the page does not mislead a reader who finishes the section;
which wording replaces it is the same docs judgement that was ruled for the
templates sketch, made for a different sentence.
