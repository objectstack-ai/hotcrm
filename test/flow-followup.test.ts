// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import { ScheduleFollowUpFlow } from '../src/flows/schedule-followup.flow';

/**
 * schedule_followup flow runtime harness — the real automation engine over an
 * in-memory data engine (same recipe as flow-conversion / flow-quote).
 *
 * What this pins: the task is created with BOTH halves of the polymorphic
 * parent (`related_to_type` + `related_to_lead`). Getting only one of them
 * right is silent — the write succeeds and the task simply never appears on
 * the lead's Related tab, which is exactly the bug this feature exists to fix.
 */

type Rec = Record<string, any>;

function makeDataEngine() {
  const store: Record<string, Rec[]> = {};
  let seq = 0;
  const rows = (o: string) => (store[o] ??= []);
  const match = (r: Rec, where: Rec = {}) =>
    Object.entries(where).every(([k, v]) => r[k] === v);
  return {
    store,
    async insert(object: string, data: Rec) {
      const rec = { id: `${object}_${++seq}`, ...data };
      rows(object).push(rec);
      return rec;
    },
    async find(object: string, opts: Rec = {}) {
      return rows(object).filter((r) => match(r, opts.where ?? opts.filter ?? {}));
    },
    async findOne(object: string, opts: Rec = {}) {
      return rows(object).find((r) => match(r, opts.where ?? opts.filter ?? {})) ?? null;
    },
    async update(object: string, data: Rec, opts: Rec = {}) {
      const affected = rows(object).filter((r) => match(r, opts.where ?? opts.filter ?? {}));
      for (const r of affected) Object.assign(r, data);
      return { modified: affected.length };
    },
  };
}

const logger: any = { info() {}, warn() {}, error() {}, debug() {}, trace() {}, child() { return logger; } };

function buildEngine(data: ReturnType<typeof makeDataEngine>) {
  const ctx: any = {
    logger,
    getService: (name: string) => (name === 'data' || name === 'objectql' ? data : undefined),
  };
  const engine = new AutomationEngine(logger);
  installBuiltinNodes(engine, ctx);
  engine.registerFlow('schedule_followup', ScheduleFollowUpFlow);
  return engine;
}

async function runFollowUp(engine: AutomationEngine, leadId: string, screen: Rec) {
  const started: any = await engine.execute('schedule_followup', {
    params: { recordId: leadId }, userId: 'user_1', event: 'manual',
  } as any);
  const runId = started.runId ?? started.run?.id;
  await engine.resume(runId, { variables: screen } as any);
}

describe('schedule_followup flow — runtime', () => {
  it('creates a task bound to the lead through BOTH polymorphic halves', async () => {
    const data = makeDataEngine();
    data.store.crm_lead = [{
      id: 'lead_1', first_name: 'Alice', last_name: 'Martinez',
      company: 'NextGen Retail', status: 'new',
    }];
    const engine = buildEngine(data);

    await runFollowUp(engine, 'lead_1', {
      subject: 'Send the retail proposal',
      dueDate: '2026-07-30',
      activityType: 'email',
      priority: 'high',
      notes: 'Asked for pricing on the 12-store rollout.',
    });

    const tasks = data.store.crm_task ?? [];
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
    const data = makeDataEngine();
    data.store.crm_lead = [{ id: 'lead_1', first_name: 'Alice', status: 'contacted' }];
    const engine = buildEngine(data);

    await runFollowUp(engine, 'lead_1', {
      subject: 'Book the demo',
      dueDate: '2026-08-04',
      activityType: 'demo',
      priority: 'normal',
    });

    expect(data.store.crm_lead[0].next_followup_date).toBe('2026-08-04');
  });
});
