// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Case actions — both delegate to screen flows in
 * `src/flows/case-actions.flow.ts` (see the note there for why: modal
 * actions never execute their body in 16.1.0, and script bodies cannot
 * UPDATE a record on a sharing-ruled object; screen flows are the mechanism
 * that demonstrably works, same as `convert_lead` / `schedule_followup`).
 */
export const EscalateCaseAction: Action = {
  name: 'escalate_case',
  label: 'Escalate Case',
  objectName: 'crm_case',
  icon: 'alert-triangle',
  type: 'flow',
  target: 'escalate_case',
  locations: ['record_header', 'list_item'],
  visible: P`record.is_escalated == false && record.is_closed == false`,
  confirmText: 'This will escalate the case to the escalation team. Continue?',
  successMessage: 'Case escalated successfully!',
  refreshAfter: true,
};

export const CloseCaseAction: Action = {
  name: 'close_case',
  label: 'Close Case',
  objectName: 'crm_case',
  icon: 'check-circle',
  type: 'flow',
  target: 'close_case',
  locations: ['record_header'],
  visible: P`record.is_closed == false`,
  confirmText: 'Are you sure you want to close this case?',
  successMessage: 'Case closed successfully!',
  refreshAfter: true,
};
