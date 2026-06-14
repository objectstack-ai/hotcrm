# AGENTS.md — HotCRM

Guidance for AI coding agents working in this repo. For full architecture and
metadata conventions, see [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
(the `crm_` naming rule, ObjectQL-only data access, metadata-first design, etc.).
This file captures **working practices** — how to verify changes — that are easy
to get wrong.

## Verifying UI changes in the browser

The Console renders dashboards, charts, and views from metadata. When you verify
a change by driving the browser, follow these rules.

### Rule: wait for lazy-loaded UI before judging — never conclude from an early screenshot

Dashboard charts (`AdvancedChartImpl` / Recharts) and other heavy widgets are
**`React.lazy`-loaded** — the chart bundle hydrates a beat *after* the page
navigates. A screenshot taken immediately after navigation shows **empty chart
cards even when nothing is wrong**.

Do **not** report a widget as broken from a single early screenshot. Before
concluding anything about rendering:

1. After navigating, wait ~1–2s (or poll) for the lazy bundle to hydrate.
2. Confirm the chart actually drew via a DOM probe, not just a picture — e.g.
   count Recharts nodes:
   `document.querySelectorAll('.recharts-pie-sector, .recharts-rectangle, .recharts-funnel-trapezoid, .recharts-area-area, .recharts-line-curve').length`
   A non-zero count means it rendered; re-screenshot only once it's > 0.
3. Cross-check the data path: `POST /api/v1/analytics/dataset/query` returning
   `200` with rows means the data is fine — an empty visual is then either
   hydration timing (wait) or a genuine renderer issue (investigate), but it is
   **not** a data or metadata bug.

All chart types (`funnel`, `donut`, `pie`, `bar`, `horizontal-bar`, `area`,
`line`, `table`) render correctly once settled. `gauge` renders as a single
numeric value (no dial yet — by ADR-0021 design), which is expected, not a bug.

> Origin: during the ObjectStack 9.4 upgrade an agent screenshotted a dashboard
> too early, saw blank funnel/donut cards, and wrongly reported the renderers as
> broken. They were fine — it was the lazy-load race. Verify hydration first.

### Other browser-verify gotchas (same workflow)

- **`better-sqlite3` native ABI mismatch.** If boot floods
  `NODE_MODULE_VERSION ... requires ...` errors, the SQLite native binary was
  built for a different Node ABI. Fix: `pnpm rebuild better-sqlite3`, then
  restart the dev server. Not related to any app/code change.
- **Console dashboard route** is
  `/_console/apps/<manifest.id>/dashboard/<dashboardName>`
  (e.g. `app.objectstack.hotcrm`), **not** `/_console/a/<appName>` — the latter
  bounces to `/_console/home`.
- Dev admin (seeded on an empty DB, dev only): `admin@objectos.ai` / `admin123`.

## Verify before opening a PR

Run the full suite and make sure it's green:

```
pnpm validate && pnpm typecheck && pnpm build && pnpm test
```

`pnpm validate` enforces ADR-0021 dashboard-widget binding integrity (a chart's
`chartConfig.xAxis.field` must resolve to a dataset **dimension** and
`yAxis[].field` to a **measure**, regardless of chart orientation — the renderer
handles the visual flip). A swapped axis is a hard validation error.
