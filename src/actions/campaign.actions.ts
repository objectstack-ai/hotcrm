// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Enroll leads into this campaign.
 *
 * Flow-typed action: launches the `campaign_enrollment` screen flow (pick a
 * lead status, enroll all eligible leads). The flow used to be a Monday cron
 * with input variables that a cron firing never seeds — this action is its
 * entry point now, following the proven `convert_lead` / `generate_quote`
 * pattern (the console's flow-action trigger sends `{ recordId, objectName }`).
 */
export const EnrollLeadsAction: Action = {
  name: 'enroll_leads',
  label: 'Enroll Leads',
  objectName: 'crm_campaign',
  icon: 'user-plus',
  type: 'flow',
  target: 'campaign_enrollment',
  locations: ['record_header', 'record_more'],
  // Enrollment only makes sense while the campaign is open — the flow
  // double-checks this server-side.
  visible: P`record.status == "planning" || record.status == "in_progress"`,
  successMessage: 'Eligible leads enrolled in campaign.',
  refreshAfter: true,
};
