// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineAssignmentRule } from '@objectstack/spec/automation';

/**
 * Route every ownerless new case into Support Intake, owned by the
 * least-loaded service agent (ADR-0142 D5).
 *
 * The platform evaluates this once per inserted case, after every
 * `beforeInsert` hook and before the write, and only for a case whose
 * `owner_id` and `queue` are both still empty. In practice that is a
 * web-to-case submission (whose owner the guest branch of `case_sla_defaults`
 * strips) and a system import: a person's own insert is already stamped with
 * that person as owner, so it is never routed. An update never runs a rule.
 *
 * `least_loaded` counts each agent's cases matching `load` — open work, so a
 * resolved case stops counting against its agent the moment it is resolved,
 * which is the same arithmetic `case_sla_monitor` uses for live work. With
 * nobody holding `service_agent` the case parks in the queue, visible to
 * whoever administers it, and intake is never refused.
 *
 * Escalation is not here: an assignment rule runs on insert only, so the
 * hand-off to the `service_manager` desk stays `case_escalation_reassign`
 * (`src/service/objects/_case-assignment.ts`; ADR-0142 merge question 5).
 */
export const CaseIntakeAssignmentRule = defineAssignmentRule({
  name: 'case_intake_assignment',
  label: 'Case Intake',
  description: 'Hand each ownerless new case to the service agent with the fewest open cases.',
  object: 'crm_case',
  entries: [
    {
      name: 'least_loaded_agent',
      assignTo: { type: 'queue', value: 'case_intake' },
      strategy: 'least_loaded',
      load: 'record.status != "resolved" && record.status != "closed"',
    },
  ],
});
