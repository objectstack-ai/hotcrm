---
'hotcrm': patch
---

Strip inert widget config and fabricated trend percentages from the Executive Overview dashboard.

The dashboard's widgets are dataset-bound, and the console's dataset widget renders purely from `type`/`dataset`/`dimensions`/`values`/`filter`/`filterBindings`/`layout` plus the dataset's own field metadata. Everything else the widgets carried — `chartConfig` blocks (colors, axes, legends), `colorVariant`, widget-level `actionUrl`/`actionType`/`actionIcon`, and free-form `options` (icons, formats, table column specs) — was never read by the renderer and only suggested tunability that didn't exist. Worst among these were hardcoded KPI trends (`+12.5% vs last quarter`, etc.): static made-up numbers posing as period-over-period deltas. All of it is removed; real trend deltas need a comparison query (`compareTo`) once the renderer supports it for dataset metrics.

The one piece of inert config with real intent — `options.dateGranularity: 'month'` on the trend charts — cannot be honored yet: the platform's supported mechanism (a dataset dimension's `dateGranularity`) routes the query through the ObjectQL aggregate bridge, which drops the caller's ExecutionContext and fail-closes the read scope (`id = '__deny_all__'`) on @objectstack 16.1, returning zero rows (verified in-browser and at the SQL layer). The trend widgets keep grouping by the raw date dimensions — unchanged behavior — and the datasets carry a note pointing at the upstream bug so the granularity can be declared once it's fixed.
