---
'hotcrm': patch
---

Keep a Chinese reader on the Chinese page. Twelve site-absolute links inside the
translated documentation dropped the locale segment, so clicking one silently
landed the reader on the English page — the target existed, nothing 404-ed, and
nothing said the language had changed. The docs site hides the prefix for the
default locale only (`hideLocale: 'default-locale'`, English at `/docs/...`),
so `/zh-Hans/docs/...` and `/zh-Hant/docs/...` are the only spellings that open
a translated page.

The twelve sat on five page families, each in both faces: the sandbox and
release checklist linking Email & Calendar, the FAQ's Stripe answer linking
Integrations, the Opportunities page linking Quotes and Dashboards, the Cases
page linking Sharing & Security, and the Service index linking Cases. Half of
them contradicted their own page: at six of the twelve sites the very same
target was already linked with the prefix elsewhere in the same file — the FAQ
links Integrations with the prefix on one line and without it eight lines
later — and eight of the ten files carry prefixed links throughout. That is
what made these read as authored rather than wrong.

Every one of the six targets ships both `.zh-Hans.mdx` and `.zh-Hant.mdx`,
verified per link before rewriting, so all twelve now resolve to a translated
page rather than turning a wrong-language landing into a missing one. The
English pages were already correct and are untouched. Nothing else changed:
each edited line differs from its previous form by the inserted locale segment
and by nothing else.
