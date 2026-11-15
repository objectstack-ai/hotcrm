---
"hotcrm": patch
---

Quotes, price books and products: the rules the quote, quote line, opportunity line, price book, price book entry and product hooks enforce now answer in the caller's language (fixes #2496). Each refusing hook declares its refusal catalogue, with the English sentence as the declared message and zh-CN, ja-JP and es-ES translations in the Revenue locale packs; quote, price book, product and deal names and counts are filled through `{{ }}` holes. With this every HotCRM hook refusal is catalogued, and the hook-refusal guard test covers every package that refuses.
