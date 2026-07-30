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

/**
 * The same escalation visibility one rung up.
 *
 * Positions are FLAT (ADR-0090 D3), so the director rung needs its own grant —
 * without it a service director cannot open the critical case their manager is
 * being paged about. Read-only: the manager on the rule above handles it.
 */
export const CaseDirectorSharingRule = {
  name: 'case_director_sharing',
  label: 'Escalated Cases — Service Director',
  object: 'crm_case',
  type: 'criteria' as const,
  condition: P`record.priority == "critical" && record.is_closed == false`,
  accessLevel: 'read' as const,
  sharedWith: { type: 'position' as const, value: 'service_director' },
};
