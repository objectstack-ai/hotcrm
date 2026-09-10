---
'hotcrm': patch
---

Dashboard filter chrome now speaks the viewer's language — the filter names and their
option values on all five dashboards are translated into every locale HotCRM ships.

Under a Chinese, Spanish or Japanese UI the analytics dashboards used to render a
half-translated filter bar: the tiles, the charts and the option placeholder localized,
while the filter's own name stayed English. `Sales Rep: 全部` next to `商机类型: 全部` was
the tell — the value went through translation and the label beside it did not. The
hardcoded English **option** labels went untranslated with it, so opening *Deal Type*
offered `New Business` / `Existing Customer - Upgrade` on an otherwise Chinese page.

Every `globalFilters[]` entry across Sales Performance, Customer Service, Executive
Overview, CRM Overview and Sales Activity now carries its name and its static options as
an inline per-locale map covering **en · zh-CN · es-ES · ja-JP**. The wording is the
language pack's own — `销售代表`, `商机类型`, `优先级`, `线索来源` and their option values
are the same strings the record pages and widget titles already use, so the filter bar
does not coin a second vocabulary for a noun the app already labels. Case priority
`critical` renders `严重` in Chinese, never `紧急`, keeping the case and task priority
vocabularies distinct.

Chart **axis** titles are deliberately unchanged and stay English. `ChartAxisSchema.title`
accepts the same inline locale map the filters use, but the Console does not resolve it
against the viewer's locale — it flattens the map to whichever value happens to come
first, so writing one there would translate nothing while making the single hardcoded
string harder to read. Measured in a real browser both ways round and written down in
`src/dashboards/index.ts`, so the next author does not have to measure it again.
