// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import artifact from '../objectstack.config';
import { packageStacks } from '../objectstack.composition';
import { servedApp, packFor } from './helpers/composed-stack';

type AnyRec = Record<string, any>;

/**
 * ═══ Order to Cash is a module of this artifact, filling one group (#2315) ═══
 *
 * `app.objectstack.hotcrm.o2c` (`src/o2c/index.ts`, REQ-0007) is a
 * `type: 'module'` package of the ONE HotCRM artifact, disabled per tenant by
 * whoever does not use it — the plan's *Recorded 2026-11-05*, which replaced
 * the 2026-10-26 "born standalone" shape after phase 0 measured that a
 * separately built app cannot hold a master-detail into `crm_contract` on
 * 18.3.0. These are the facts that ruling makes about the package and its seam
 * into the app's menu; its version and range are
 * `test/docs-declared-versions.test.ts`'s, read off the same `packages[]`.
 */

const O2C_ID = 'app.objectstack.hotcrm.o2c';
const APP_ID = 'app.objectstack.hotcrm';
// The Sales app keeps the collection plan only (#2465); finance works in the
// module's own app.
const GROUP = 'group_collection_plan';
const O2C_APP = 'crm_o2c';

const bodies: AnyRec[] = (((artifact as AnyRec).packages ?? []) as AnyRec[]).map(
  (entry) => (entry?.manifest ?? {}) as AnyRec,
);

describe('Order to Cash ships inside the HotCRM artifact (#2315)', () => {
  const o2c = bodies.find((body) => body.id === O2C_ID);

  it('the artifact carries it as a module of the crm namespace', () => {
    expect(o2c, `packages[] carries no ${O2C_ID}`).toBeDefined();
    expect(o2c!.type).toBe('module');
    expect(o2c!.namespace).toBe('crm');
  });

  it('it depends on the app package and on nothing else (one dependency level)', () => {
    expect(Object.keys(o2c!.dependencies ?? {})).toEqual([APP_ID]);
  });

  it('it fills the Sales group the app keeps for the collection plan, and adds its manual under Help', () => {
    expect((o2c!.navigationContributions ?? []).map((c: AnyRec) => [c.app, c.group])).toEqual([
      ['crm_enterprise', GROUP],
      ['crm_enterprise', 'group_help'],
    ]);
    // #2465: the Sales group lists the collection plan alone; invoices and
    // payments are finance's, in the module's own app.
    const items = (o2c!.navigationContributions[0].items ?? []) as AnyRec[];
    expect(items.map((i) => i.objectName)).toEqual(['crm_billing_milestone']);
    const group = (servedApp('crm_enterprise').navigation as AnyRec[]).find((n) => n.id === GROUP);
    expect(group?.type).toBe('group');
  });

  it.each(['en', 'zh-CN', 'es-ES', 'ja-JP'])('the %s pack labels the group', (locale) => {
    expect(packFor(locale)?.apps?.crm_enterprise?.navigation?.[GROUP]?.label).toEqual(expect.any(String));
  });

  it('zh-CN uses the name the maintainer chose', () => {
    expect(packFor('zh-CN')?.apps?.crm_enterprise?.navigation?.[GROUP]?.label).toBe('回款计划');
  });
});

describe('Order to Cash is its own app, finance\'s (#2465)', () => {
  const o2c = bodies.find((body) => body.id === O2C_ID);
  const walk = (nodes: AnyRec[]): AnyRec[] =>
    nodes.flatMap((n) => (n.type === 'group' ? walk((n.children ?? []) as AnyRec[]) : [n]));

  it('the module declares it, and nothing else declares an app of that name', () => {
    const owners = (packageStacks as AnyRec[]).filter((e) => ((e.apps ?? []) as AnyRec[]).some((a) => a.name === O2C_APP)).map((e) => e.manifest?.id);
    expect(owners).toEqual([O2C_ID]);
    expect(o2c).toBeDefined();
  });

  it('opens on the invoices, and carries payments, the collection plan, the two working views, contracts, accounts and the manual', () => {
    const items = walk(servedApp(O2C_APP).navigation as AnyRec[]);
    expect(items[0]).toMatchObject({ objectName: 'crm_invoice' });
    const objects = items.filter((i) => i.type === 'object').map((i) => `${i.objectName}${i.viewName ? `/${i.viewName}` : ''}`);
    expect(objects).toEqual(expect.arrayContaining([
      'crm_invoice', 'crm_payment', 'crm_billing_milestone',
      'crm_billing_milestone/overdue_billing_milestones', 'crm_billing_milestone/planned_this_month',
      'crm_contract', 'crm_account',
    ]));
    // Overdue is measured on the payment plan (hotcrm#2806): it replaced Overdue Invoices.
    expect(objects).not.toContain('crm_invoice/overdue_invoices');
    expect(items.filter((i) => i.type === 'doc').map((i) => i.book)).toEqual(['crm_o2c_manual']);
  });

  it('the Sales app no longer lists invoices or payments', () => {
    const objects = walk(servedApp('crm_enterprise').navigation as AnyRec[]).map((i) => i.objectName);
    expect(objects).not.toContain('crm_invoice');
    expect(objects).not.toContain('crm_payment');
    expect(objects).toContain('crm_billing_milestone');
  });

  it.each(['en', 'zh-CN', 'es-ES', 'ja-JP'])('the %s pack labels the app', (locale) => {
    expect(packFor(locale)?.apps?.[O2C_APP]?.label).toEqual(expect.any(String));
  });

  it('zh-CN uses the name the maintainer chose', () => {
    expect(packFor('zh-CN')?.apps?.[O2C_APP]?.label).toBe('订单与回款');
  });
});
