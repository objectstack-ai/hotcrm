// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Report Definitions Barrel
 *
 * ## Why these files annotate with `Report`, not `ReportInput`
 *
 * ObjectStack 17.0.0-rc.6 retired the `ReportInput` export and moved the bare
 * name onto the authoring shape, under the ADR-0122 convention that `X` is the
 * INPUT type and `XParsed` the post-parse one (defaults applied, transforms
 * run). The underlying type is unchanged — `z.input<typeof ReportSchema>`,
 * exactly what `ReportInput` named — so the annotations below still mean
 * "authoring shape: optional fields with defaults may be omitted".
 *
 * The rename is worth writing down because on rc.5 the name `Report` meant the
 * OPPOSITE (`z.infer`, the parsed shape). Anything that was annotated `Report`
 * before the upgrade silently changed meaning instead of failing to compile;
 * only `ReportInput` — removed outright — announced itself, via
 * `tsc --noEmit`. The same swap applies to `Action`, `Dashboard` and `Page`,
 * which this app also imports from `@objectstack/spec/ui` and which are all
 * used on authoring literals, i.e. the side the swap made more correct.
 */
export { AccountsByIndustryTypeReport } from './account.report';
export {
  CasesByStatusPriorityReport,
  SlaPerformanceReport,
  CasesOpenedByDayPriorityReport,
} from './case.report';
export { LeadInflowByMonthSourceReport } from './lead.report';
export {
  OpportunitiesByStageReport,
  WonOpportunitiesByOwnerReport,
  PipelineCoverageByQuarterReport,
  OpportunityFunnelByOwnerStageReport,
} from './opportunity.report';
export { CustomerChurnSignalsReport } from './churn.report';
