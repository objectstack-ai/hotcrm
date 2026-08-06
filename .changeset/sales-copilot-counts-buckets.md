---
'hotcrm': patch
---

Correct the skill count on two pages, and stop attributing the four forecast
buckets to the revenue-forecasting skill.

**Skill count (#897).** `src/skills/index.ts` registers six skills — Live Data
joined the registry and the docs never caught up. The capability table in
`content/docs/index.mdx` still said "5 skills" and its parenthetical list omitted
Live Data entirely, which is the odd one to lose: Live Data is the skill behind
Wow #1. It now reads six, with live data named first, matching the order in
`content/docs/ai-copilot/skills.mdx`. The Sales Copilot / Service Copilot names in
that same table cell are untouched — they belong to a separate open question about
persona naming.

On `content/docs/ai-copilot/sales-copilot.mdx` the "Where the personas went" note
said the capability "lives in five skills registered through `src/skills/`". The
subject there is the registry, which holds six, but the page itself documents five
sales-side skills and numbers them 1–5, so writing "six" would have replaced one
mismatch with another. The sentence now carries no count at all, which is exactly
what the parallel note on `content/docs/ai-copilot/service-copilot.mdx` already
says in all three languages.

**Forecast buckets (#898).** The forecasting section presented **Closed / Commit /
Best Case / Pipeline** as what the skill returns, with probability thresholds
attached to two of them (Commit above 80%, Best case 40–80%). None of that is the
skill. `src/skills/revenue-forecasting.skill.ts` groups by stage, computes weighted
value as amount × probability, names at-risk deals with the signal behind each, and
gives the forecast as a range from commit-only to full weighted pipeline, optionally
with a chart. It never reads `forecast_category`.

The four names are real and the page now says where they live rather than dropping
them: they are options of `crm_opportunity`'s **Forecast Category** field, and the
amounts carrying those names are written onto **Forecast** records by the scheduled
forecast snapshot in `src/flows/forecast-snapshot.flow.ts`. The probability
thresholds had no source anywhere — the snapshot buckets by forecast category, not
by probability band. Two smaller claims in the same section go with them: "missing
close dates" was never one of the skill's risk signals, and the manager tip asking
*"Which reps need coaching?"* described a per-rep rollup the skill does not do —
stage and the user's period are its only groupings, so that tip now asks for
slipping deals and says plainly what the skill will not answer.

Documentation only, all three locales. This brings the page into line with the
skill rows already written in `content/docs/ai-copilot/skills.mdx`, which had been
describing the same skill differently since those rows landed. Refs #897, #898.
