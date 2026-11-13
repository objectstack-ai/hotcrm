// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineQueue } from '@objectstack/spec/security';

/**
 * Lead Intake — the queue new leads nobody owns yet wait in (ADR-0142 D1).
 *
 * A lead sits here while its `owner_id` is empty and its `queue` column names
 * this queue. Every holder of the `crm_sales_rep` position is a member: a member
 * sees what sits here and takes a lead with the console's **Claim**.
 * `lead_intake_assignment` routes every ownerless new lead here and hands it
 * to the least-loaded rep; with nobody staffed the lead parks here.
 */
export const LeadIntakeQueue = defineQueue({
  name: 'lead_intake',
  label: 'Lead Intake',
  description: 'New leads nobody owns yet. Sales reps claim them from here.',
  members: [{ type: 'position', value: 'crm_sales_rep' }],
});
