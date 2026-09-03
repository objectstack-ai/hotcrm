// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { makeFlowHarness, type FlowHarness, type Rec } from './helpers/flow-harness';
import { ScheduleFollowUpFlow } from '../src/flows/schedule-followup.flow';

/**
 * schedule_followup flow runtime harness — the real automation engine over the
 * SHARED in-memory data engine in `test/helpers/flow-harness.ts` (same recipe
 * as flow-conversion / flow-quote).
 *
 * What this pins: the task is created with BOTH halves of the polymorphic
 * parent (`related_to_type` + `related_to_lead`). Getting only one of them
 * right is silent — the write succeeds and the task simply never appears on
 * the lead's Related tab, which is exactly the bug this feature exists to fix.
 *
 * The private data engine this file used to carry is gone (#1479): it matched
 * with `===` only, so any range operator selected nothing silently, and it
 * stored only the columns a row was written with rather than the declared shape
 * the shipped app's materialising driver returns.
 */

const makeFollowUp = (seed: Record<string, Rec[]>): FlowHarness =>
  makeFlowHarness({ schedule_followup: ScheduleFollowUpFlow }, seed);

async function runFollowUp(h: FlowHarness, leadId: string, screen: Rec) {
  const runId = await h.run('schedule_followup', { recordId: leadId });
  await h.resume(runId!, screen);
}

describe('schedule_followup flow — runtime', () => {
  it('creates a task bound to the lead through BOTH polymorphic halves', async () => {
    const h = makeFollowUp({
      crm_lead: [{
        id: 'lead_1', first_name: 'Alice', last_name: 'Martinez',
        company: 'NextGen Retail', status: 'new',
      }],
    });

    await runFollowUp(h, 'lead_1', {
      subject: 'Send the retail proposal',
      dueDate: '2026-07-30',
      activityType: 'email',
      priority: 'high',
      notes: 'Asked for pricing on the 12-store rollout.',
    });

    const tasks = h.store.crm_task ?? [];
    expect(tasks).toHaveLength(1);
    const task = tasks[0];
    expect(task.subject).toBe('Send the retail proposal');
    expect(task.due_date).toBe('2026-07-30');
    expect(task.type).toBe('email');
    expect(task.priority).toBe('high');
    expect(task.status).toBe('not_started');
    // Both halves — the discriminator AND the lookup. With only one the write
    // still succeeds and the task silently never shows on the lead.
    expect(task.related_to_type).toBe('crm_lead');
    expect(task.related_to_lead).toBe('lead_1');
  });

  it('stamps next_followup_date on the lead so Hot Leads reflects the commitment', async () => {
    const h = makeFollowUp({
      crm_lead: [{ id: 'lead_1', first_name: 'Alice', status: 'contacted' }],
    });

    await runFollowUp(h, 'lead_1', {
      subject: 'Book the demo',
      dueDate: '2026-08-04',
      activityType: 'demo',
      priority: 'normal',
    });

    expect(h.store.crm_lead[0].next_followup_date).toBe('2026-08-04');
  });
});
