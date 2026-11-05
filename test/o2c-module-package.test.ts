// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import artifact from '../objectstack.config';
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
const GROUP = 'group_order_to_cash';

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

  it('it fills the app group the app keeps for it, and adds its manual under Help', () => {
    expect((o2c!.navigationContributions ?? []).map((c: AnyRec) => [c.app, c.group])).toEqual([
      ['crm_enterprise', GROUP],
      ['crm_enterprise', 'group_help'],
    ]);
    // Phase 1a (#2315): the group lists the module's three objects.
    const items = (o2c!.navigationContributions[0].items ?? []) as AnyRec[];
    expect(items.map((i) => i.objectName)).toEqual(['crm_billing_milestone', 'crm_invoice', 'crm_payment']);
    const group = (servedApp('crm_enterprise').navigation as AnyRec[]).find((n) => n.id === GROUP);
    expect(group?.type).toBe('group');
  });

  it.each(['en', 'zh-CN', 'es-ES', 'ja-JP'])('the %s pack labels the group', (locale) => {
    expect(packFor(locale)?.apps?.crm_enterprise?.navigation?.[GROUP]?.label).toEqual(expect.any(String));
  });

  it('zh-CN uses the name the maintainer chose', () => {
    expect(packFor('zh-CN')?.apps?.crm_enterprise?.navigation?.[GROUP]?.label).toBe('订单与回款');
  });
});
