// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import {
  SecurityPlugin,
  appDefaultPermissionSetName,
  buildContextForUser,
} from '@objectstack/plugin-security';
import { SharingServicePlugin } from '@objectstack/plugin-sharing';
import { AutomationServicePlugin } from '@objectstack/service-automation';
import stack from '../objectstack.config';
import { LeadConversionFlow } from '../src/flows/lead-conversion.flow';

/**
 * Who lead conversion executes AS, measured against the real enforcement stack
 * (#1033 / #1030).
 *
 * ### Why this file exists
 *
 * `test/flow-conversion.test.ts` runs the same flow through the real
 * `AutomationEngine` over a hand-written in-memory store. That harness proves
 * the GRAPH — dedupe branches route and converge — and it cannot prove anything
 * about permissions, because its store has none: `insert` appends a row for
 * anybody. So it was green for months while, in the browser, a sales rep — the
 * app's most important persona — could not convert a lead AT ALL:
 *
 *   Node 'create_account' failed: create_record(crm_account) failed:
 *   [Security] Field write denied: not permitted to edit [annual_revenue]
 *   on 'crm_account'
 *
 * This file boots the shipped stack instead — ObjectQL + `plugin-security` +
 * `plugin-sharing` + `service-automation`, the same plugins `objectstack serve`
 * mounts — over the app's own `objectstack.config.ts`, and drives
 * `lead_conversion` end to end as a real `sales_rep`, through the same
 * `execute` → screen → `resume` pair the console posts. Its assembly is the one
 * `test/parent-derived-reach.test.ts` established; the automation plugin is the
 * addition.
 *
 * ### The invariant under test
 *
 * A lead's conversion products are a property of the LEAD, not of whoever
 * pressed the button. Three cases hold that down together, and none of them is
 * redundant:
 *
 *   1. a rep conversion SUCCEEDS and carries `annual_revenue` onto the account;
 *   2. the rep's products and an admin's products are field-for-field the same;
 *   3. the rep STILL cannot write `crm_account.annual_revenue` by hand.
 *
 * Case 3 is what makes 1 and 2 mean something. `runAs: 'system'` is a grant to
 * this FLOW, not to the rep, and the cheap way to "fix" #1033 — relaxing the
 * `sales_rep` FLS entry, or dropping restricted fields from the map when the
 * caller is restricted — would satisfy 1 (and, for the FLS route, 2) while
 * destroying the thing the ticket actually asked for. If case 3 ever goes green
 * by returning "allowed", the FLS was widened and #1033 was solved the wrong
 * way round.
 *
 * ### Reverse verification
 *
 * Direction predicted BEFORE running, and it is the ordinary one: the defect is
 * a REFUSAL, so removing the fix must make the rep run fail again. Measured on
 * `origin/main` (`runAs` unset ⇒ the schema default `'user'`), the rep run
 * returns exactly the message quoted above and writes nothing — `crm_account`
 * count 0. `run as the flow author declared it` below re-derives that from the
 * flow's own graph rather than from a copy of it, so it cannot drift.
 */

type AnyRec = Record<string, any>;

// The object registry announces every registered object on stdout at `info`;
// silence it the way the kernel logger is silenced. Both are noise here.
process.env.OS_REGISTRY_LOG ??= 'silent';

const SYS = { isSystem: true } as AnyRec;

let kernel: AnyRec;
let ql: AnyRec;
let automation: AnyRec;
/** ids, by role in the fixture. */
const id: Record<string, string> = {};
/** The `sales_rep` execution context under test. */
let repCtx: AnyRec;
/** A `system_admin` context — the persona #1033 says conversion already worked for. */
let adminCtx: AnyRec;

/** Insert as the system, returning the new row's id. */
const insert = async (object: string, doc: AnyRec): Promise<string> => {
  const row = await ql.insert(object, doc, { context: SYS });
  return String(row?.id ?? row?.record?.id);
};

/**
 * Fold a name the way `lead_duplicate_check` / `account_protection` do (#626).
 * The fixtures insert straight through ObjectQL as the system, which DOES run
 * hooks — but a lead inserted here still states its own `company_normalized`
 * so the dedupe key is a fixture input rather than a second assertion.
 */
const fold = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

/** The revenue figure every conversion in this file is expected to carry over. */
const LEAD_REVENUE = 12_000_000;

let leadSeq = 0;
/**
 * A qualified, convertible lead. Each call gets its own company and email so
 * that no two cases collide on `crm_account.name` (unique) or
 * `crm_contact.email` (globally unique) — the dedupe branches are
 * `test/flow-conversion.test.ts`'s subject, not this file's.
 */
const seedLead = async (over: AnyRec = {}): Promise<string> => {
  const n = ++leadSeq;
  const company = (over.company as string) ?? `Globex ${n}`;
  return insert('crm_lead', {
    company,
    company_normalized: fold(company),
    first_name: 'Joe',
    last_name: `Green${n}`,
    email: `joe${n}@globex.example.com`,
    phone: '555-0100',
    title: 'VP Operations',
    industry: 'technology',
    lead_source: 'web',
    status: 'qualified',
    is_converted: false,
    annual_revenue: LEAD_REVENUE,
    number_of_employees: 250,
    address: { country: 'US' },
    owner_id: id.rep,
    ...over,
  });
};

/**
 * The automation context the HTTP layer builds for a signed-in caller —
 * mirrors `buildAutomationContext` in `@objectstack/runtime`'s automation
 * domain: the resolved user id plus the positions/permissions its execution
 * context carries. Passing these is what makes a `runAs: 'user'` run resolve
 * the caller's real grants instead of falling back to baseline member
 * permissions.
 */
const callerContext = (ctx: AnyRec, params: AnyRec): AnyRec => ({
  params,
  object: 'crm_lead',
  event: 'manual',
  userId: ctx.userId,
  positions: ctx.positions ?? [],
  permissions: ctx.permissions ?? [],
});

interface ConversionOutcome {
  ok: boolean;
  error: string;
  /** Node id → status, from the run summary the engine returns. */
  nodes: Record<string, string>;
}

/**
 * Drive one full conversion the way the console does: trigger, then resume the
 * suspended screen with the collected values. `screen` is the raw submission
 * bag, so a case can omit a field to exercise the screen contract.
 */
const convert = async (
  ctx: AnyRec,
  leadId: string,
  screen: AnyRec = { createOpportunity: true, opportunityName: 'New Deal', opportunityAmount: 250_000 },
  flowName = 'lead_conversion',
): Promise<ConversionOutcome> => {
  const started: AnyRec = await automation.execute(flowName, callerContext(ctx, { recordId: leadId }));
  if (started?.success === false) {
    return { ok: false, error: String(started.error ?? ''), nodes: {} };
  }
  const runId = started.runId ?? started.run?.id;
  const resumed: AnyRec = await automation.resume(runId, { variables: screen } as never);
  const nodes: Record<string, string> = {};
  for (const n of (resumed?.summary?.nodes ?? []) as AnyRec[]) nodes[String(n.nodeId)] = String(n.status);
  return { ok: resumed?.success === true, error: String(resumed?.error ?? ''), nodes };
};

/** Every row of `object`, read as the system. */
const allRows = async (object: string): Promise<AnyRec[]> => {
  const rows = await ql.find(object, { where: {} }, { context: SYS });
  return Array.isArray(rows) ? rows : [];
};

const rowById = async (object: string, rowId: string): Promise<AnyRec | null> =>
  await ql.findOne(object, { where: { id: rowId } }, { context: SYS });

/** Attempt a write in `ctx` and report the outcome as a stable label. */
const writeAs = async (
  ctx: AnyRec,
  op: 'insert' | 'update',
  object: string,
  doc: AnyRec,
): Promise<string> => {
  try {
    if (op === 'insert') await ql.insert(object, doc, { context: ctx });
    else await ql.update(object, doc, { where: { id: doc.id }, context: ctx });
    return 'allowed';
  } catch (error: unknown) {
    return `denied: ${(error as AnyRec)?.message ?? String(error)}`;
  }
};

/**
 * Columns the platform stamps or derives, which therefore differ between two
 * separately-created rows for reasons that have nothing to do with who
 * converted. Everything else must match value-for-value across converters.
 */
const NON_COMPARABLE = new Set([
  'id', 'created_at', 'updated_at', 'created_by', 'updated_by',
  'name', 'name_normalized', 'display_title', 'account_number',
  'owner_id', 'email', 'first_name', 'last_name', 'full_name', 'crm_account',
  'primary_contact', 'close_date', 'opportunity_number', 'contact_number',
]);

const comparable = (row: AnyRec): AnyRec =>
  Object.fromEntries(Object.entries(row).filter(([k]) => !NON_COMPARABLE.has(k)));

beforeAll(async () => {
  kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
  await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
  await kernel.use(new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_test' } as never));
  await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_test' } as never));
  // The app's own metadata is the subject. Seed data is skipped — the fixtures
  // below are the whole population.
  await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
  await kernel.use(
    new SecurityPlugin({
      fallbackPermissionSet: appDefaultPermissionSetName((stack as AnyRec).permissions),
    } as never),
  );
  await kernel.use(new SharingServicePlugin());
  // Flows are pulled from the ObjectQL registry at start, so this engine runs
  // the app's real `lead_conversion` definition, not a copy.
  await kernel.use(new AutomationServicePlugin({ suspendedRunStore: 'memory' } as never));
  await kernel.bootstrap();
  ql = kernel.getService('objectql');
  automation = kernel.getService('automation');

  // ── principals ────────────────────────────────────────────────────────
  // The FIRST human user is auto-promoted to platform admin at boot, and a
  // platform admin bypasses every check this file measures. Burn that
  // promotion on a throwaway so the rep under test is an ordinary user.
  await insert('sys_user', { name: 'Platform Admin', email: 'burn@conversion-authority.test' });
  id.rep = await insert('sys_user', { name: 'Sales Rep', email: 'rep@conversion-authority.test' });
  id.admin = await insert('sys_user', { name: 'CRM Admin', email: 'crmadmin@conversion-authority.test' });

  // `sys_user_position.position` holds the position NAME.
  await insert('sys_user_position', { user_id: id.rep, position: 'sales_rep' });

  const sets = await allRows('sys_permission_set');
  const setId = (name: string) => sets.find((s) => s.name === name)?.id;
  for (const [user, setName] of [[id.rep, 'sales_rep'], [id.admin, 'system_admin']] as const) {
    await insert('sys_user_permission_set', {
      user_id: user,
      permission_set: setId(setName),
      permission_set_id: setId(setName),
    });
  }

  repCtx = await buildContextForUser(ql, id.rep);
  adminCtx = await buildContextForUser(ql, id.admin);
}, 180_000);

afterAll(async () => {
  await kernel?.shutdown?.();
});

describe('the harness enforces (negative controls)', () => {
  it('the rep resolves to sales_rep only — no platform-admin bypass', () => {
    expect(repCtx.permissions, 'the rep must not carry admin_full_access').toEqual(['sales_rep']);
    expect(repCtx.hasPlatformAdminGrant).toBe(false);
    expect(repCtx.positions).toContain('sales_rep');
  });

  it('the admin resolves to system_admin, also without the platform bypass', () => {
    expect(adminCtx.permissions).toEqual(['system_admin']);
    expect(adminCtx.hasPlatformAdminGrant).toBe(false);
  });

  it('the engine runs the app\'s own registered lead_conversion', async () => {
    const names: string[] = await automation.listFlows();
    expect(names).toContain('lead_conversion');
  });
});

describe('#1033: a sales rep can convert a lead', () => {
  it('runs to completion and creates account + contact + opportunity', async () => {
    const leadId = await seedLead();
    const outcome = await convert(repCtx, leadId);

    expect(outcome.error, 'the rep run must not be refused').toBe('');
    expect(outcome.ok).toBe(true);
    // The node #1033 died at, named explicitly: a green run that skipped it
    // (because the dedupe matched) would not prove the write is permitted.
    expect(outcome.nodes.create_account).toBe('success');

    const lead = await rowById('crm_lead', leadId);
    expect(lead?.is_converted, 'the lead is stamped converted').toBe(true);
    expect(lead?.status).toBe('converted');
    expect(lead?.converted_account).toBeTruthy();
    expect(lead?.converted_contact).toBeTruthy();
    expect(lead?.converted_opportunity).toBeTruthy();

    const account = await rowById('crm_account', String(lead?.converted_account));
    const contact = await rowById('crm_contact', String(lead?.converted_contact));
    const opportunity = await rowById('crm_opportunity', String(lead?.converted_opportunity));
    expect(account, 'account row').toBeTruthy();
    expect(contact, 'contact row').toBeTruthy();
    expect(opportunity, 'opportunity row').toBeTruthy();

    // The elevation grants the FLOW, and the products still belong to the rep
    // who converted: `{$User.Id}` resolves from the run context, which keeps
    // the triggering user even when the DATA context is the system writer.
    expect(account?.owner_id, 'the account is owned by the converting rep').toBe(id.rep);
    expect(contact?.owner_id).toBe(id.rep);
    expect(opportunity?.owner_id).toBe(id.rep);
  }, 120_000);

  it('carries annual_revenue onto the account — the field FLS refused', async () => {
    const leadId = await seedLead();
    expect((await convert(repCtx, leadId)).ok).toBe(true);
    const lead = await rowById('crm_lead', leadId);
    const account = await rowById('crm_account', String(lead?.converted_account));
    expect(
      account?.annual_revenue,
      'annual_revenue was dropped — the flow no longer copies what the lead knows',
    ).toBe(LEAD_REVENUE);
  }, 120_000);

  it('converts a lead whose annual_revenue is EMPTY (#1033: same failure)', async () => {
    // The refusal was on the KEY, not the value: `detectForbiddenWrites` reads
    // the submitted field map, so a lead with no revenue produced exactly the
    // same denial. This case would be green under a "skip empty values" fix and
    // is here so that fix cannot be mistaken for this one — the case above,
    // which carries a value, is what separates them.
    const leadId = await seedLead({ annual_revenue: null });
    const outcome = await convert(repCtx, leadId);
    expect(outcome.error).toBe('');
    expect(outcome.ok).toBe(true);
    const lead = await rowById('crm_lead', leadId);
    expect(lead?.is_converted).toBe(true);
  }, 120_000);
});

describe('#1033: the products do not depend on who converted', () => {
  it('a rep conversion and an admin conversion agree field-for-field', async () => {
    const repLead = await seedLead({ company: 'Initech Systems', email: 'buyer@initech.example.com' });
    const adminLead = await seedLead({ company: 'Umbrella Health', email: 'buyer@umbrella.example.com' });

    expect((await convert(repCtx, repLead)).ok, 'rep conversion').toBe(true);
    expect((await convert(adminCtx, adminLead)).ok, 'admin conversion').toBe(true);

    const byRep = await rowById('crm_lead', repLead);
    const byAdmin = await rowById('crm_lead', adminLead);

    for (const [object, repRef, adminRef] of [
      ['crm_account', byRep?.converted_account, byAdmin?.converted_account],
      ['crm_contact', byRep?.converted_contact, byAdmin?.converted_contact],
      ['crm_opportunity', byRep?.converted_opportunity, byAdmin?.converted_opportunity],
    ] as const) {
      const repRow = await rowById(object, String(repRef));
      const adminRow = await rowById(object, String(adminRef));
      expect(repRow, `${object} (rep)`).toBeTruthy();
      expect(adminRow, `${object} (admin)`).toBeTruthy();

      // The FIELD SET first: a "drop the fields this caller may not write" fix
      // passes every value comparison below by simply not writing the field,
      // so the set is the assertion that catches it.
      expect(
        Object.keys(repRow as AnyRec).sort(),
        `${object}: the rep's row carries a different set of columns than the admin's`,
      ).toEqual(Object.keys(adminRow as AnyRec).sort());

      expect(
        comparable(repRow as AnyRec),
        `${object}: the rep's row and the admin's row disagree on a value`,
      ).toEqual(comparable(adminRow as AnyRec));
    }

    // Named explicitly, because it is the one #1033 is about and a set
    // comparison of two rows that both omit it would still pass.
    const repAccount = await rowById('crm_account', String(byRep?.converted_account));
    const adminAccount = await rowById('crm_account', String(byAdmin?.converted_account));
    expect(repAccount?.annual_revenue).toBe(LEAD_REVENUE);
    expect(adminAccount?.annual_revenue).toBe(LEAD_REVENUE);
  }, 120_000);
});

describe('#1033: the FLS grant was NOT widened', () => {
  it('a rep still cannot edit crm_account.annual_revenue by hand', async () => {
    // The account the rep just created through the flow — the most favourable
    // case for the rep, since they own it.
    const leadId = await seedLead();
    expect((await convert(repCtx, leadId)).ok).toBe(true);
    const lead = await rowById('crm_lead', leadId);
    const accountId = String(lead?.converted_account);

    const verdict = await writeAs(repCtx, 'update', 'crm_account', {
      id: accountId,
      annual_revenue: 999,
    });
    expect(
      verdict,
      'the sales_rep FLS entry on crm_account.annual_revenue was relaxed — #1033 was fixed the wrong way round',
    ).toContain('[Security] Field write denied');
    expect(verdict).toContain('annual_revenue');

    const after = await rowById('crm_account', accountId);
    expect(after?.annual_revenue, 'the refused write must not have landed').toBe(LEAD_REVENUE);

    // Positive control: an account field the rep IS granted still writes, so
    // the case above cannot pass merely because every rep write is refused.
    expect(
      await writeAs(repCtx, 'update', 'crm_account', { id: accountId, description: 'Met at trade show' }),
    ).toBe('allowed');
  }, 120_000);

  it('a rep still cannot create an account carrying annual_revenue', async () => {
    const verdict = await writeAs(repCtx, 'insert', 'crm_account', {
      name: 'Hand Made Co',
      type: 'prospect',
      is_active: true,
      owner_id: id.rep,
      annual_revenue: 5_000_000,
    });
    expect(verdict).toContain('[Security] Field write denied');
    // Positive control on the same path: the identical insert without the
    // masked field is accepted, so the refusal is about the FIELD.
    expect(
      await writeAs(repCtx, 'insert', 'crm_account', {
        name: 'Hand Made Two',
        type: 'prospect',
        is_active: true,
        owner_id: id.rep,
      }),
    ).toBe('allowed');
  }, 120_000);
});

describe('#1033 reverse verification: the elevation is what fixes it', () => {
  it('run as the flow author declared it — the rep run fails at create_account', async () => {
    // Direction predicted before running, and it is the ordinary one: put the
    // pre-fix state back (the flow's own graph with `runAs` returned to its
    // schema default `'user'`) and the rep run must go RED with the exact
    // message #1033 reported. Registered under a second name so the app's real
    // flow keeps serving every other case in this file.
    expect(LeadConversionFlow.runAs, 'the shipped flow is elevated').toBe('system');
    automation.registerFlow('lead_conversion_pre_1033', {
      ...LeadConversionFlow,
      name: 'lead_conversion_pre_1033',
      runAs: 'user',
    });

    const leadId = await seedLead();
    const before = (await allRows('crm_account')).length;
    const outcome = await convert(repCtx, leadId, undefined, 'lead_conversion_pre_1033');

    expect(outcome.ok, 'un-elevated, a rep conversion must still be refused').toBe(false);
    expect(outcome.error).toContain("Node 'create_account' failed");
    expect(outcome.error).toContain('[Security] Field write denied');
    expect(outcome.error).toContain('annual_revenue');
    expect(outcome.nodes.create_account).toBe('failure');

    // Nothing written, and the lead untouched — the P1 shape: the rep is left
    // with a lead that will not convert.
    expect((await allRows('crm_account')).length, 'the failed run wrote an account anyway').toBe(before);
    const lead = await rowById('crm_lead', leadId);
    expect(lead?.is_converted).toBeFalsy();
  }, 120_000);

  it('the same un-elevated run succeeds for an admin — which is why #1033 hid', async () => {
    // The other half of the reverse check, and the reason the defect survived
    // acceptance: nothing about the flow was broken for the persona that tested
    // it. If this ever goes red the reproduction has drifted, not the fix.
    const leadId = await seedLead();
    const outcome = await convert(adminCtx, leadId, undefined, 'lead_conversion_pre_1033');
    expect(outcome.ok).toBe(true);
  }, 120_000);
});

describe('#1033 fallout: the elevated flow keeps the converted-lead lock', () => {
  it('refuses a second conversion of the same lead, writing nothing', async () => {
    // `lead.hook.ts`'s converted-lead lock is gated on `ctx.user?.id` and a
    // system write carries none, so the elevation stands it down. MEASURED:
    // without `is_converted` in `get_lead`'s filter the second run returned
    // `success: true` and wrote a SECOND opportunity. The flow re-asserts the
    // guard itself; this case is what says so.
    const leadId = await seedLead();
    expect((await convert(repCtx, leadId)).ok, 'first conversion').toBe(true);

    const lead = await rowById('crm_lead', leadId);
    const opportunitiesBefore = (await allRows('crm_opportunity')).length;
    const accountsBefore = (await allRows('crm_account')).length;

    const second = await convert(repCtx, leadId, {
      createOpportunity: true,
      opportunityName: 'Second Bite',
      opportunityAmount: 900_000,
    });

    expect(second.ok, 'a converted lead must not convert again').toBe(false);
    expect(second.error, 'the run must fail closed at the dedupe read').toContain('find_account');
    expect((await allRows('crm_opportunity')).length, 'a duplicate opportunity was created').toBe(
      opportunitiesBefore,
    );
    expect((await allRows('crm_account')).length).toBe(accountsBefore);

    const after = await rowById('crm_lead', leadId);
    expect(after?.converted_opportunity, 'the conversion stamps were overwritten').toBe(
      lead?.converted_opportunity,
    );
    expect(after?.converted_account).toBe(lead?.converted_account);
  }, 120_000);
});

describe('#1030: Opportunity Amount is required on the parameter screen', () => {
  it('the rendered screen contract marks it required', async () => {
    const leadId = await seedLead();
    const started: AnyRec = await automation.execute(
      'lead_conversion',
      callerContext(repCtx, { recordId: leadId }),
    );
    const fields = (started?.screen?.fields ?? []) as AnyRec[];
    const amount = fields.find((f) => f.name === 'opportunityAmount');
    expect(amount, 'the screen no longer declares opportunityAmount').toBeTruthy();
    // The console renders `required` straight off this payload, so this IS the
    // asterisk #1030 asked for.
    expect(
      amount?.required,
      'Opportunity Amount renders optional while crm_opportunity.amount is required',
    ).toBe(true);
    // And it stays conditional — see the "hidden" case below.
    expect(amount?.visibleWhen).toBe('createOpportunity == true');
  }, 120_000);

  it('refuses the resume when Create Opportunity is checked and Amount is missing', async () => {
    const leadId = await seedLead();
    const before = (await allRows('crm_account')).length;

    const outcome = await convert(repCtx, leadId, {
      createOpportunity: true,
      opportunityName: 'No Amount Deal',
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain('Screen field "opportunityAmount" is required');
    // The whole point of moving the failure forward: the refusal lands on the
    // SCREEN, before any record is written, so there is nothing half-converted
    // for #524's silent-failure path to hide.
    expect((await allRows('crm_account')).length, 'records were written before the refusal').toBe(before);
    const lead = await rowById('crm_lead', leadId);
    expect(lead?.is_converted).toBeFalsy();
  }, 120_000);

  it('does NOT fire when Create Opportunity is unchecked (#4477 in mirror)', async () => {
    // The commonest path: convert WITHOUT an opportunity. `opportunityAmount`
    // is hidden, so the server evaluates `visibleWhen` first and its `required`
    // must not fire. An unconditional `required` would break exactly the
    // callers #4477 repaired — this case is the one that would catch it.
    const leadId = await seedLead();
    const outcome = await convert(repCtx, leadId, { createOpportunity: false });

    expect(outcome.error).toBe('');
    expect(outcome.ok).toBe(true);
    expect(outcome.nodes.create_opportunity, 'no opportunity should have been created').not.toBe('success');

    const lead = await rowById('crm_lead', leadId);
    expect(lead?.is_converted).toBe(true);
    expect(lead?.converted_account).toBeTruthy();
    expect(lead?.converted_opportunity ?? null).toBeNull();
  }, 120_000);

  it('an amount of 0 passes the screen but is still refused deeper — the residual', async () => {
    // MEASURED, and it corrected the assumption this case was written on. The
    // screen contract's `isPresent` counts `0` as an answer, so `required` does
    // NOT fire on it — but `crm_opportunity` carries an `amount_positive`
    // validation ("Amount must be greater than zero"), so a deliberate zero is
    // refused at `create_opportunity`, after the account and contact are
    // written. Screen fields have no numeric bound to declare, so `required`
    // narrows #1030's window rather than closing it: a MISSING amount now fails
    // on the screen, a ZERO amount still fails inside the flow and is therefore
    // still subject to #524's silent-failure path.
    //
    // Pinned rather than fixed: closing it needs either a screen-field bound
    // (no such key on the flow screen contract) or a `min` the console
    // enforces, which is a platform-side capability question, not an app one.
    const leadId = await seedLead();
    const outcome = await convert(repCtx, leadId, {
      createOpportunity: true,
      opportunityName: 'Zero Deal',
      opportunityAmount: 0,
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain("Node 'create_opportunity' failed");
    expect(outcome.error).toContain('Amount must be greater than zero');
    // The screen contract did NOT refuse it — that is what makes this the
    // residual and not a duplicate of the missing-amount case above.
    expect(outcome.error).not.toContain('is required');
  }, 120_000);
});
