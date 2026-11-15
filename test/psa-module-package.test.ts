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
 * 项目交付. Phase 0 is the skeleton: the module owns no object yet, so every
 * entry of its app is contributed by the app package into anchor groups. Its
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

  it('in phase 0 it owns no object, hook or seed row', () => {
    const stack = (packageStacks as AnyRec[]).find((s) => s.manifest?.id === PSA_ID)!;
    expect(stack.objects ?? []).toEqual([]);
    expect(stack.hooks ?? []).toEqual([]);
    expect(stack.data ?? []).toEqual([]);
  });
});

describe('Project Delivery is its own app (#2316)', () => {
  it('the module declares it, and nothing else declares an app of that name', () => {
    const owners = (packageStacks as AnyRec[])
      .filter((s) => ((s.apps ?? []) as AnyRec[]).some((a) => a.name === PSA_APP))
      .map((s) => s.manifest?.id);
    expect(owners).toEqual([PSA_ID]);
  });

  it('its customer and work entries arrive from the app package through anchor groups', () => {
    const nav = servedApp(PSA_APP).navigation as AnyRec[];
    expect(nav.map((n) => n.id)).toEqual(['group_customers', 'group_work']);
    const objects = walk(nav).filter((i) => i.type === 'object').map((i) => `${i.objectName}${i.viewName ? `/${i.viewName}` : ''}`);
    expect(objects).toEqual(['crm_account', 'crm_opportunity', 'crm_contract', 'crm_task/my_open_tasks']);
    // The app's own `navigation` names no foreign object (ADR-0130): those
    // groups are empty in the module's source.
    const own = (packageStacks as AnyRec[]).find((s) => s.manifest?.id === PSA_ID)!.apps[0];
    expect(walk(own.navigation as AnyRec[]).filter((i) => i.type === 'object')).toEqual([]);
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

  it('while it is a skeleton, every business permission set hides it and the administrators are silent', () => {
    const sets = Object.values(profiles) as AnyRec[];
    const hiding = sets.filter((s) => s.tabPermissions?.[PSA_APP] === 'hidden').map((s) => s.name).sort();
    expect(hiding).toEqual(['ar_accountant', 'marketing_user', 'sales_manager', 'sales_rep', 'service_agent']);
    expect(sets.filter((s) => s.tabPermissions?.[PSA_APP] === 'visible').map((s) => s.name)).toEqual([]);
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
  });

  afterAll(async () => {
    await verify.apiAs(admin, 'PATCH', `${PKG}/enable`);
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
    expect(await offered()).toEqual(['crm_enterprise', 'crm_marketing', 'crm_o2c', 'crm_service']);
    for (const app of ['crm_enterprise', 'crm_service', 'crm_marketing', 'crm_o2c']) expect(await appStatus(app), app).toBe(200);
    expect((await verify.apiAs(admin, 'PATCH', `${PKG}/enable`)).status).toBe(200);
    expect(await appStatus(PSA_APP)).toBe(200);
    expect(await offered()).toContain(PSA_APP);
  });
});
