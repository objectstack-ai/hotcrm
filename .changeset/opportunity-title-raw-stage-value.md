---
'hotcrm': patch
---

Stop the Opportunity record title from rendering the raw `stage` value, and guard the whole picklist-rendering class in CI.

`crm_opportunity.nameField` pointed at a `display_title` formula composed as `record.name + " - " + record.stage`. A formula sees the stored select VALUE, never the translated label, so every deal titled itself "Enterprise Deal - closed_won" in lookup pickers, related lists, breadcrumbs and search results — in every locale. The ADR-0079 migration inherited this from the render-time template `'{name} - {stage}'`, which could resolve the label; a formula cannot. `nameField` is now the plain `name` column (a real, indexed field — so `$search` resolves on it directly) and `stage` still leads the highlight strip, translated.

Three guards were added to `test/metadata-references.test.ts` so this class fails at PR time instead of during dogfooding: option translations must be keyed by option value (not English label); translated object/field keys must name real objects and fields; and no formula may render a select field into its output string (branching on a select stays legal). The existing zh-CN navigation-label guard looked up `translations.find(t => t.locale === 'zh-CN')`, but the app ships one bundle keyed by locale — the lookup matched nothing and the test returned early, asserting nothing. It now resolves the locale pack correctly and asserts the pack exists.
