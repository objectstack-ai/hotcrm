// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineQueue } from '@objectstack/spec/security';

/**
 * Support Intake — the queue new cases nobody owns yet wait in (ADR-0142 D1).
 *
 * A case sits here while its `owner_id` is empty and its `queue` column names
 * this queue. Every holder of the `service_agent` position is a member: a
 * member sees what sits here, works it, and takes a case by pressing the
 * console's **Claim** on the record (an update of `owner_id` to themselves,
 * which the platform's transfer gate admits and which only one person wins).
 * Nothing in this app spells a claim: maintainer ruling 2026-11-04, option A
 * (hotcrm#2395) — a claim writes the owner only, and the status stays where
 * the agent leaves it.
 *
 * `case_intake_assignment` routes every ownerless new case here and hands it
 * to the least-loaded member; with nobody staffed the case parks here.
 * Organizations add users, teams or units of their own through Setup → Queue
 * Members (`sys_queue_member`); a declared queue names positions only.
 */
export const CaseIntakeQueue = defineQueue({
  name: 'case_intake',
  label: 'Support Intake',
  description: 'New cases nobody owns yet. Service agents claim them from here.',
  members: [{ type: 'position', value: 'service_agent' }],
});
