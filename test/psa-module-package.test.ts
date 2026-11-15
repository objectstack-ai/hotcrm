// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import artifact from '../objectstack.config';
import { packageStacks } from '../objectstack.composition';
import * as profiles from '../src/sales/profiles';
import { servedApp, packFor } from './helpers/composed-stack';
import { hotcrmStack } from './helpers/verify-stack';

type AnyRec = Record<string, any>;

/**
 * ═══ Project Delivery joins the suite as a module with its own app (#2316) ═══
 *
 * `app.objectstack.hotcrm.psa` (`src/psa/index.ts`, REQ-0002) is a
 * `type: 'module'` package of the ONE HotCRM artifact, by the maintainer's
 * 2026-11-15 ruling (option A, `psa-module-plan.md` *Recorded 2026-11-15*): a
 * suite module, depending on the app package only, with its own app,
 * 项目交付. Phase 0 was the skeleton, every entry contributed by the app
 * package into anchor groups; phase 1a brings the module's own six objects,
 * whose groups come first, ahead of those anchors. Its
 * version and range are `test/docs-declared-versions.test.ts`'s, read off the
 * same `packages[]`.
 */

const PSA_ID = 'app.objectstack.hotcrm.psa';
const APP_ID = 'app.objectstack.hotcrm';
const PSA_APP = 'crm_psa';

const bodies: AnyRec[] = (((artifact as AnyRec).packages ?? []) as AnyRec[]).map(
  (entry) => (entry?.manifest ?? {}) as AnyRec,
);
const walk = (nodes: AnyRec[]): AnyRec[] =>
  nodes.flatMap((n) => (n.type === 'group' ? walk((n.children ?? []) as AnyRec[]) : [n]));

describe('Project Delivery ships inside the HotCRM artifact (#2316)', () => {
  const psa = bodies.find((body) => body.id === PSA_ID);

  it('the artifact carries it as a module of the crm namespace, after Order to Cash', () => {
    expect(psa, `packages[] carries no ${PSA_ID}`).toBeDefined();
    expect(psa!.type).toBe('module');
    expect(psa!.namespace).toBe('crm');
    const ids = bodies.map((b) => b.id);
    expect(ids.indexOf(PSA_ID)).toBe(ids.indexOf('app.objectstack.hotcrm.o2c') + 1);
  });

  it('it depends on the app package and on nothing else — not on Order to Cash (ruling 4)', () => {
    expect(Object.keys(psa!.dependencies ?? {})).toEqual([APP_ID]);
  });

  it('it owns its six objects, their five hooks and its seed rows (phase 1a)', () => {
    const stack = (packageStacks as AnyRec[]).find((s) => s.manifest?.id === PSA_ID)!;
    expect(((stack.objects ?? []) as AnyRec[]).map((o) => o.name).sort()).toEqual([
      'crm_expense', 'crm_project', 'crm_project_member', 'crm_rate_card', 'crm_time_entry', 'crm_timesheet',
    ]);
    expect(((stack.hooks ?? []) as AnyRec[]).map((h) => h.name).sort()).toEqual([
      'expense_approver', 'project_member_unique', 'project_team_sync', 'time_entry_costing', 'timesheet_stamps',
    ]);
    expect([...new Set(((stack.data ?? []) as AnyRec[]).map((d) => d.object))].sort()).toEqual(['crm_project', 'crm_rate_card']);
  });
});

describe('Project Delivery is its own app (#2316)', () => {
  it('the module declares it, and nothing else declares an app of that name', () => {
    const owners = (packageStacks as AnyRec[])
      .filter((s) => ((s.apps ?? []) as AnyRec[]).some((a) => a.name === PSA_APP))
      .map((s) => s.manifest?.id);
    expect(owners).toEqual([PSA_ID]);
  });

  it('its own groups come first, then the customer and work entries the app package contributes', () => {
    const nav = servedApp(PSA_APP).navigation as AnyRec[];
    expect(nav.map((n) => n.id)).toEqual(['group_projects', 'group_time_expenses', 'group_rates', 'group_customers', 'group_work']);
    const objects = walk(nav).filter((i) => i.type === 'object').map((i) => `${i.objectName}${i.viewName ? `/${i.viewName}` : ''}`);
    expect(objects).toEqual([
      'crm_project', 'crm_project/my_projects', 'crm_project_member',
      'crm_timesheet/my_timesheets', 'crm_expense/my_expenses', 'crm_timesheet/timesheets_to_approve', 'crm_expense/expenses_to_approve',
      'crm_rate_card',
      'crm_account', 'crm_opportunity', 'crm_contract', 'crm_task/my_open_tasks',
    ]);
    // The app's own `navigation` names only the module's objects (ADR-0130):
    // the anchor groups are empty in the module's source.
    const own = (packageStacks as AnyRec[]).find((s) => s.manifest?.id === PSA_ID)!;
    const mine = new Set(((own.objects ?? []) as AnyRec[]).map((o) => o.name));
    const named = walk(own.apps[0].navigation as AnyRec[]).filter((i) => i.type === 'object').map((i) => i.objectName);
    expect(named.filter((name) => !mine.has(name))).toEqual([]);
  });

  it.each(['en', 'zh-CN', 'es-ES', 'ja-JP'])('the %s pack labels the app and every entry it serves', (locale) => {
    const pack = packFor(locale);
    expect(pack?.apps?.[PSA_APP]?.label).toEqual(expect.any(String));
    if (locale === 'en') return; // English labels are the authored ones.
    const rows = pack?.apps?.[PSA_APP]?.navigation ?? {};
    const ids = (servedApp(PSA_APP).navigation as AnyRec[]).flatMap((n) => [n.id, ...walk([n]).map((i) => i.id)]);
    for (const id of new Set(ids)) expect(rows[id]?.label, `${locale} ${id}`).toEqual(expect.any(String));
  });

  it('zh-CN uses the name the maintainer chose', () => {
    expect(packFor('zh-CN')?.apps?.[PSA_APP]?.label).toBe('项目交付');
  });

  it('rep, service, marketing and AR sets hide it; the sales manager states it; the delivery sets are silent', () => {
    const sets = Object.values(profiles) as AnyRec[];
    const hiding = sets.filter((s) => s.tabPermissions?.[PSA_APP] === 'hidden').map((s) => s.name).sort();
    expect(hiding).toEqual(['ar_accountant', 'marketing_user', 'sales_rep', 'service_agent']);
    // The manager states it beside the other four apps, as for Order to Cash,
    // so a set that hides it cannot take it away (most-visible-wins).
    expect(sets.filter((s) => s.tabPermissions?.[PSA_APP] === 'visible').map((s) => s.name)).toEqual(['sales_manager']);
    for (const name of ['project_manager', 'project_member', 'finance_controller']) {
      const set = sets.find((s) => s.name === name);
      expect(set, name).toBeTruthy();
      expect(set!.tabPermissions?.[PSA_APP], name).toBeUndefined();
    }
  });
});

/**
 * Disabling the module takes its app away, and leaves the rest of the suite as
 * it was (the plan's phase-0 acceptance: "a disabled PSA module drops its app,
 * menu, fields and pages"; in phase 0 the app IS the module's whole surface).
 * Measured on the shipped app booted by `@objectstack/verify`.
 */
describe('with the module disabled (#2316)', () => {
  const PKG = '/packages/app.objectstack.hotcrm.psa';
  let verify: VerifyStack;
  let admin: string;

  beforeAll(async () => {
    verify = await hotcrmStack();
    admin = await verify.signIn();
  }, 120_000);

  afterAll(async () => {
    await verify?.apiAs(admin, 'PATCH', `${PKG}/enable`);
  });

  const appStatus = async (name: string): Promise<number> => (await verify.apiAs(admin, 'GET', `/meta/app/${name}`)).status;
  const offered = async (): Promise<string[]> => {
    const res = await verify.apiAs(admin, 'GET', '/me/apps');
    const body = (await res.json()) as AnyRec;
    const list = ((body.data ?? body).apps ?? body.data ?? body) as AnyRec[];
    return list.map((a) => String(a.name)).filter((n) => n.startsWith('crm_')).sort();
  };

  it('the Project Delivery app is not served or offered, the other four apps are, and it comes back on enable', async () => {
    expect(await appStatus(PSA_APP)).toBe(200);
    expect(await offered()).toContain(PSA_APP);
    expect((await verify.apiAs(admin, 'PATCH', `${PKG}/disable`)).status).toBe(200);
    expect(await appStatus(PSA_APP)).toBe(404);
    // Its objects go with it (phase 1a): a project is not served while it is off.
    expect((await verify.apiAs(admin, 'GET', '/meta/object/crm_project')).status).toBe(404);
    expect(await offered()).toEqual(['crm_enterprise', 'crm_marketing', 'crm_o2c', 'crm_service']);
    for (const app of ['crm_enterprise', 'crm_service', 'crm_marketing', 'crm_o2c']) expect(await appStatus(app), app).toBe(200);
    expect((await verify.apiAs(admin, 'PATCH', `${PKG}/enable`)).status).toBe(200);
    expect(await appStatus(PSA_APP)).toBe(200);
    expect(await offered()).toContain(PSA_APP);
    expect((await verify.apiAs(admin, 'GET', '/meta/object/crm_project')).status).toBe(200);
  });
});
