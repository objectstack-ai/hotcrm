// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Service action barrel.
 *
 * The doctrine for this metadata type is written once, in
 * `src/sales/actions/index.ts`; this file is the service package's half of the
 * same file-by-file registration. The three activity actions come from the
 * sales factory but are authored against `crm_case`, so they register here.
 */
export { EscalateCaseAction, CloseCaseAction, ClaimCaseAction } from './case.actions';
export { LogCallAction, LogMeetingAction, CaseScheduleMeetingAction } from './case-activity.actions';
export { MarkArticleHelpfulAction, MarkArticleNotHelpfulAction } from './knowledge_article.actions';
