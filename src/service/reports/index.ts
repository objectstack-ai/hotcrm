// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Service reports barrel.
 *
 * The doctrine for this metadata type is written once, in
 * `src/sales/reports/index.ts`; this file is the service package's half of
 * the same file-by-file registration.
 */

export {
  CasesByStatusPriorityReport,
  SlaPerformanceReport,
  CasesOpenedByDayPriorityReport,
} from './case.report';
