// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Dashboard Definitions Barrel
 *
 * ## Two i18n surfaces on a dashboard, and only one of them resolves (#1822)
 *
 * `@objectstack/spec` types BOTH `GlobalFilterSchema.label` and
 * `ChartAxisSchema.title` as `I18nLabelSchema` — `z.union([z.string(),
 * InlineLocaleMapSchema])` — so both accept `{ en, 'zh-CN', … }`. Only the
 * filter half is resolved against the viewer's locale. Measured on
 * `@objectstack/console@17.4.0`, driving the real Console in Chromium, not
 * read off a docblock:
 *
 *   - FILTER `label` and static option `label` → locale-aware. The renderer
 *     calls the inline-map resolver with the active language, so `zh-CN`
 *     renders the `zh-CN` value and `ja-JP` the `ja-JP` one. This is the
 *     spelling every `globalFilters[]` entry in this folder uses.
 *   - AXIS `title` → NOT locale-aware on 17.4.0 (the axis normaliser took the
 *     map's FIRST value, whatever the viewer's locale). Since
 *     `@objectstack/spec@17.5.0` the question no longer arises for this
 *     folder: a dataset-bound widget's `chartConfig` refuses `type`, `xAxis`,
 *     `yAxis` and `series` (ADR-0021 · ADR-0049 D2) — the widget's `type`,
 *     `dimensions` and `values` are the only binding — so no widget here
 *     carries an axis title any more.
 *
 * ⚠️ `GlobalFilterSchema.object` — documented upstream as resolving a
 * filter's field and option labels through `fields.<object>.<field>` — is
 * INERT in this Console build. Measured: a filter carrying `object` and no
 * `label` rendered the raw field name (`type`, not 类型) and left its option
 * labels English. The definition builder never copies `object` out of the
 * authored filter. ⛔ Do not reach for it instead of an inline map.
 */

export { ActivityDashboard } from './activity.dashboard';
export { CrmOverviewDashboard } from './crm.dashboard';
export { ExecutiveDashboard } from './executive.dashboard';
export { SalesDashboard } from './sales.dashboard';
