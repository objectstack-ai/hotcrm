// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * ═══ A module turned off takes the app's actions into it along (#2383) ═══
 *
 * Three app-package actions launch a module's flow: `create_campaign` on
 * `crm_lead` and `add_contact_to_campaign` on `crm_contact` (marketing), and
 * `generate_quote` on `crm_opportunity` (revenue). A customer who disables the
 * module should not be offered them.
 *
 * Measured on 18.3.0 (2026-11-04), before writing anything: the platform
 * withholds all three on its own (objectstack#28877). With the module disabled
 * through `PATCH /packages/ID/disable`, `/meta/action` stops listing the
 * action and its by-name read answers 404; the console's record header, its
 * "More actions" menu and the list row menu no longer draw it; and
 * `/auth/me/permissions` leaves the module's objects out, so a
 * `current_user.can(...)` gate would answer false as well. The app therefore
 * adds no `visible` gate of its own — a hand-written copy of the platform's
 * rule is what AGENTS.md "Scope" rule 2 forbids — and this suite pins the
 * platform behaviour the app relies on, with the enabled control beside each.
 *
 * The suite disables a module on the shared stack, so each case enables it
 * again before it returns, pass or fail.
 */

let verify: VerifyStack;
let admin: string;

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
}, 120_000);

const MARKETING = 'app.objectstack.hotcrm.marketing';
const REVENUE = 'app.objectstack.hotcrm.revenue';

const body = async (res: Response): Promise<Rec> => {
  const json = (await res.json()) as Rec;
  return (json.data ?? json) as Rec;
};

const setEnabled = async (pkg: string, enabled: boolean): Promise<void> => {
  const res = await verify.apiAs(admin, 'PATCH', `/packages/${pkg}/${enabled ? 'enable' : 'disable'}`);
  expect(res.status, `${pkg} ${enabled ? 'enable' : 'disable'}`).toBe(200);
};

/** The names `/meta/action` serves, with the object each is bound to. */
const servedActions = async (): Promise<Set<string>> => {
  const res = await verify.apiAs(admin, 'GET', '/meta/action');
  expect(res.status).toBe(200);
  const data = await body(res);
  const items = (Array.isArray(data) ? data : (data.items ?? data.actions ?? [])) as Rec[];
  return new Set(items.map((a) => `${a.objectName}.${a.name}`));
};

const byName = async (name: string): Promise<number> =>
  (await verify.apiAs(admin, 'GET', `/meta/action/${name}`)).status;

/** What `current_user.can(object, 'create')` reads: the caller's effective object permissions. */
const canCreate = async (object: string): Promise<boolean> => {
  const res = await verify.apiAs(admin, 'GET', '/auth/me/permissions');
  expect(res.status).toBe(200);
  const objects = ((await body(res)).objects ?? {}) as Rec;
  return objects[object]?.allowCreate === true;
};

/** Disable `pkg`, run `measure`, and enable it again whatever happened. */
const withDisabled = async (pkg: string, measure: () => Promise<void>): Promise<void> => {
  await setEnabled(pkg, false);
  try {
    await measure();
  } finally {
    await setEnabled(pkg, true);
  }
};

const CASES = [
  { action: 'create_campaign', object: 'crm_lead', module: MARKETING, writes: 'crm_campaign_member' },
  { action: 'add_contact_to_campaign', object: 'crm_contact', module: MARKETING, writes: 'crm_campaign_member' },
  { action: 'generate_quote', object: 'crm_opportunity', module: REVENUE, writes: 'crm_quote' },
] as const;

describe('an action that launches into a module is withheld while the module is off (#2383)', () => {
  for (const c of CASES) {
    it(`${c.object}.${c.action}: served with ${c.module} on, withheld with it off, back on re-enable`, async () => {
      // Control leg: the module on, the action is served.
      expect((await servedActions()).has(`${c.object}.${c.action}`)).toBe(true);
      expect(await byName(c.action)).toBe(200);
      expect(await canCreate(c.writes)).toBe(true);

      await withDisabled(c.module, async () => {
        expect((await servedActions()).has(`${c.object}.${c.action}`)).toBe(false);
        expect(await byName(c.action)).toBe(404);
        expect(await canCreate(c.writes)).toBe(false);
      });

      // Enabling the module brings it back unchanged.
      expect((await servedActions()).has(`${c.object}.${c.action}`)).toBe(true);
      expect(await byName(c.action)).toBe(200);
    }, 60_000);
  }
});
