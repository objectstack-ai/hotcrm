import { P } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Share escalated/critical cases with service managers.
 * ADR-0090 D3: `role_and_subordinates` is gone (positions are flat); the
 * grant now targets the manager position itself.
 */
export const CaseEscalationSharingRule = {
  name: 'case_escalation_sharing',
  label: 'Escalated Cases Sharing',
  object: 'crm_case',
  type: 'criteria' as const,
  condition: P`record.priority == "critical" && record.is_closed == false`,
  accessLevel: 'edit' as const,
  sharedWith: { type: 'position' as const, value: 'service_manager' },
};
