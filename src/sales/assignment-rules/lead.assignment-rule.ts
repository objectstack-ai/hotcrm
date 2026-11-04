// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineAssignmentRule } from '@objectstack/spec/automation';

/**
 * Route every ownerless new lead into Lead Intake, owned by the least-loaded
 * sales rep (ADR-0142 D5).
 *
 * Evaluated once per inserted lead, after every `beforeInsert` hook, and only
 * for a lead whose `owner_id` and `queue` are both still empty — a web-to-lead
 * submission (the guest branch of `lead_automation` strips a supplied owner)
 * or a system import. A person's own create, and every REST or CSV import, is
 * stamped with the writer and never routed. `load` counts a rep's leads that
 * are not yet converted. With nobody holding `sales_rep` the lead parks in the
 * queue; intake is never refused.
 *
 * The `lead_assignment` flow (`src/sales/flows/lead-assignment.flow.ts`) then
 * alerts the owner this rule chose; a parked lead has no owner to alert.
 */
export const LeadIntakeAssignmentRule = defineAssignmentRule({
  name: 'lead_intake_assignment',
  label: 'Lead Intake',
  description: 'Hand each ownerless new lead to the sales rep with the fewest unconverted leads.',
  object: 'crm_lead',
  entries: [
    {
      name: 'least_loaded_rep',
      assignTo: { type: 'queue', value: 'lead_intake' },
      strategy: 'least_loaded',
      load: 'record.is_converted == false',
    },
  ],
});
