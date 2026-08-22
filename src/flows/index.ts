// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Flow } from '@objectstack/spec/automation';

/**
 * Flow Definitions Barrel
 */
export { CampaignEnrollmentFlow } from './campaign-enrollment.flow';
export { CaseEscalationFlow, CaseEscalationOnCreateFlow } from './case-escalation.flow';
export { EscalateCaseFlow, CloseCaseFlow } from './case-actions.flow';
export { LeadConversionFlow } from './lead-conversion.flow';
export { ScheduleFollowUpFlow } from './schedule-followup.flow';
export { DemoBootstrapFlow } from './demo-bootstrap.flow';
export { OpportunityApprovalFlow, OpportunityApprovalOnCreateFlow } from './opportunity-approval.flow';
export { QuoteGenerationFlow } from './quote-generation.flow';
// Time/event-driven automation (scheduled + wait-node + record-change)
export { ContractRenewalFlow } from './contract-renewal.flow';
export { CaseSlaMonitorFlow } from './case-sla-monitor.flow';
export { OpportunityStagnationFlow } from './opportunity-stagnation.flow';
export { ForecastSnapshotFlow } from './forecast-snapshot.flow';
export { LeadAssignmentFlow } from './lead-assignment.flow';
export { CaseCsatFollowupFlow } from './case-csat-followup.flow';
// Migrated from object workflows[] (removed in 7.7): scheduled status-flips + notifications
export { CampaignCompletionFlow } from './campaign-completion.flow';
export { QuoteExpirationFlow } from './quote-expiration.flow';
export { ContractExpirationFlow } from './contract-expiration.flow';
export { ContactWelcomeFlow } from './contact-welcome.flow';
export { OpportunityWonAlertFlow } from './opportunity-won-alert.flow';
export { TaskUrgentAlertFlow } from './task-urgent-alert.flow';
export { TaskDueReminderFlow } from './task-due-reminder.flow';
// Outbound integration: the billing hand-off (#600) — where CRM scope ends.
export {
  BillingHandoffClosedWonFlow,
  BillingHandoffContractActivatedFlow,
} from './billing-handoff.flow';

import { CampaignEnrollmentFlow } from './campaign-enrollment.flow';
import { CaseEscalationFlow, CaseEscalationOnCreateFlow } from './case-escalation.flow';
import { EscalateCaseFlow, CloseCaseFlow } from './case-actions.flow';
import { LeadConversionFlow } from './lead-conversion.flow';
import { ScheduleFollowUpFlow } from './schedule-followup.flow';
import { DemoBootstrapFlow } from './demo-bootstrap.flow';
import { OpportunityApprovalFlow, OpportunityApprovalOnCreateFlow } from './opportunity-approval.flow';
import { QuoteGenerationFlow } from './quote-generation.flow';
import { ContractRenewalFlow } from './contract-renewal.flow';
import { CaseSlaMonitorFlow } from './case-sla-monitor.flow';
import { OpportunityStagnationFlow } from './opportunity-stagnation.flow';
import { ForecastSnapshotFlow } from './forecast-snapshot.flow';
import { LeadAssignmentFlow } from './lead-assignment.flow';
import { CaseCsatFollowupFlow } from './case-csat-followup.flow';
import { CampaignCompletionFlow } from './campaign-completion.flow';
import { QuoteExpirationFlow } from './quote-expiration.flow';
import { ContractExpirationFlow } from './contract-expiration.flow';
import { ContactWelcomeFlow } from './contact-welcome.flow';
import { OpportunityWonAlertFlow } from './opportunity-won-alert.flow';
import { TaskUrgentAlertFlow } from './task-urgent-alert.flow';
import { TaskDueReminderFlow } from './task-due-reminder.flow';
import {
  BillingHandoffClosedWonFlow,
  BillingHandoffContractActivatedFlow,
} from './billing-handoff.flow';

/** All flow definitions as a typed array for defineStack() */
export const allFlows: Flow[] = [
  // Core process flows
  CampaignEnrollmentFlow,
  CaseEscalationFlow,
  CaseEscalationOnCreateFlow,
  EscalateCaseFlow,
  CloseCaseFlow,
  LeadConversionFlow,
  ScheduleFollowUpFlow,
  DemoBootstrapFlow,
  OpportunityApprovalFlow,
  OpportunityApprovalOnCreateFlow,
  QuoteGenerationFlow,
  // Time/event-driven automation
  ContractRenewalFlow,
  CaseSlaMonitorFlow,
  OpportunityStagnationFlow,
  ForecastSnapshotFlow,
  LeadAssignmentFlow,
  CaseCsatFollowupFlow,
  // Migrated from object workflows[] (removed in 7.7)
  CampaignCompletionFlow,
  QuoteExpirationFlow,
  ContractExpirationFlow,
  ContactWelcomeFlow,
  OpportunityWonAlertFlow,
  TaskUrgentAlertFlow,
  TaskDueReminderFlow,
  // Outbound integration (#600)
  BillingHandoffClosedWonFlow,
  BillingHandoffContractActivatedFlow,
];
