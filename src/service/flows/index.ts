// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Service flow barrel — the flows whose start node names `crm_case`.
 * See `src/sales/flows/index.ts` for why the registration order is assembled
 * in `objectstack.config.ts` rather than here.
 */
export { CaseEscalationFlow, CaseEscalationOnCreateFlow } from './case-escalation.flow';
export { EscalateCaseFlow, CloseCaseFlow, ClaimCaseFlow } from './case-actions.flow';
export { CaseEscalationStampFlow } from './case-escalation-stamp.flow';
export { CaseSlaMonitorFlow } from './case-sla-monitor.flow';
