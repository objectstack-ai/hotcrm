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
const EXPENSE_ID = 'app.objectstack.hotcrm.expense';

const bodies: AnyRec[] = (((artifact as AnyRec).packages ?? []) as AnyRec[]).map(
  (entry) => (entry?.manifest ?? {}) as AnyRec,
);
const walk = (nodes: AnyRec[]): AnyRec[] =>
  nodes.flatMap((n) => (n.type === 'group' ? walk((n.children ?? []) as AnyRec[]) : [n]));

describe('Project Delivery ships inside the HotCRM artifact (#2316)', () => {
  const psa = bodies.find((body) => body.id === PSA_ID);

  it('the artifact carries it as a module of the crm namespace, after the expense module it depends on', () => {
    expect(psa, `packages[] carries no ${PSA_ID}`).toBeDefined();
    expect(psa!.type).toBe('module');
    expect(psa!.namespace).toBe('crm');
    const ids = bodies.map((b) => b.id);
    expect(ids.indexOf(PSA_ID)).toBe(ids.indexOf(EXPENSE_ID) + 1);
    expect(ids.indexOf(EXPENSE_ID)).toBe(ids.indexOf('app.objectstack.hotcrm.o2c') + 1);
  });

  it('it depends on the app package and the expense module (hotcrm#2556) — not on Order to Cash (ruling 4)', () => {
    expect(Object.keys(psa!.dependencies ?? {})).toEqual([APP_ID, EXPENSE_ID]);
  });

  it('it contributes the Project field to the expense and its report, and owns no expense metadata of its own (hotcrm#2556, hotcrm#2559)', () => {
    const stack = (packageStacks as AnyRec[]).find((s) => s.manifest?.id === PSA_ID)!;
    expect(((stack.objectExtensions ?? []) as AnyRec[]).map((e) => [e.extend, Object.keys(e.fields)]))
      .toEqual([['crm_expense', ['crm_project']], ['crm_expense_report', ['crm_project']]]);
    expect(((stack.views ?? []) as AnyRec[]).flatMap((v) => Object.values(v.listViews ?? {}) as AnyRec[]).map((lv) => lv.data?.object ?? lv.object))
      .not.toContain('crm_expense');
    expect(((stack.sharingRules ?? []) as AnyRec[]).map((r) => r.object)).not.toContain('crm_expense');
  });

  it('it owns its eight objects, their thirteen hooks and its seed rows (phases 1a, 1b, 2a, 2b and 2c; the expense left in hotcrm#2556)', () => {
    const stack = (packageStacks as AnyRec[]).find((s) => s.manifest?.id === PSA_ID)!;
    expect(((stack.objects ?? []) as AnyRec[]).map((o) => o.name).sort()).toEqual([
      'crm_project', 'crm_project_budget', 'crm_project_budget_line', 'crm_project_member', 'crm_project_task',
      'crm_rate_card', 'crm_time_entry', 'crm_timesheet',
    ]);
    expect(((stack.hooks ?? []) as AnyRec[]).map((h) => h.name).sort()).toEqual([
      'project_budget_baseline', 'project_budget_follow', 'project_budget_line_amount', 'project_budget_rules',
      'project_budget_status', 'project_member_unique', 'project_status_guard', 'project_task_progress', 'project_task_rules', 'project_team_sync', 'time_entry_costing', 'time_entry_timesheet', 'timesheet_stamps',
    ]);
    expect([...new Set(((stack.data ?? []) as AnyRec[]).map((d) => d.object))].sort()).toEqual([
      'crm_project', 'crm_project_budget', 'crm_project_budget_line', 'crm_project_task', 'crm_rate_card',
    ]);
  });

  it('it owns its approval and budget flows and the budget notices\' templates (phase 1b)', () => {
    const stack = (packageStacks as AnyRec[]).find((s) => s.manifest?.id === PSA_ID)!;
    expect(((stack.flows ?? []) as AnyRec[]).map((f) => f.name).sort()).toEqual([
      'project_budget_alert', 'project_budget_approval',
      'project_initiation_approval', 'timesheet_approval', 'timesheet_approval_on_create',
    ]);
    expect([...new Set(((stack.emailTemplates ?? []) as AnyRec[]).map((t) => t.name))].sort()).toEqual([
      'crm.project_budget_exceeded', 'crm.project_budget_warning',
    ]);
  });
  it('it owns its datasets, the Projects Overview dashboard and its manual (phase 1c)', () => {
    const stack = (packageStacks as AnyRec[]).find((s) => s.manifest?.id === PSA_ID)!;
    expect(((stack.datasets ?? []) as AnyRec[]).map((d) => d.name).sort()).toEqual(['project_financials', 'time_utilization']);
    const dashboards = (stack.dashboards ?? []) as AnyRec[];
    expect(dashboards.map((d) => d.name)).toEqual(['projects_overview']);
    // A dashboard reads only the datasets of its own package's closure (18.4.0):
    // every widget binds one of the module's own two.
    const bound = new Set(((dashboards[0].widgets ?? []) as AnyRec[]).map((w) => w.dataset ?? w.datasetName ?? w.data?.dataset));
    expect([...bound].sort()).toEqual(['project_financials', 'time_utilization']);
    // No date picker: windowing projects by a date cuts a running project out of its figures.
    expect(dashboards[0].dateRange).toBeUndefined();
    expect(((stack.books ?? []) as AnyRec[]).map((b) => b.name)).toEqual(['crm_psa_manual']);
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
    expect(nav.map((n) => n.id)).toEqual(['group_projects', 'group_time_expenses', 'group_rates', 'group_customers', 'group_work', 'group_help']);
    const objects = walk(nav).filter((i) => i.type === 'object').map((i) => `${i.objectName}${i.viewName ? `/${i.viewName}` : ''}`);
    expect(objects).toEqual([
      'crm_project', 'crm_project/my_projects', 'crm_project_member', 'crm_project_budget',
      'crm_project_task/project_plan', 'crm_project_task/my_project_tasks',
      'crm_time_entry/my_week_time', 'crm_timesheet/my_week_timesheets',
      // The two expense lists are the expense module's contribution since
      // hotcrm#2556, so they follow the group's own timesheet entries; the
      // approver's list is the report's since hotcrm#2559.
      'crm_timesheet/my_timesheets', 'crm_timesheet/timesheets_to_approve', 'crm_expense/my_expenses', 'crm_expense_report/expense_reports_to_approve',
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

  it('Projects Overview sits under Projects, out of a plain team member\'s sidebar, and the manual under Help (phase 1c)', () => {
    const items = walk(servedApp(PSA_APP).navigation as AnyRec[]);
    const overview = items.find((i) => i.id === 'nav_projects_overview')!;
    expect(overview).toMatchObject({ type: 'dashboard', dashboardName: 'projects_overview' });
    // A team member reads the project but not its cost (FLS), so every money
    // tile would answer 403: the entry is held back from them by position.
    const visible = String(overview.visible?.source ?? overview.visible);
    expect(visible).toContain('current_user.can("crm_project", "read")');
    expect(visible).toContain('!("crm_project_member" in current_user.positions)');
    expect(items.find((i) => i.id === 'nav_help_psa')).toMatchObject({ type: 'doc', book: 'crm_psa_manual' });
  });

  it('Opportunities is held back from a plain team member, and kept for anyone who works with deals (ruling D)', () => {
    const items = walk(servedApp(PSA_APP).navigation as AnyRec[]);
    const opp = items.find((i) => i.id === 'nav_opportunity')!;
    expect(opp).toMatchObject({ type: 'object', objectName: 'crm_opportunity' });
    // Every member reads their own deals through `crm_user`, so object read
    // alone left a consultant an empty list here.
    const visible = String(opp.visible?.source ?? opp.visible);
    expect(visible).toContain('current_user.can("crm_opportunity", "read")');
    expect(visible).toContain('!("crm_project_member" in current_user.positions)');
    for (const kept of ['crm_project_manager', 'crm_finance_controller', 'crm_sales_rep', 'crm_marketing_user']) {
      expect(visible, kept).toContain(`"${kept}" in current_user.positions`);
    }
    // Accounts stay: ruling D gives the member the customer.
    expect(items.find((i) => i.id === 'nav_account')?.visible).toBeUndefined();
  });

  it('zh-CN uses the name the maintainer chose', () => {
    expect(packFor('zh-CN')?.apps?.[PSA_APP]?.label).toBe('项目交付');
  });

  it('rep, service, marketing and AR sets hide it; the sales manager and leadership state it; the delivery sets are silent', () => {
    const sets = Object.values(profiles) as AnyRec[];
    const hiding = sets.filter((s) => s.tabPermissions?.[PSA_APP] === 'hidden').map((s) => s.name).sort();
    // The service director sees the Service app only, as the service team (#2490).
    expect(hiding).toEqual(['ar_accountant', 'marketing_user', 'sales_rep', 'service_agent', 'service_director']);
    // The manager states it beside the other four apps, as for Order to Cash,
    // so a set that hides it cannot take it away (most-visible-wins).
    // Leadership shows the manager's apps (#2492).
    expect(sets.filter((s) => s.tabPermissions?.[PSA_APP] === 'visible').map((s) => s.name).sort()).toEqual(['sales_leadership', 'sales_manager']);
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
    expect(await offered()).toEqual(['crm_enterprise', 'crm_expenses', 'crm_marketing', 'crm_o2c', 'crm_service']);
    for (const app of ['crm_enterprise', 'crm_service', 'crm_marketing', 'crm_o2c', 'crm_expenses']) expect(await appStatus(app), app).toBe(200);
    expect((await verify.apiAs(admin, 'PATCH', `${PKG}/enable`)).status).toBe(200);
    expect(await appStatus(PSA_APP)).toBe(200);
    expect(await offered()).toContain(PSA_APP);
    expect((await verify.apiAs(admin, 'GET', '/meta/object/crm_project')).status).toBe(200);
  });
});
