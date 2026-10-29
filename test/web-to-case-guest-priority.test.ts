// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { CaseViews } from '../src/service/views/case.view';
import { hotcrmStack, signUpPerson, guestInsert, flowRuns, notificationsTo, type Person } from './helpers/verify-stack';

/**
 * A guest on the web-to-case form picks at most High (#2368, maintainer
 * ruling). Critical escalates on insert (`case_escalation_on_create`), hands the
 * case to the service manager pool and takes the 4-hour SLA row, so it is a
 * staff call. Measured on 18.2.0 before this change: the anonymous door
 * `POST /forms/support/submit` with `priority: critical` answered 201 and stored
 * a critical, escalated case.
 *
 * ### Why the field is off the form, and why the hook still caps
 *
 * The ruling's first choice was a form that offers Low, Medium and High.
 * 18.2.0 cannot: a form row's `options` subset parses and is served by
 * `GET /forms/support`, but the public renderer lists all four object options
 * and the door validates a posted value against the object only. So the
 * ruling's fallback holds: `priority` is off the form, the door's allow-list
 * drops a posted value, and the case takes the object default (`low`).
 *
 * The allow-list is the form's field list, a product decision that moves
 * (#1505). The guest branch of `case_sla_defaults` therefore caps a guest's
 * `critical` at `high` as well, before the rank, the SLA row and the
 * after-insert flows read it; the hook-level cases below hold that layer.
 *
 * Internal users keep all four options: a staff-created critical case still
 * escalates.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let agent: Person;
let manager: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  agent = await signUpPerson(verify, 'agent@web-to-case-guest-priority.test', {
    name: 'Priority Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });
  // The escalation pool: a case that escalated would be handed to this person.
  manager = await signUpPerson(verify, 'manager@web-to-case-guest-priority.test', {
    name: 'Priority Manager', positions: ['service_manager'], permissionSets: ['service_agent'],
  });
}, 120_000);

const submit = (body: Rec) => verify.api('/forms/support/submit', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});
const storedCase = async (id: string): Promise<Rec> => (await verify.rows('crm_case', { id }))[0] ?? {};

/** Nothing on the escalation path fired for `kase`. */
async function expectNotEscalated(kase: Rec) {
  expect(Boolean(kase.is_escalated), 'the guest case escalated').toBe(false);
  expect(kase.status, 'the guest case left New').toBe('new');
  expect(kase.escalation_reason ?? null).toBeNull();
  expect(kase.escalated_date ?? null).toBeNull();
  expect(kase.owner_id, 'the guest case was handed to the escalation pool').not.toBe(manager.id);
  const runs = await flowRuns(verify, 'case_escalation_on_create', String(kase.id));
  // No row means the start condition declined the case; a row would have to
  // have escalated it, which the stored state above already rules out.
  expect(runs, 'case_escalation_on_create ran for a guest case').toHaveLength(0);
  const told = (await notificationsTo(verify, manager.id))
    .filter((n) => JSON.stringify(n.payload ?? {}).includes(String(kase.id)));
  expect(told, 'the service manager was notified about a guest case').toEqual([]);
}

describe('web_to_case — the form asks no priority (#2368)', () => {
  it('declares no priority row, while the staff case form keeps the field', () => {
    const names = (sections: Rec[] | undefined) => (sections ?? [])
      .flatMap((s) => s.fields ?? [])
      .map((f: unknown) => (typeof f === 'string' ? f : (f as Rec).field));
    const views = CaseViews as Rec;
    expect(views.formViews?.web_to_case?.sharing?.allowAnonymous, 'web_to_case is no longer the public form').toBe(true);
    expect(names(views.formViews.web_to_case.sections)).not.toContain('priority');
    expect(names(views.form?.sections), 'the staff form lost priority — this pin would judge nothing').toContain('priority');
  });
});

describe('the anonymous door never stores a Critical case (#2368)', () => {
  it('drops a posted critical: the case takes the default Low and nothing escalates', async () => {
    const res = await submit({
      supplied_name: 'Pat Panic', supplied_email: `panic${++k}@web-to-case-guest-priority.test`,
      subject: `Site down ${k}`, description: 'Nothing loads.', priority: 'critical',
    });
    expect(res.status).toBe(201);
    const kase = await storedCase(String(((await res.json()) as Rec).id));
    expect(kase.origin, 'not the guest submission this case is about').toBe('web');
    expect(kase.priority, 'a guest stored the priority they posted').toBe('low');
    expect(kase.priority_rank).toBe(1);
    await expectNotEscalated(kase);
  }, 60_000);
});

describe('the guest branch caps critical at high, for the day the form asks again (#2368)', () => {
  it('stores high, ranks it high, and fires nothing on the escalation path', async () => {
    const written = await guestInsert(verify, 'crm_case', {
      subject: `Guest critical ${++k}`, description: 'x', priority: 'critical',
    });
    const kase = await storedCase(String(written.id));
    expect(kase.origin, 'the guest branch did not run').toBe('web');
    expect(kase.priority, 'a guest stored a critical case').toBe('high');
    // Stamped by the same hook AFTER the cap, so it proves the hook's own
    // reading was `high`, not a later overwrite.
    expect(kase.priority_rank, 'the rank was stamped from the uncapped value').toBe(3);
    await expectNotEscalated(kase);
  }, 60_000);

  it('leaves a guest’s high, medium and low alone', async () => {
    for (const priority of ['high', 'medium', 'low']) {
      const written = await guestInsert(verify, 'crm_case', {
        subject: `Guest ${priority} ${++k}`, description: 'x', priority,
      });
      expect((await storedCase(String(written.id))).priority, `a guest ${priority} was changed`).toBe(priority);
    }
  }, 60_000);

  it('a staff member can still open a critical case, and it escalates', async () => {
    const opened = await verify.hooks.run('crm_case', 'insert', {
      subject: `Staff P1 ${++k}`, description: 'Phoned in.', status: 'new', priority: 'critical',
    }, { as: agent.token });
    const kase = await storedCase(String(opened.id));
    expect(kase.priority, 'the cap reached a staff write').toBe('critical');
    expect(Boolean(kase.is_escalated), 'a staff critical case no longer escalates').toBe(true);
  }, 60_000);
});
