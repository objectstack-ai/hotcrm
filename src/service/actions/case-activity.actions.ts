// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import * as serviceObjects from '../objects';
import { activityActionsFor } from '../../sales/actions/activity-actions';

/**
 * The `crm_case`-scoped activity triple — `log_call`, `log_meeting`,
 * `schedule_meeting` on a case.
 *
 * These three used to be built alongside the other twelve in what is now
 * `src/sales/actions/activity-actions.ts`. `crm_case` is this package's object,
 * so the ACTIONS authored against it are this package's too (plan item 5: an
 * item lives with the object it is authored against) — but the factory that
 * builds them is not duplicated. It stays in sales, where the other four host
 * objects and the `crm_event` every one of these writes live, and service
 * imports it along the one edge ADR-0130 allows a module to import on:
 * service -> sales, never sideways, never a second copy.
 *
 * The export names are the originals — `LogCallAction`, `LogMeetingAction`,
 * `CaseScheduleMeetingAction`, with no `Case` prefix on the first two —
 * because `src/service/pages/case_detail.page.ts` imports them by those names,
 * and this PR moves files without renaming what they export.
 */
const caseActivityActions = activityActionsFor('crm_case', serviceObjects);

export const LogCallAction: Action = caseActivityActions.log_call;
export const LogMeetingAction: Action = caseActivityActions.log_meeting;
export const CaseScheduleMeetingAction: Action = caseActivityActions.schedule_meeting;
