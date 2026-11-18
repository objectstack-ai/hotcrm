// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { Project } from '../src/psa/objects/project.object';
import { ProjectViews } from '../src/psa/views/project.view';
import * as Profiles from '../src/sales/profiles';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * A project names the sales order it delivers; the order page lists its
 * projects (REQ-0010 stage 2, hotcrm#2561).
 *
 * The model half pins the field (optional, beside Contract, offered from the
 * project's account), who reads it, and the persona list the PR states: every
 * set that reads projects reads orders, except the project team member, whose
 * project page leaves the field off as it leaves off the opportunity. The
 * booted half writes the link as a project manager, reads it back from the
 * order's side, reads it as a team member, and disables the module: the order
 * page's Projects list is derived from the registered objects' lookups, so
 * with `crm_project` gone it has nothing to derive, and the order itself still
 * answers.
 */

type Rec = Record<string, any>;
type PermissionSet = { name: string; objects: Record<string, { allowRead?: boolean; viewAllRecords?: boolean }>; fields?: Record<string, { readable?: boolean }> };

const sets = (Object.values(Profiles) as unknown[]).filter((s): s is PermissionSet =>
  typeof s === 'object' && s !== null && typeof (s as PermissionSet).name === 'string' && typeof (s as PermissionSet).objects === 'object');
const set = (name: string): PermissionSet => {
  const found = sets.find((s) => s.name === name);
  expect(found, name).toBeTruthy();
  return found!;
};

describe('the shape', () => {
  it('Order is an optional lookup beside Contract, offered from the project\'s account', () => {
    const field = Project.fields.crm_sales_order as Rec;
    expect(field.type).toBe('lookup');
    expect(field.reference).toBe('crm_sales_order');
    expect(field.required ?? false).toBe(false);
    expect(field.group).toBe((Project.fields.crm_contract as Rec).group);
    expect(field.dependsOn).toEqual(['crm_account']);
    expect(field.relatedListColumns, 'the Projects list on the order page').toBeDefined();
    const columns = ProjectViews.list!.columns as Array<{ field: string }>;
    expect(columns.map((c) => c.field)).toContain('crm_sales_order');
  });

  it('every set that reads projects reads orders, but the team member, who does not see the field', () => {
    const readsProjects = sets.filter((s) => s.objects.crm_project?.allowRead).map((s) => s.name).sort();
    expect(readsProjects).toEqual([
      'finance_controller', 'project_manager', 'project_member', 'sales_leadership', 'sales_manager', 'sales_rep', 'system_admin',
    ]);
    for (const name of readsProjects.filter((n) => n !== 'project_member')) {
      expect(set(name).objects.crm_sales_order?.allowRead, name).toBe(true);
    }
    const member = set('project_member');
    expect(member.objects.crm_sales_order).toBeUndefined();
    expect(member.fields?.['crm_project.crm_sales_order']?.readable).toBe(false);
  });

  it('the project manager reads every order and its lines, and writes neither', () => {
    const pm = set('project_manager').objects;
    expect(pm.crm_sales_order).toMatchObject({ allowRead: true, viewAllRecords: true, allowCreate: false, allowEdit: false, allowDelete: false });
    expect(pm.crm_sales_order_line).toMatchObject({ allowRead: true, allowCreate: false, allowEdit: false, allowDelete: false });
  });
});

describe('on the booted stack', () => {
  const PKG = '/packages/app.objectstack.hotcrm.psa';
  /**
   * A disable and a re-enable rebuild the served metadata twice: measured
   * 2.1 s alone for the disable case, and past the 5 s default on a loaded CI
   * runner (hotcrm#2585 run, 2026-11-17), as in test/psa-module-package.test.ts.
   */
  const DISABLE_BUDGET_MS = 120_000;
  let verify: VerifyStack;
  let admin: string;
  let pm: Person;
  let member: Person;
  let order: Rec;
  let project: Rec;

  beforeAll(async () => {
    verify = await hotcrmStack();
    admin = await verify.signIn();
    pm = await signUpPerson(verify, 'pm@project-source-order.test', {
      name: 'Order PM', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
    });
    member = await signUpPerson(verify, 'member@project-source-order.test', {
      name: 'Order Consultant', positions: ['crm_project_member'], permissionSets: ['project_member'],
    });
    [order] = await verify.rows('crm_sales_order', { name: 'Globex Seat Expansion Order' });
    expect(order, 'fixture: the seeded Globex order').toBeTruthy();
  }, 180_000);

  afterAll(async () => {
    await verify?.apiAs(admin, 'PATCH', `${PKG}/enable`);
  });

  const objectList = async (): Promise<Rec[]> => {
    const res = await verify.apiAs(admin, 'GET', '/meta/object');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Rec;
    const list = (Array.isArray(body) ? body : body.data?.items ?? body.data ?? body.items ?? body.objects) as Rec[];
    expect(Array.isArray(list), JSON.stringify(body).slice(0, 300)).toBe(true);
    return list;
  };
  /** The objects whose lookups point at the order: what the order page's lists are derived from. */
  const childrenOfOrder = async (): Promise<string[]> => {
    const list = await objectList();
    const out: string[] = [];
    for (const o of list) {
      const fields = Array.isArray(o.fields) ? o.fields : Object.entries(o.fields ?? {}).map(([name, f]) => ({ name, ...(f as Rec) }));
      if (fields.some((f: Rec) => f.reference === 'crm_sales_order')) out.push(String(o.name));
    }
    return out.sort();
  };

  it('a project manager names the order on a project and reads it back from the order\'s side', async () => {
    const opened = await verify.apiAs(pm.token, 'POST', '/data/crm_project', {
      name: 'Globex Seat Rollout', crm_account: order.crm_account, crm_sales_order: order.id, kind: 'delivery',
    });
    expect(opened.status, await opened.clone().text()).toBeLessThan(300);
    [project] = await verify.rows('crm_project', { name: 'Globex Seat Rollout' });
    expect(project!.crm_sales_order).toBe(order.id);
    const read = await verify.apiAs(pm.token, 'GET', `/data/crm_sales_order/${order.id}`);
    expect(read.status, 'the project manager reads the order').toBe(200);
    const listed = await verify.rows('crm_project', { crm_sales_order: order.id }, { as: pm.token });
    expect(listed.map((p) => p.id)).toEqual([project!.id]);
    expect((await verify.rows('crm_sales_order_line', { crm_sales_order: order.id }, { as: pm.token })).length, 'and its lines').toBeGreaterThan(0);
  });

  it('a team member staffed on it reads the project without its order', async () => {
    const [rate] = await verify.rows('crm_rate_card', { name: 'Consultant' });
    await verify.hooks.run('crm_project_member', 'insert', {
      crm_project: project.id, person: member.id, responsibility: 'consultant', rate_card: rate!.id,
    }, { as: admin });
    const [seen] = await verify.rows('crm_project', { id: project.id }, { as: member.token });
    expect(seen, 'the team reads the project').toBeTruthy();
    expect(seen!.crm_sales_order, 'the order field is hidden from a member').toBeUndefined();
    expect((await verify.apiAs(member.token, 'GET', `/data/crm_sales_order/${order.id}`)).status).not.toBe(200);
  });

  it('with the module disabled the order page has no Projects list to derive, and the order still answers', async () => {
    expect(await childrenOfOrder()).toContain('crm_project');
    expect((await verify.apiAs(admin, 'PATCH', `${PKG}/disable`)).status).toBe(200);
    try {
      expect(await childrenOfOrder()).not.toContain('crm_project');
      expect((await verify.apiAs(admin, 'GET', '/meta/object/crm_project')).status).toBe(404);
      expect((await verify.apiAs(admin, 'GET', '/meta/object/crm_sales_order')).status).toBe(200);
      const read = await verify.apiAs(admin, 'GET', `/data/crm_sales_order/${order.id}`);
      expect(read.status, await read.clone().text()).toBe(200);
      const edit = await verify.apiAs(admin, 'PATCH', `/data/crm_sales_order/${order.id}`, { customer_po_number: 'PO-2561' });
      expect(edit.status, await edit.clone().text()).toBe(200);
    } finally {
      expect((await verify.apiAs(admin, 'PATCH', `${PKG}/enable`)).status).toBe(200);
    }
    expect(await childrenOfOrder()).toContain('crm_project');
    const [kept] = await verify.rows('crm_project', { id: project.id });
    expect(kept!.crm_sales_order, 'the link survives the round trip').toBe(order.id);
  }, DISABLE_BUDGET_MS);
});
