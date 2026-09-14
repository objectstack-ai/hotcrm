// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Sales flow barrel.
 *
 * A flow lives with the object its start node names (plan item 5: an item
 * lives with the object it is authored against), so the four packages each
 * carry their own. The registration ORDER — which used to be the `allFlows`
 * array at the bottom of `src/flows/index.ts` — is not here: the order flows
 * reach `defineStack()` is written straight into the artifact, and four
 * independently ordered lists cannot reproduce one interleaved order, so the
 * assembled list lives in `objectstack.config.ts` where all four are visible.
 *
 * `demo-bootstrap.flow.ts` is here because it has no single object: it is the
 * demo ownership sweep across twelve of them, and app-level items are the app
 * package's. `_billing-endpoint.ts` and `_guarded-iteration.ts` are the shared
 * flow sources every package reads along its edge into sales.
 */
export { LeadConversionFlow } from './lead-conversion.flow';
export { ScheduleFollowUpFlow } from './schedule-followup.flow';
export { DemoBootstrapFlow } from './demo-bootstrap.flow';
export { OpportunityApprovalFlow, OpportunityApprovalOnCreateFlow } from './opportunity-approval.flow';
export { OpportunityStagnationFlow } from './opportunity-stagnation.flow';
export { ForecastSnapshotFlow } from './forecast-snapshot.flow';
export { LeadAssignmentFlow } from './lead-assignment.flow';
export { ContactWelcomeFlow } from './contact-welcome.flow';
export { OpportunityWonAlertFlow } from './opportunity-won-alert.flow';
export { TaskUrgentAlertFlow } from './task-urgent-alert.flow';
export { TaskDueReminderFlow } from './task-due-reminder.flow';
export { BillingHandoffClosedWonFlow } from './billing-handoff-closed-won.flow';
