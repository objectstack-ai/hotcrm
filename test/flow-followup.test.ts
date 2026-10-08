// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * schedule_followup flow — the platform's automation engine over the real data
 * engine of the shipped app booted by `@objectstack/verify` (same recipe as
 * flow-conversion / flow-quote).
 *
 * What this pins: the task is created with BOTH halves of the polymorphic
 * parent (`related_to_type` + `related_to_lead`). Getting only one of them
 * right is silent — the write succeeds and the task simply never appears on
 * the lead's Related tab, which is exactly the bug this feature exists to fix.
 */

// The shipped app booted through `@objectstack/verify`'s handle; a sales rep
// starts the screen flow on their own lead (`flows.run`), submits its screen
// (`flows.resume`), and the task and the lead are read back off the engine.
let verify: VerifyStack;
let rep: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@flow-followup.test', {
    name: 'Follow-up Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

const lead = (doc: Rec) => verify.hooks.run('crm_lead', 'insert', {
  last_name: 'Martinez', company: 'NextGen Retail', email: `alice${++k}@flow-followup.test`, ...doc,
}, { as: rep.token });

async function runFollowUp(leadId: string, screen: Rec) {
  const run = await verify.flows.run('schedule_followup', { recordId: leadId }, { as: rep.token });
  await verify.flows.resume(run, screen, { as: rep.token });
}

describe('schedule_followup flow — runtime', () => {
  it('creates a task bound to the lead through BOTH polymorphic halves', async () => {
    const l = await lead({ first_name: 'Alice', status: 'new' });

    await runFollowUp(l.id, {
      subject: 'Send the retail proposal',
      dueDate: '2026-07-30',
      activityType: 'email',
      priority: 'high',
      notes: 'Asked for pricing on the 12-store rollout.',
    });

    const tasks = await verify.rows('crm_task', { related_to_lead: l.id });
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
    expect(task.related_to_lead).toBe(l.id);
  });

  it('stamps next_followup_date on the lead so Hot Leads reflects the commitment', async () => {
    const l = await lead({ first_name: 'Alice', status: 'contacted' });

    await runFollowUp(l.id, {
      subject: 'Book the demo',
      dueDate: '2026-08-04',
      activityType: 'demo',
      priority: 'normal',
    });

    expect((await verify.rows('crm_lead', { id: l.id }))[0]!.next_followup_date).toBe('2026-08-04');
  });
});
