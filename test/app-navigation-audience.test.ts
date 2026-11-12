// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import { P } from '@objectstack/spec';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import { SecurityPlugin } from '@objectstack/plugin-security';
import { CrmPositions } from '../src/sales/sharing/positions';
import { DemoOrgStaffing } from '../src/sales/sharing/demo-staffing';
import { servedApp } from './helpers/composed-stack';
import { bootOptions, buildArtifactAgain, hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

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
 * Home and Sales Home carried before it (`BEFORE_2262`), and #2268 pins the
 * six opportunity entries they are no longer shown against the plain read
 * gate those six carried before it (`BEFORE_2268`).
 *
 * #2250 adds the member who holds no HotCRM grant at all (see its block at the
 * end of this file): the console sends them to the platform's access page
 * before it consults this order.
 *
 * #2417 split the one menu into three apps: the Sales app (`crm_enterprise`),
 * the Service app and the Marketing app. Every entry kept its gate and moved
 * whole, so each pin above still holds, asked in the app the entry now lives
 * in: `shownTo` reads one app's served tree, by default the persona's HOME
 * app, the one its launcher offers first (`HOME_APP`). Which apps a
 * persona's launcher offers is measured at `/me/apps` (the last block).
 */

const APPS = ['crm_enterprise', 'crm_service', 'crm_marketing'] as const;
type AppName = (typeof APPS)[number];
const walkLeaves = (nodes: Rec[]): Rec[] =>
  nodes.flatMap((n) => (n.type === 'group' ? walkLeaves((n.children ?? []) as Rec[]) : [n]));
/** Each app's served tree, top level and leaves. */
const TREES = Object.fromEntries(APPS.map((app) => {
  const nav = (servedApp(app).navigation ?? []) as Rec[];
  return [app, { nav, leaves: walkLeaves(nav) }];
})) as Record<AppName, { nav: Rec[]; leaves: Rec[] }>;
/** Every entry of the three apps, once per id: for "is it served at all" questions. */
const LEAVES: Rec[] = APPS.flatMap((app) => TREES[app].leaves)
  .filter((n, i, all) => all.findIndex((o) => o.id === n.id) === i);
/** The app a persona's launcher offers first; everyone else's is the Sales app. */
const HOME_APP: Record<string, AppName> = { service_agent: 'crm_service', service_manager: 'crm_service' };
const homeOf = (persona: string): AppName => HOME_APP[persona] ?? 'crm_enterprise';

/** The six entries a rep no longer sees (#2244). Knowledge was not one of them; it left with #2367 (its block below). */
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

/** Sales Performance, CRM Overview and the four opportunity reports (#2268). */
const OPPORTUNITY_ONLY = [
  'nav_sales_dashboard', 'nav_crm_dashboard',
  'nav_report_opportunities_by_stage', 'nav_report_won_by_owner',
  'nav_report_pipeline_coverage', 'nav_report_funnel_by_owner',
];

/** The gate the six carried before #2268: the read question alone, which `crm_user` answers yes for everyone (#2231). */
const READS_OPPORTUNITIES = P`current_user.can("crm_opportunity", "read")`;
const BEFORE_2268: Record<string, unknown> = Object.fromEntries(OPPORTUNITY_ONLY.map((id) => [id, READS_OPPORTUNITIES]));

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
  // Staffed by nobody in the demo, so signed up here the same way (#2338 item 1).
  const marketer = await signUpPerson(verify, 'marketing_user@nav-audience.test', {
    name: 'Nav marketing_user', positions: ['marketing_user'],
    permissionSets: CrmPositions.find((c) => c.name === 'marketing_user')?.permissionSets ?? [],
  });
  who.marketing_user = { ...marketer, positions: ['marketing_user'], objects: await permissionsOf(marketer.token) };
  const token = await verify.signIn();
  const context = (await verify.contextFor(token)) as Rec;
  who.admin = {
    token,
    id: String(context.userId),
    positions: (context.positions ?? []) as string[],
    objects: await permissionsOf(token),
  };
}, 180_000);

/**
 * The entries `persona` is shown in `app` (its home app by default), in
 * sidebar order; `before` evaluates the entries it names with those gates
 * instead.
 */
const shownTo = (persona: string, before?: Record<string, unknown>, app: AppName = homeOf(persona)): string[] => {
  const p = who[persona]!;
  return TREES[app].leaves.filter((n) => {
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

  it('all six live in the Service app since #2417', () => {
    expect(SERVICE_ONLY.filter((id) => !TREES.crm_service.leaves.some((n) => n.id === id))).toEqual([]);
  });

  it.each(REPS)('%s is shown none of the six, in either app', (rep) => {
    expect(shownTo(rep).filter((id) => SERVICE_ONLY.includes(id))).toEqual([]);
    expect(shownTo(rep, undefined, 'crm_service').filter((id) => SERVICE_ONLY.includes(id))).toEqual([]);
  });

  it.each(['sales_manager', 'service_agent', 'service_manager', 'admin'])(
    '%s is shown all six, as before',
    (persona) => {
      expect(who[persona]!.positions, persona).not.toContain('sales_rep');
      expect(SERVICE_ONLY.filter((id) => !shownTo(persona, undefined, 'crm_service').includes(id))).toEqual([]);
    },
  );

  it('the two reps are shown the same sidebar: the sales manager\'s, less Home and the six (and, since #2367, Knowledge moved into Sales)', () => {
    const manager = shownTo('sales_manager');
    for (const rep of REPS) {
      expect(shownTo(rep).filter((id) => id !== 'nav_knowledge_published'), rep).toEqual(
        manager.filter((id) => id !== 'nav_home' && id !== 'nav_knowledge' && !SERVICE_ONLY.includes(id)),
      );
    }
  });
});

describe("no other persona's sidebar or landing moves (#2060 item 5, #2244)", () => {
  const ALL = [...PERSONAS, 'admin'];

  it('the pre-#2244 gates showed every persona all six (a rep included), so the comparison is real', () => {
    for (const persona of ALL) {
      expect(SERVICE_ONLY.filter((id) => !shownTo(persona, BEFORE, 'crm_service').includes(id)), persona).toEqual([]);
    }
  });

  it.each(['sales_manager', 'service_agent', 'service_manager', 'admin'])('%s is shown exactly the sidebar it was shown before, in both apps', (persona) => {
    for (const app of ['crm_enterprise', 'crm_service'] as const) {
      expect(shownTo(persona, undefined, app), app).toEqual(shownTo(persona, BEFORE, app));
    }
  });

  it.each(REPS)('%s is shown its old sidebar less the six, nothing else, in both apps', (rep) => {
    for (const app of ['crm_enterprise', 'crm_service'] as const) {
      expect(shownTo(rep, undefined, app), app).toEqual(shownTo(rep, BEFORE, app).filter((id) => !SERVICE_ONLY.includes(id)));
    }
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

  // Asked in the Sales app, where the two entries live: the service personas'
  // launcher no longer offers it (#2417), but its address still opens it.
  it.each(SERVICE)('the gates before #2262 opened %s on Home', (persona) => {
    expect(shownTo(persona, BEFORE_2262, 'crm_enterprise')[0]).toBe('nav_home');
  });

  it.each(SERVICE)('%s is shown its old sidebar less Home and Sales Home, nothing else', (persona) => {
    expect(shownTo(persona, undefined, 'crm_enterprise')).toEqual(
      shownTo(persona, BEFORE_2262, 'crm_enterprise').filter((id) => !PINNED.includes(id)),
    );
  });

  it.each([...REPS, 'sales_manager', 'admin'])('%s is shown exactly the sidebar it was shown before', (persona) => {
    expect(shownTo(persona)).toEqual(shownTo(persona, BEFORE_2262));
  });
});

describe('a service persona is not shown the opportunity dashboards and reports (#2268)', () => {
  const SERVICE = ['service_agent', 'service_manager'];
  const OTHERS = [...REPS, 'sales_manager', 'admin'];

  it('reads a real served tree that carries all six entries', () => {
    expect(OPPORTUNITY_ONLY.filter((id) => !LEAVES.some((n) => n.id === id))).toEqual([]);
  });

  // The six live in the Sales app, so they are asked there (#2417).
  const SALES = 'crm_enterprise';

  it.each(SERVICE)('the gate before #2268 showed %s all six: it reads opportunities through crm_user', (persona) => {
    expect(who[persona]!.objects.crm_opportunity?.allowRead).toBe(true);
    expect(OPPORTUNITY_ONLY.filter((id) => !shownTo(persona, BEFORE_2268, SALES).includes(id))).toEqual([]);
  });

  it.each(SERVICE)('%s is shown none of the six', (persona) => {
    expect(shownTo(persona, undefined, SALES).filter((id) => OPPORTUNITY_ONLY.includes(id))).toEqual([]);
  });

  it.each(SERVICE)('%s is shown its old sidebar less the six, nothing else, and the other object entries stay', (persona) => {
    const shown = shownTo(persona, undefined, SALES);
    expect(shown).toEqual(shownTo(persona, BEFORE_2268, SALES).filter((id) => !OPPORTUNITY_ONLY.includes(id)));
    // The object entries stayed with #2268. Two of them, Opportunities and My
    // Deals, left with #2367 (its block below); the rest stay.
    expect(shown).toEqual(expect.arrayContaining(['nav_lead', 'nav_account', 'nav_contact']));
  });

  it.each(SERVICE)('%s still lands on Service Overview', (persona) => {
    expect(shownTo(persona)[0]).toBe('nav_service_dashboard');
  });

  it.each(OTHERS)('%s is shown all six and exactly the sidebar it was shown before', (persona) => {
    const shown = shownTo(persona);
    expect(OPPORTUNITY_ONLY.filter((id) => !shown.includes(id))).toEqual([]);
    expect(shown).toEqual(shownTo(persona, BEFORE_2268));
  });
});

/**
 * Each persona's own work first (#2367, UX card 3, rows 1 and 6).
 *
 * Row 6: Opportunities and My Deals are not offered to the two service
 * personas. They read opportunities through `crm_user` (#2231) and own none,
 * so both lists were always empty for them; the entries now ask the position,
 * as #2268 did for the opportunity dashboards and reports.
 *
 * Row 1: a rep's Service group held Knowledge alone, between Sales Home and
 * Sales. Knowledge now asks the rep position too, so a rep is shown no entry
 * of the group, and a group with no entry shown is not drawn (measured in the
 * 18.2.0 console on the PR): the rep's sidebar runs Sales Home, then Sales.
 * The rep's Knowledge is folded into Sales instead of dropped, as a Published
 * entry only a rep is shown: the console's search box looks for records only
 * in the objects of the entries shown, so without it a rep could no longer
 * find an article.
 *
 * `BEFORE_2367` is the gates the three entries carried before (none), and
 * the folded entry, which did not exist, as an entry nobody is shown.
 */
describe("each persona's own work first: service staff lose the empty deal lists, a rep the one-entry Service group (#2367)", () => {
  const BEFORE_2367: Record<string, unknown> = {
    nav_opportunity: undefined, nav_my_deals: undefined, nav_knowledge: undefined, nav_knowledge_published: P`false`,
  };
  const DEALS = ['nav_opportunity', 'nav_my_deals'];
  const SERVICE = ['service_agent', 'service_manager'];
  const OTHERS = ['sales_manager', 'admin', 'marketing_user'];
  const ALL = [...PERSONAS, 'admin', 'marketing_user'];

  /** An app's served groups, each with the ids of its entries. */
  const groupsOf = (app: AppName) => TREES[app].nav.filter((n) => n.type === 'group').map((g) => ({
    id: g.id as string,
    entries: ((g.children ?? []) as Rec[]).map((c) => c.id as string),
  }));
  const GROUPS = groupsOf('crm_enterprise');
  /** The groups of the Sales app `persona` is shown at least one entry of. */
  const groupsShownTo = (persona: string, before?: Record<string, unknown>): string[] => {
    const shown = shownTo(persona, before, 'crm_enterprise');
    return GROUPS.filter((g) => g.entries.some((id) => shown.includes(id))).map((g) => g.id);
  };

  // The deal lists live in the Sales app and the Service group in HotCRM
  // Service since #2417: each is asked where it lives.
  it.each(SERVICE)('%s reads opportunities, and the gates before #2367 showed it both deal lists', (persona) => {
    expect(who[persona]!.objects.crm_opportunity?.allowRead).toBe(true);
    expect(DEALS.filter((id) => !shownTo(persona, BEFORE_2367, 'crm_enterprise').includes(id))).toEqual([]);
  });

  it.each(SERVICE)('%s is shown its old sidebar less the two deal lists, nothing else', (persona) => {
    expect(shownTo(persona, undefined, 'crm_enterprise')).toEqual(
      shownTo(persona, BEFORE_2367, 'crm_enterprise').filter((id) => !DEALS.includes(id)),
    );
  });

  it.each(REPS)('the gates before #2367 showed %s a Service group of Knowledge alone', (rep) => {
    const before = shownTo(rep, BEFORE_2367, 'crm_service');
    const service = groupsOf('crm_service').find((g) => g.id === 'group_service')!;
    expect(service.entries.filter((id) => before.includes(id))).toEqual(['nav_knowledge']);
  });

  it.each(REPS)('%s is shown no Service group: Sales follows Sales Home, and ends with Knowledge', (rep) => {
    expect(groupsShownTo(rep)).not.toContain('group_service');
    expect(groupsShownTo(rep)[0]).toBe('group_sales');
    expect(shownTo(rep).slice(0, 2)).toEqual(['nav_sales_home', 'nav_lead']);
    const sales = GROUPS.find((g) => g.id === 'group_sales')!.entries.filter((id) => shownTo(rep).includes(id));
    expect(sales.at(-1)).toBe('nav_knowledge_published');
  });

  it.each(REPS)('%s is shown its old sidebar with Knowledge moved, nothing else', (rep) => {
    expect(shownTo(rep).filter((id) => id !== 'nav_knowledge_published')).toEqual(
      shownTo(rep, BEFORE_2367).filter((id) => id !== 'nav_knowledge'),
    );
    expect(shownTo(rep).filter((id) => id.startsWith('nav_knowledge'))).toEqual(['nav_knowledge_published']);
  });

  it('the folded entry opens the published articles, on the object the Service group\'s entry opens', () => {
    const folded = LEAVES.find((n) => n.id === 'nav_knowledge_published')!;
    const plain = LEAVES.find((n) => n.id === 'nav_knowledge')!;
    expect(folded).toMatchObject({ type: 'object', objectName: plain.objectName, viewName: 'published_articles' });
  });

  // Across the apps the persona's launcher offers (#2417, measured at
  // `/me/apps` in the last block): a rep's Published entry in Sales, the
  // Service group's entry for everyone the Service app is offered to. The
  // marketing user is offered Sales and Marketing, neither of which carries
  // Knowledge: they read the articles, and find them by the Service app's
  // address, not their launcher.
  const OFFERED: Record<string, AppName[]> = {
    na_rep: ['crm_enterprise'], eu_rep: ['crm_enterprise'],
    sales_manager: [...APPS], admin: [...APPS],
    service_agent: ['crm_service'], service_manager: ['crm_service'],
    marketing_user: ['crm_enterprise', 'crm_marketing'],
  };
  it.each(ALL)('%s is shown exactly one Knowledge entry across its apps (none for the marketing user)', (persona) => {
    const shown = OFFERED[persona]!.flatMap((app) => shownTo(persona, undefined, app));
    expect(shown.filter((id) => id.startsWith('nav_knowledge')), persona).toHaveLength(
      persona !== 'marketing_user' && who[persona]!.objects.crm_knowledge_article?.allowRead === true ? 1 : 0,
    );
  });

  it.each(OTHERS)('%s is shown exactly the sidebar it was shown before', (persona) => {
    expect(shownTo(persona)).toEqual(shownTo(persona, BEFORE_2367));
  });

  it.each(ALL)('%s lands where it landed before', (persona) => {
    expect(shownTo(persona)[0]).toBe(shownTo(persona, BEFORE_2367)[0]);
  });
});

/**
 * Service Overview is offered only to a member who reads cases (#2338 item 1).
 *
 * The console prunes an object entry by read access, but not a dashboard
 * entry. The marketing user reads no cases, so Cases and My Cases were already
 * pruned from their sidebar, while Service Overview, gated on the rep position
 * alone (`BEFORE_2338`), was offered and refused every tile (measured on
 * 18.2.0). It now asks the read question the case reports ask.
 */
describe('a member who reads no cases is not offered Service Overview (#2338 item 1)', () => {
  const BEFORE_2338: Record<string, unknown> = { nav_service_dashboard: P`!("sales_rep" in current_user.positions)` };
  const OTHERS = [...PERSONAS, 'admin'];

  it('the marketing user reads no cases and holds no sales_rep position', () => {
    expect(who.marketing_user!.objects.crm_case?.allowRead === true).toBe(false);
    expect(who.marketing_user!.positions).not.toContain('sales_rep');
  });

  // Asked in the Service app, where Service Overview lives since #2417.
  it('the gate before #2338 offered them Service Overview, beside no Cases and no My Cases', () => {
    const before = shownTo('marketing_user', BEFORE_2338, 'crm_service');
    expect(before).toContain('nav_service_dashboard');
    expect(before).not.toContain('nav_case');
    expect(before).not.toContain('nav_my_cases');
  });

  it('they are shown their old sidebar less Service Overview, nothing else', () => {
    expect(shownTo('marketing_user', undefined, 'crm_service')).toEqual(
      shownTo('marketing_user', BEFORE_2338, 'crm_service').filter((id) => id !== 'nav_service_dashboard'),
    );
  });

  it.each(OTHERS)('%s is shown exactly the sidebar it was shown before, in the Service app', (persona) => {
    expect(shownTo(persona, undefined, 'crm_service')).toEqual(shownTo(persona, BEFORE_2338, 'crm_service'));
  });
});

/**
 * A member who holds no HotCRM grant lands on the platform's access page, not
 * on Service Overview (#2250, the HotCRM half of objectstack#25338).
 *
 * WHO. On a managed environment an invited member is created holding the
 * platform baseline (`member_default`) alone, and `crm_user` reaches them only
 * once an administrator accepts the package's suggestion (#2231). Until then
 * they read none of the app's objects. The shared boot cannot model them: it
 * hands every member `crm_user` as the self-hosted baseline. So this block
 * boots the app with the platform's SecurityPlugin built bare, exactly as
 * `test/default-permission-set.test.ts` models a managed environment, from a
 * fresh build of the configuration (one configuration holds one live kernel).
 *
 * WHAT THE CONSOLE DOES. Since objectui#13347 (in the 18.1.0 console) the app
 * root asks one question before any landing is chosen: does the app name
 * objects in its navigation, and may the member read none of them? On a yes
 * it renders the platform's "Nothing in HotCRM is available to you yet" page
 * (`data-reason="no-readable-object"`) instead of opening the first entry
 * shown. The gates above never get a say. So the HotCRM half needs no gate of
 * its own, and ⛔ HotCRM authors no access page: what this pins is the app's
 * own fact that such a member reads none of the objects its served tree
 * names, which is what hands them to the platform. Measured in a browser on
 * 18.1.0: the member opens `/_console/` and lands on that page.
 *
 * `landingOf` is that order of questions: the platform's page when every
 * object the served tree names is unread, otherwise the first entry shown.
 */
const PLATFORM_ACCESS_PAGE = 'platform:no-readable-object';
/** The objects an app's served tree names: the console asks its question per app. */
const namedObjects = (app: AppName): string[] =>
  [...new Set(TREES[app].leaves.filter((n) => n.type === 'object').map((n) => n.objectName as string))];
const NAMED_OBJECTS = [...new Set(APPS.flatMap(namedObjects))];

const landingOf = (persona: string, app: AppName = homeOf(persona)): string => {
  const p = who[persona]!;
  if (namedObjects(app).every((o) => p.objects[o]?.allowRead !== true)) return PLATFORM_ACCESS_PAGE;
  return shownTo(persona, undefined, app)[0]!;
};

describe('a member with no HotCRM grant lands on the platform access page (#2250)', () => {
  let managed: VerifyStack;

  beforeAll(async () => {
    managed = await bootStack(await buildArtifactAgain(), bootOptions({ security: new SecurityPlugin() }));
    const person = await signUpPerson(managed, 'no-grant@nav-audience.test', { name: 'Nav no grant' });
    const res = await managed.apiAs(person.token, 'GET', '/auth/me/permissions');
    expect(res.status, await res.clone().text()).toBe(200);
    const body: Rec = await res.json();
    expect((body.data ?? body).permissionSets, 'the managed boot must hand this member no HotCRM set').not.toContain('crm_user');
    const context = (await managed.contextFor(person.token)) as Rec;
    who.no_grant = {
      ...person,
      positions: (context.positions ?? []) as string[],
      objects: (body.data ?? body).objects,
    };
  }, 180_000);

  afterAll(() => managed?.stop());

  it('the served tree names objects, so the console asks the question at all', () => {
    expect(NAMED_OBJECTS.length).toBeGreaterThan(10);
    expect(NAMED_OBJECTS).toEqual(expect.arrayContaining(['crm_case', 'crm_account', 'crm_opportunity']));
  });

  it('the member reads none of them', () => {
    expect(NAMED_OBJECTS.filter((o) => who.no_grant!.objects[o]?.allowRead === true)).toEqual([]);
  });

  // Service Overview was the reported first screen. Since #2338 it asks for
  // case read, so the gates alone now open the app further down, on the
  // Approvals Inbox, which is still a HotCRM entry the platform page preempts.
  it('the gates alone would open the app on a HotCRM entry: the Approvals Inbox since #2338', () => {
    expect(shownTo('no_grant')).not.toContain('nav_service_dashboard');
    expect(shownTo('no_grant')[0]).toBe('nav_approval_requests');
  });

  it('so the member lands on the platform access page, not on any HotCRM entry, in every app', () => {
    for (const app of APPS) expect(landingOf('no_grant', app), app).toBe(PLATFORM_ACCESS_PAGE);
  });

  it.each([
    ['na_rep', 'nav_sales_home'],
    ['eu_rep', 'nav_sales_home'],
    ['sales_manager', 'nav_home'],
    ['service_agent', 'nav_service_dashboard'],
    ['service_manager', 'nav_service_dashboard'],
    ['admin', 'nav_home'],
  ])('%s still lands on %s', (persona, landing) => {
    expect(landingOf(persona)).toBe(landing);
    expect(landingOf(persona)).toBe(shownTo(persona)[0]);
  });
});

/**
 * Which apps each persona's launcher offers (#2417).
 *
 * Visibility, not access: the permission sets' `tabPermissions` make
 * `/me/apps` (what the launcher and the app switcher draw) leave an app out,
 * and its address still opens it. Sets merge most-visible-wins, and every
 * member also holds `crm_user`, which says nothing about apps, so a set's
 * `hidden` is not undone by it (measured on 18.3.0 in a browser, the
 * screenshots are on the PR).
 */
describe("each persona's launcher offers the apps its work needs (#2417)", () => {
  const appsOf = async (persona: string): Promise<string[]> => {
    const res = await verify.apiAs(who[persona]!.token, 'GET', '/me/apps');
    expect(res.status, await res.clone().text()).toBe(200);
    const body: Rec = await res.json();
    const list = ((body.data ?? body).apps ?? body.data ?? body) as Rec[];
    return list.map((a) => String(a.name)).filter((name) => (APPS as readonly string[]).includes(name)).sort();
  };

  it.each([
    ['na_rep', ['crm_enterprise']],
    ['eu_rep', ['crm_enterprise']],
    ['sales_manager', ['crm_enterprise', 'crm_marketing', 'crm_service']],
    ['service_agent', ['crm_service']],
    ['service_manager', ['crm_service']],
    ['marketing_user', ['crm_enterprise', 'crm_marketing']],
    ['admin', ['crm_enterprise', 'crm_marketing', 'crm_service']],
  ])('%s is offered %j', async (persona, apps) => {
    expect(await appsOf(persona)).toEqual(apps);
  });

  it.each(['na_rep', 'service_agent'])('an app left off the launcher still opens for %s by its name: visibility, not access', async (persona) => {
    for (const app of APPS) {
      const res = await verify.apiAs(who[persona]!.token, 'GET', `/meta/app/${app}`);
      expect(res.status, `${persona} ${app}: ${await res.clone().text()}`).toBe(200);
    }
  });
});
