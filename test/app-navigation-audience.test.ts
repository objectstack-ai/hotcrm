// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import { P } from '@objectstack/spec';
import type { VerifyStack } from '@objectstack/verify';
import { CrmApp } from '../src/sales/apps/crm.app';
import { CrmPositions } from '../src/sales/sharing/positions';
import { DemoOrgStaffing } from '../src/sales/sharing/demo-staffing';
import { servedApp } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Who is shown which sidebar entry, persona by persona (#2244).
 *
 * A sales rep's permission set reads cases, so until #2244 the case read gate
 * kept Service Overview, Cases, My Cases and the three case reports in a rep's
 * sidebar: 6 of 34 entries for work a rep does not do. The service module now
 * also asks that the member does not hold the `sales_rep` position, the same
 * question the app's Home gate asks.
 *
 * This pins the sidebar each persona is SHOWN, the way the console draws it:
 * every entry of the served tree (the app's own entries and the service
 * module's contributions, merged by the platform registry), kept when its
 * `visible` evaluates true against the caller's positions and the effective
 * object permissions the server publishes at `/auth/me/permissions`, and an
 * object entry kept only when its object is read. Because the console opens
 * the app on the first entry shown (objectui#12426), the same list pins each
 * persona's landing (#2060 item 5).
 *
 * The personas are the five the demo staffs (`demo-staffing.ts`: two reps, the
 * sales manager, the service agent, the service manager), each signed up with
 * its position and the sets the position declares, plus the administrator.
 * Each also holds what the platform gives every member (the package's
 * `isDefault` set, `crm_user`, since #2231): measured here, not modelled.
 *
 * "Unchanged" is pinned against the gates these six entries carried before
 * #2244 (`BEFORE`): no gate on the three service entries, case read on the
 * three reports. Every persona but the reps must be shown exactly what those
 * gates showed it, and every persona's first entry must be the same.
 *
 * #2262 pins the service personas' landing the same way, against the gates
 * Home and Sales Home carried before it (`BEFORE_2262`).
 */

const NAV = (servedApp((CrmApp as Rec).name).navigation ?? []) as Rec[];
const LEAVES: Rec[] = (() => {
  const walk = (nodes: Rec[]): Rec[] =>
    nodes.flatMap((n) => (n.type === 'group' ? walk((n.children ?? []) as Rec[]) : [n]));
  return walk(NAV);
})();

/** The six entries a rep no longer sees (#2244). Knowledge is not one of them. */
const SERVICE_ONLY = [
  'nav_service_dashboard', 'nav_case', 'nav_my_cases',
  'nav_report_cases_by_status', 'nav_report_sla', 'nav_report_cases_opened_by_day',
];

/** The gates the six carried before #2244. */
const READS_CASES = P`current_user.can("crm_case", "read")`;
const BEFORE: Record<string, unknown> = {
  nav_service_dashboard: undefined, nav_case: undefined, nav_my_cases: undefined,
  nav_report_cases_by_status: READS_CASES, nav_report_sla: READS_CASES, nav_report_cases_opened_by_day: READS_CASES,
};

/** The gates Home and Sales Home carried before #2262: neither asked a service position. */
const BEFORE_2262: Record<string, unknown> = {
  nav_home: P`current_user.can("crm_opportunity", "read") && !("sales_rep" in current_user.positions)`,
  nav_sales_home: P`current_user.can("crm_opportunity", "read")`,
};

const PERSONAS = ['na_rep', 'eu_rep', 'sales_manager', 'service_agent', 'service_manager'] as const;
const REPS = ['na_rep', 'eu_rep'];

let verify: VerifyStack;
const who: Record<string, Person & { positions: string[]; objects: Rec }> = {};

const permissionsOf = async (token: string): Promise<Rec> => {
  const res = await verify.apiAs(token, 'GET', '/auth/me/permissions');
  expect(res.status, await res.clone().text()).toBe(200);
  const body: Rec = await res.json();
  const objects = (body.data ?? body).objects;
  expect(objects, 'the permissions answer carries no objects map').toBeTruthy();
  return objects;
};

beforeAll(async () => {
  verify = await hotcrmStack();
  for (const key of PERSONAS) {
    const member = DemoOrgStaffing.find((m) => m.key === key)!;
    const positions = [...member.positions];
    const sets = positions.flatMap((p) => CrmPositions.find((c) => c.name === p)?.permissionSets ?? []);
    const person = await signUpPerson(verify, `${key}@nav-audience.test`, {
      name: `Nav ${key}`, positions, permissionSets: sets,
    });
    who[key] = { ...person, positions, objects: await permissionsOf(person.token) };
  }
  const token = await verify.signIn();
  const context = (await verify.contextFor(token)) as Rec;
  who.admin = {
    token,
    id: String(context.userId),
    positions: (context.positions ?? []) as string[],
    objects: await permissionsOf(token),
  };
}, 180_000);

/** The entries `persona` is shown, in sidebar order; `before` evaluates the entries it names with those gates instead. */
const shownTo = (persona: string, before?: Record<string, unknown>): string[] => {
  const p = who[persona]!;
  return LEAVES.filter((n) => {
    if (n.type === 'object' && p.objects[n.objectName]?.allowRead !== true) return false;
    const visible = before && n.id in before ? before[n.id] : n.visible;
    if (visible === undefined) return true;
    const result = ExpressionEngine.evaluate<boolean>(visible as never, {
      user: { id: p.id, positions: p.positions },
      permissions: p.objects as never,
    });
    expect(result.ok, `${n.id}.visible did not evaluate for ${persona}: ${JSON.stringify(result)}`).toBe(true);
    return (result as Rec).value === true;
  }).map((n) => n.id as string);
};

describe('a sales rep is not shown the service entries (#2244)', () => {
  it('reads a real served tree that carries all six entries', () => {
    expect(LEAVES.length).toBeGreaterThan(20);
    expect(SERVICE_ONLY.filter((id) => !LEAVES.some((n) => n.id === id))).toEqual([]);
  });

  it('both demo reps hold the sales_rep position and read cases, so the position is what hides them', () => {
    for (const rep of REPS) {
      expect(who[rep]!.positions, rep).toContain('sales_rep');
      expect(who[rep]!.objects.crm_case?.allowRead, rep).toBe(true);
    }
  });

  it.each(REPS)('%s is shown none of the six, and still Knowledge', (rep) => {
    const shown = shownTo(rep);
    expect(shown.filter((id) => SERVICE_ONLY.includes(id))).toEqual([]);
    expect(shown).toContain('nav_knowledge');
  });

  it.each(['sales_manager', 'service_agent', 'service_manager', 'admin'])(
    '%s is shown all six, as before',
    (persona) => {
      expect(who[persona]!.positions, persona).not.toContain('sales_rep');
      expect(SERVICE_ONLY.filter((id) => !shownTo(persona).includes(id))).toEqual([]);
    },
  );

  it('the two reps are shown the same sidebar: the sales manager\'s, less Home and the six', () => {
    const manager = shownTo('sales_manager');
    for (const rep of REPS) {
      expect(shownTo(rep), rep).toEqual(manager.filter((id) => id !== 'nav_home' && !SERVICE_ONLY.includes(id)));
    }
  });
});

describe("no other persona's sidebar or landing moves (#2060 item 5, #2244)", () => {
  const ALL = [...PERSONAS, 'admin'];

  it('the pre-#2244 gates showed every persona all six (a rep included), so the comparison is real', () => {
    for (const persona of ALL) {
      expect(SERVICE_ONLY.filter((id) => !shownTo(persona, BEFORE).includes(id)), persona).toEqual([]);
    }
  });

  it.each(['sales_manager', 'service_agent', 'service_manager', 'admin'])('%s is shown exactly the sidebar it was shown before', (persona) => {
    expect(shownTo(persona)).toEqual(shownTo(persona, BEFORE));
  });

  it.each(REPS)('%s is shown its old sidebar less the six, nothing else', (rep) => {
    expect(shownTo(rep)).toEqual(shownTo(rep, BEFORE).filter((id) => !SERVICE_ONLY.includes(id)));
  });

  it.each(ALL)('%s lands where it landed before', (persona) => {
    expect(shownTo(persona)[0]).toBe(shownTo(persona, BEFORE)[0]);
  });

  // The ruled homes this app's order is built for, one per persona.
  it.each([
    ['na_rep', 'nav_sales_home'],
    ['eu_rep', 'nav_sales_home'],
    ['sales_manager', 'nav_home'],
    ['service_agent', 'nav_service_dashboard'],
    ['service_manager', 'nav_service_dashboard'],
    ['admin', 'nav_home'],
  ])('%s lands on %s', (persona, landing) => {
    expect(shownTo(persona)[0]).toBe(landing);
  });
});

describe('a service persona lands on Service Overview again (#2262)', () => {
  const SERVICE = ['service_agent', 'service_manager'];
  const PINNED = ['nav_home', 'nav_sales_home'];

  it.each(SERVICE)('%s reads opportunities (crm_user, since #2231), so its position is what hides Home and Sales Home', (persona) => {
    expect(who[persona]!.positions).toContain(persona);
    expect(who[persona]!.objects.crm_opportunity?.allowRead).toBe(true);
  });

  it.each(SERVICE)('the gates before #2262 opened %s on Home', (persona) => {
    expect(shownTo(persona, BEFORE_2262)[0]).toBe('nav_home');
  });

  it.each(SERVICE)('%s is shown its old sidebar less Home and Sales Home, nothing else', (persona) => {
    expect(shownTo(persona)).toEqual(shownTo(persona, BEFORE_2262).filter((id) => !PINNED.includes(id)));
  });

  it.each([...REPS, 'sales_manager', 'admin'])('%s is shown exactly the sidebar it was shown before', (persona) => {
    expect(shownTo(persona)).toEqual(shownTo(persona, BEFORE_2262));
  });
});
