// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import type * as Automation from '@objectstack/spec/automation';
import * as allFlows from '../src/flows';
import { ContractExpirationFlow } from '../src/flows/contract-expiration.flow';

type Flow = Automation.Flow;
type AnyRec = Record<string, any>;

/**
 * ═══ `{TODAY()}` in a flow filter: WHO consumes the token, measured by
 *     executing it ═══════════════════════════════════════════════════════════
 *
 * `{TODAY()}` is spelled in filters across `src/flows` — the nightly
 * `forecast_snapshot` window (`period_start <= today <= period_end`), the
 * `contract_expiration` / `campaign_completion` / `quote_expiration` /
 * `contract_renewal` sweeps, the `opportunity_stagnation` staleness cut.
 *
 * On 17.0.0-rc.6 the ObjectQL read path itself **rejects** that spelling:
 * `resolveFilterTokens()` classifies `{TODAY()}` as `kind: 'unknown'` and
 * throws `UnknownFilterTokenError` (`FILTER_TOKEN_UNKNOWN`, HTTP 400) rather
 * than sending it to the driver as a literal. On rc.2 the same string was
 * classified as *nothing at all* and passed straight through. So the token
 * changed meaning under this repo at the rc.5 → rc.6 bump, and #1107 asked the
 * only question that matters: **does a flow filter carrying it still work?**
 *
 * Two answers were possible and the repo could not tell them apart:
 *
 *   A — the flow runtime resolves `TODAY()` on its own, before the query is
 *       ever issued, so ObjectQL never sees the token.
 *   B — the filter reaches ObjectQL verbatim, so every one of those sweeps has
 *       been throwing since the bump — including a nightly job whose failure
 *       nobody would notice.
 *
 * ### Why this file exists rather than the guard that was already there
 *
 * `test/forecast-seeds.test.ts:201` asserts
 * `sweepLookup.period_start).toEqual({ $lte: '{TODAY()}' })` — the filter's
 * literal SHAPE. It never runs it. That assertion is green under A and green
 * under B, and would stay green if rc.7 deleted `TODAY()` support outright:
 * the string in the metadata is the same string either way. It is a spelling
 * guard (a useful one — it pins the sweep's window against a widening edit),
 * not an evidence of the token still meaning something. The blind spot is the
 * whole point of #1107, so everything below EXECUTES.
 *
 * ### The measured answer: A — and there is only one query path
 *
 * The two-paths intuition is wrong in a way worth writing down, because it is
 * what makes A survive: `@objectstack/objectql` registers **itself** as the
 * kernel's `'data'` service (`ctx.registerService('data', this.ql)`), and the
 * automation engine's `get_record` / `update_record` nodes call exactly that
 * service. A flow query and a hand-written `ql.find()` land on the same
 * `resolveFilterTokens()` gate. What saves the flows is not a second path, it
 * is a PRE-PASS: `service-automation`'s `interpolateFilter()` resolves
 * `{TODAY()}` (and `{TODAY() ± n}`) to a `YYYY-MM-DD` string while building the
 * node's filter, so the value ObjectQL receives is a date literal and the
 * token is already gone.
 *
 * That also means the two layers disagree about this token by design, and the
 * disagreement is load-bearing: the automation template evaluator knows
 * `TODAY()`, ObjectQL's filter vocabulary knows `{today}`. Either half moving
 * breaks the flows, so both halves are pinned below.
 */

// ══════════════════════════════════════════════════ shipped-metadata census ══

interface TokenSite {
  flow: string;
  node: string;
  /** Dotted path to the condition inside `config.filter`. */
  path: string;
  /** The template string as authored, e.g. `{TODAY() - 45}`. */
  template: string;
}

const TODAY_TOKEN = /\{\s*TODAY\s*\(\s*\)/;

/** Every `{TODAY()…}` string inside a node's `config.filter`, with its path. */
const filterTokens = (value: unknown, path: string[] = []): { path: string; template: string }[] => {
  if (typeof value === 'string') {
    return TODAY_TOKEN.test(value) ? [{ path: path.join('.') || '(root)', template: value }] : [];
  }
  if (Array.isArray(value)) return value.flatMap((v, i) => filterTokens(v, [...path, String(i)]));
  if (value && typeof value === 'object') {
    return Object.entries(value as AnyRec).flatMap(([k, v]) => filterTokens(v, [...path, k]));
  }
  return [];
};

/** Walk a flow's nodes, including `loop` bodies, collecting filter tokens. */
const censusOf = (flowName: string, nodes: AnyRec[]): TokenSite[] =>
  nodes.flatMap((node) => {
    const here = filterTokens(node?.config?.filter).map((t) => ({
      flow: flowName, node: String(node.id), ...t,
    }));
    const body = node?.config?.body?.nodes;
    return Array.isArray(body) ? [...here, ...censusOf(flowName, body)] : here;
  });

// `src/flows/index.ts` exports every flow twice — once by name and once inside
// the `allFlows` array `defineStack()` consumes. The ARRAY is the registered
// set, so it is the one censused; taking `Object.values()` of the module would
// count each flow twice and quietly weaken the per-site assertions below.
const flows: Flow[] = ((allFlows as AnyRec).allFlows ?? []) as Flow[];

const CENSUS: TokenSite[] = flows.flatMap((f) => censusOf(f.name, (f as AnyRec).nodes ?? []));

describe('census: which shipped flow filters carry {TODAY()}', () => {
  it('at least one live sweep filters on the token', () => {
    // The premise of every execution below. If this ever empties out, the
    // executions stop proving anything and this file must be re-scoped rather
    // than left passing over an empty set.
    expect(CENSUS.length).toBeGreaterThan(0);
  });

  it('the nightly forecast window is one of them, on BOTH of its reads (#1107)', () => {
    // Named explicitly because it is the site that made #1107 urgent: a
    // scheduled 00:00 sweep, whose only other guard asserts the literal shape.
    // Both reads matter — `find_forecast` decides whether to open a row and
    // `reload_forecast` hands the rest of the body the period window, so a
    // throw in either one loses the night's snapshot.
    const forecast = CENSUS
      .filter((s) => s.flow === 'forecast_snapshot')
      .map((s) => `${s.node}.${s.path}`)
      .sort();
    expect(forecast).toEqual([
      'find_forecast.period_end.$gte',
      'find_forecast.period_start.$lte',
      'reload_forecast.period_end.$gte',
      'reload_forecast.period_start.$lte',
    ]);
  });
});

// ══════════════════════════════════════════ the real engine, really queried ══

/**
 * Objects for the probe engine.
 *
 * `t_probe` is a deliberately domain-free row: the census sweep re-points every
 * collected condition at `probe_date`, so a filter site added to any flow
 * tomorrow is executed here without this file needing to know its object.
 */
const OBJECTS = {
  crm_contract: {
    name: 'crm_contract',
    fields: {
      id: { type: 'text' },
      contract_number: { type: 'text' },
      status: { type: 'text' },
      end_date: { type: 'date' },
      owner_id: { type: 'text' },
    },
  },
  t_probe: {
    name: 't_probe',
    fields: { id: { type: 'text' }, probe_date: { type: 'date' } },
  },
} as never;

/**
 * A fixture date `daysFromToday` away, spelled on the **UTC** calendar —
 * arithmetic and rendering both, on purpose.
 *
 * ### Why UTC, and not the local calendar (#1462)
 *
 * This is not a free choice: the helper's calendar has to be the one the
 * engine resolves `{TODAY()}` in, because the assertions below compare the two
 * directly. Both layers were measured on 17.2.0 rather than assumed:
 *
 *   - `service-automation`'s `resolveToken()` renders a bare `{TODAY()}` as
 *     `new Date().toISOString().slice(0, 10)` — the **UTC** calendar day, with
 *     no reference to the ambient zone.
 *   - `@objectstack/core`'s `{today}` filter macro resolves through
 *     `proxyDay(now, ctx.timezone)`, and a context with no `timezone` (which is
 *     what a bare `ql.find()` here carries) falls back to the **UTC** parts.
 *
 * So both tokens this file asserts against mean "the UTC day", and the fixtures
 * must be spelled the same way for `$lt` to land where the assertions say.
 *
 * ### What the previous spelling did
 *
 * It did the arithmetic on the LOCAL calendar and rendered on the UTC one:
 *
 *     const d = new Date();
 *     d.setDate(d.getDate() + daysFromToday);   // local
 *     return d.toISOString().slice(0, 10);      // UTC
 *
 * Those two agree whenever a local day is exactly 24h long, which is why the
 * file passed everywhere it had ever been run. They disagree across a DST
 * transition: `setDate` keeps the wall-clock time, so a "spring forward" day is
 * 23h long and the shifted instant lands one UTC day later than intended. In
 * the hour after a transition that collapses `ymd(-1)` onto `ymd(0)`, which
 * puts `k_yesterday` exactly ON the `$lt` boundary instead of below it — the
 * sweep then leaves it `activated` and only one owner is notified.
 *
 * Measured before the fix (`TZ` × faked clock, this file):
 *
 *     America/New_York    2026-03-08T23:00:00Z   2 failed | 6 passed
 *     America/Los_Angeles 2026-03-08T23:00:00Z   2 failed | 6 passed
 *     Europe/Berlin       2026-03-29T23:00:00Z   2 failed | 6 passed
 *     America/Santiago    2026-09-06T23:00:00Z   2 failed | 6 passed
 *     Pacific/Auckland    2026-09-26T23:00:00Z   2 failed | 6 passed
 *     Australia/Sydney    2026-10-03T23:00:00Z   2 failed | 6 passed
 *
 * ⚠️ Note for anyone re-checking this: no run at `TZ=UTC` can have teeth here.
 * Local and UTC coincide there, so the broken spelling and this one are
 * indistinguishable — which is exactly why a suite that is only ever run on a
 * UTC CI runner reported a clean bill of health. Reproducing it needs a
 * DST-observing zone AND an instant inside that zone's transition hour.
 */
const ymd = (daysFromToday: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
};

const silentLogger: any = {
  info() {}, warn() {}, error() {}, debug() {}, trace() {},
  child() { return silentLogger; },
};

describe('{TODAY()} through a real ObjectQL + real AutomationEngine', () => {
  let ql: Awaited<ReturnType<typeof ObjectQL.create>>;
  /** Every `where` ObjectQL was handed, in call order. */
  let seen: { object: string; where: unknown }[];
  /** The `data` service, wired the way the runtime wires it: ObjectQL itself. */
  let data: AnyRec;

  const seedContracts = async () => {
    const api: AnyRec = ql.createContext({ isSystem: true, userId: 'u1', tenantId: 'org_1' } as never);
    await api.object('crm_contract').insert({
      id: 'k_past', contract_number: 'C-1', status: 'activated', end_date: ymd(-3), owner_id: 'rep1',
    });
    await api.object('crm_contract').insert({
      id: 'k_yesterday', contract_number: 'C-2', status: 'activated', end_date: ymd(-1), owner_id: 'rep1',
    });
    // Ends TODAY — `$lt today` must NOT take it: a contract is live through its
    // last day. This row is what separates "resolved to today" from "resolved
    // to now/tomorrow"; a boundary-off resolution expires it a day early.
    await api.object('crm_contract').insert({
      id: 'k_today', contract_number: 'C-3', status: 'activated', end_date: ymd(0), owner_id: 'rep1',
    });
    await api.object('crm_contract').insert({
      id: 'k_future', contract_number: 'C-4', status: 'activated', end_date: ymd(+30), owner_id: 'rep1',
    });
    // Already expired: past its end date but not `activated` — left alone.
    await api.object('crm_contract').insert({
      id: 'k_done', contract_number: 'C-5', status: 'expired', end_date: ymd(-9), owner_id: 'rep1',
    });
  };

  beforeAll(async () => {
    ql = await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: OBJECTS,
    });
    seen = [];
    const anyQl = ql as AnyRec;
    // A thin recorder over the SAME object the runtime registers as `'data'`,
    // so the assertions below read what ObjectQL was actually handed rather
    // than what the flow metadata says.
    data = {
      find: async (o: string, opts: AnyRec = {}) => {
        seen.push({ object: o, where: opts.where ?? opts.filter ?? {} });
        return anyQl.find(o, opts);
      },
      findOne: async (o: string, opts: AnyRec = {}) => {
        seen.push({ object: o, where: opts.where ?? opts.filter ?? {} });
        return anyQl.findOne(o, opts);
      },
      count: async (o: string, opts: AnyRec = {}) => {
        seen.push({ object: o, where: opts.where ?? opts.filter ?? {} });
        return anyQl.count(o, opts);
      },
      insert: (o: string, d: AnyRec, opts?: AnyRec) => anyQl.insert(o, d, opts),
      update: (o: string, d: AnyRec, opts: AnyRec = {}) => {
        seen.push({ object: o, where: opts.where ?? opts.filter ?? {} });
        return anyQl.update(o, d, opts);
      },
      delete: (o: string, opts?: AnyRec) => anyQl.delete(o, opts),
    };
    await seedContracts();
  });

  afterAll(async () => {
    await ql?.close();
  });

  const makeEngine = (registered: Record<string, Flow>) => {
    const notifications: AnyRec[] = [];
    const ctx: AnyRec = {
      logger: silentLogger,
      getService: (name: string) => {
        if (name === 'data' || name === 'objectql') return data;
        if (name === 'messaging' || name === 'notification' || name === 'email') {
          return {
            async emit(msg: AnyRec) {
              notifications.push(msg);
              return { notificationId: `n${notifications.length}`, delivered: 1, failed: 0 };
            },
            isHttpDeliveryReady() { return false; },
          };
        }
        return undefined;
      },
    };
    const engine = new AutomationEngine(silentLogger);
    installBuiltinNodes(engine, ctx as never);
    for (const [name, flow] of Object.entries(registered)) engine.registerFlow(name, flow);
    return { engine, notifications };
  };

  /**
   * Run one authored filter condition through a real one-node `get_record`
   * flow, against the real ObjectQL, and hand back both the run result and the
   * `where` the query layer was actually given.
   *
   * The condition is re-pointed at the domain-free `probe_date` field on
   * purpose: what is under test is the TOKEN, not any flow's own object, so a
   * filter site added to any flow tomorrow is executed here without this file
   * having to learn that flow's schema.
   */
  const runProbe = async (condition: unknown) => {
    const probe: Flow = {
      name: 'probe', label: 'probe', type: 'schedule', status: 'active', runAs: 'system',
      variables: [],
      nodes: [
        { id: 'start', type: 'start', label: 'Start', config: {} },
        {
          id: 'read', type: 'get_record', label: 'Read',
          config: {
            objectName: 't_probe',
            filter: { probe_date: condition },
            limit: 500,
            outputVariable: 'rows',
          },
        },
        { id: 'end', type: 'end', label: 'End' },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'read', type: 'default' },
        { id: 'e2', source: 'read', target: 'end', type: 'default' },
      ],
    } as never;

    const { engine } = makeEngine({ probe });
    const before = seen.length;
    const run: AnyRec = await engine.execute('probe', {
      params: {}, userId: 'u1', event: 'schedule',
    } as never);
    return { run, issued: seen.slice(before).find((q) => q.object === 't_probe') };
  };

  // ─────────────────────────────────────────────── premise: rc.6 rejects it ──

  it('PREMISE: ObjectQL itself refuses `{TODAY()}` — the rc.6 change (#1107)', async () => {
    // The whole card rests on this being true of the query layer. If a later
    // release teaches ObjectQL the `TODAY()` spelling, this goes red — and it
    // SHOULD, because the answer to #1107 would have changed and the pre-pass
    // below would no longer be the thing keeping the sweeps alive.
    const attempt = (ql as AnyRec).find('crm_contract', {
      where: { status: 'activated', end_date: { $lt: '{TODAY()}' } },
    });
    await expect(attempt).rejects.toMatchObject({
      code: 'FILTER_TOKEN_UNKNOWN',
      status: 400,
    });
  });

  it('PREMISE: the token ObjectQL *does* know is `{today}`, and it selects rows', async () => {
    // The other half of the vocabulary split. Together with the case above this
    // pins "the two layers disagree about this token" as a measured fact, so a
    // future reader does not have to take the comment on faith.
    const rows = await (ql as AnyRec).find('crm_contract', {
      where: { status: 'activated', end_date: { $lt: '{today}' } },
    });
    expect(rows.map((r: AnyRec) => r.id).sort()).toEqual(['k_past', 'k_yesterday']);
  });

  // ──────────────────────────────────── the answer: A, executed end-to-end ──

  it('ANSWER A: contract_expiration runs green and expires exactly the past-due rows', async () => {
    const { engine, notifications } = makeEngine({ contract_expiration: ContractExpirationFlow });
    const before = seen.length;

    const run: AnyRec = await engine.execute('contract_expiration', {
      params: {}, userId: 'u1', event: 'schedule',
    } as never);

    // 1. It did not blow up. Under answer B the `get_record` node's own
    //    try/catch turns the UnknownFilterTokenError into a node failure —
    //    `get_record(crm_contract) failed: Unresolvable filter placeholder…` —
    //    which the engine re-throws and reports as `success: false`, so a green
    //    terminal state is itself part of the reading.
    expect(run?.success, `flow failed: ${String(run?.error ?? '')}`).toBe(true);

    // 2. The rows really moved — the query selected, and only the right ones.
    //    `k_today` is the boundary row and `k_future` the control; either one
    //    flipping means the resolved value was not today.
    const api: AnyRec = ql.createContext({ isSystem: true, userId: 'u1', tenantId: 'org_1' } as never);
    const rows: AnyRec[] = await api.object('crm_contract').find({ where: {} });
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.status]));
    expect(byId).toEqual({
      k_past: 'expired',
      k_yesterday: 'expired',
      k_today: 'activated',
      k_future: 'activated',
      k_done: 'expired',
    });

    // 3. And the direct evidence for A over B: what ObjectQL was handed.
    const sweep = seen.slice(before).find((q) => q.object === 'crm_contract');
    expect(sweep, 'the flow issued no crm_contract read at all').toBeDefined();
    expect(JSON.stringify(sweep!.where)).not.toMatch(TODAY_TOKEN);
    expect((sweep!.where as AnyRec).end_date).toEqual({ $lt: ymd(0) });

    // 4. The loop body ran on the selected rows (two owners notified), so the
    //    green above is not "selected nothing, therefore nothing to break".
    expect(notifications.length).toBe(2);
  });

  it('ANSWER A: every shipped {TODAY()} filter site resolves before the query', async () => {
    // The census, executed. A new flow that filters on the token is covered the
    // day it is written — including offset spellings (`{TODAY() - 45}`), which
    // are a different branch of the template evaluator than the bare call.
    expect(CENSUS.length).toBeGreaterThan(0);

    for (const site of CENSUS) {
      // Re-point the authored condition at the domain-free probe field: what is
      // under test is the TOKEN, not the flow's own object.
      const [field] = site.path.split('.');
      const authored = (() => {
        const flow = flows.find((f) => f.name === site.flow)!;
        const findNode = (nodes: AnyRec[]): AnyRec | undefined => {
          for (const n of nodes) {
            if (String(n.id) === site.node) return n;
            const body = n?.config?.body?.nodes;
            if (Array.isArray(body)) {
              const hit = findNode(body);
              if (hit) return hit;
            }
          }
          return undefined;
        };
        return findNode(((flow as AnyRec).nodes ?? []) as AnyRec[])?.config?.filter?.[field];
      })();
      expect(authored, `${site.flow}/${site.node}: no condition at '${field}'`).toBeDefined();

      const { run, issued } = await runProbe(authored);

      const label = `${site.flow}/${site.node} '${site.template}'`;
      expect(run?.success, `${label}: flow failed — ${String(run?.error ?? '')}`).toBe(true);
      expect(issued, `${label}: no query reached ObjectQL`).toBeDefined();
      // The reading: the token was consumed by the automation pre-pass, so what
      // the query layer saw is a plain `YYYY-MM-DD`. If it ever arrives verbatim
      // this fails HERE, naming the flow and node, instead of at 00:00 in a log
      // nobody reads.
      const where = JSON.stringify(issued!.where);
      expect(where, `${label}: token reached ObjectQL verbatim — ${where}`).not.toMatch(TODAY_TOKEN);
      // Any surviving `{…}` template, not just this one. `[^"{}]` keeps the
      // JSON's own braces out of it: a real leftover template sits INSIDE a
      // quoted value, so it never contains a quote character.
      expect(where, `${label}: filter still carries an unresolved template — ${where}`)
        .not.toMatch(/\{[^"{}]*\}/);
      expect(where, `${label}: resolved to something that is not a date — ${where}`)
        .toMatch(/\d{4}-\d{2}-\d{2}/);
    }
  });

  // ───────────────────────────────────────── the guard above CAN go red ──

  /**
   * The two cases below exist because a green assertion proves nothing until
   * the same assertion has been seen failing. `test/forecast-seeds.test.ts:201`
   * is green under both answers to #1107 — the defect this file was opened to
   * remove — so the probe must not repeat the trick in a new costume. These
   * drive the SAME probe with tokens that exercise the pre-pass's other two
   * outcomes, and each one lands on a different assertion above.
   */

  it('TEETH: a token the pre-pass does NOT consume reaches ObjectQL verbatim', async () => {
    // `{today}` is the split, exactly: `service-automation` cannot resolve it,
    // sees that `isKnownFilterToken('today')` is true, and deliberately passes
    // the literal through for the query layer to resolve. So a filter token CAN
    // arrive at ObjectQL intact — which is precisely the shape answer B would
    // have had, and proof that the recorder and the "verbatim" assertion above
    // would have caught it rather than being unfalsifiable.
    const { run, issued } = await runProbe({ $lt: '{today}' });
    expect(run?.success, String(run?.error ?? '')).toBe(true);
    expect(issued?.where).toEqual({ probe_date: { $lt: '{today}' } });
    // …and the query still worked, because THIS token is in ObjectQL's own
    // vocabulary. Two layers, two vocabularies, one query path.
    expect(JSON.stringify(issued!.where)).toMatch(/\{[^"{}]*\}/);
  });

  it('TEETH: a token NEITHER layer knows fails the run instead of querying', async () => {
    // The other outcome, and the one `{TODAY()}` would fall into if a future
    // release dropped it from the template evaluator: unresolved AND not a
    // known filter token, so `resolveNodeFilter` refuses the node rather than
    // silently dropping the condition and widening the sweep. The `success:
    // false` assertion in the census case above is what would catch that — here
    // it is, catching it.
    // ⚠️ The refusal MESSAGE changed on the 17.2.0 -> 17.3.0 upgrade; the
    // refusal itself did not. Through 17.2.0 the node was refused for being
    // unresolved ("resolved to nothing and were dropped"). Platform 17.3.0
    // (objectstack#11060) refuses one step earlier and more precisely: the
    // value-expression evaluator now knows its own closed vocabulary, so an
    // unknown NAME is named as such instead of being reported as an empty
    // resolution. What this case guards — `success: false`, and nothing
    // reaching the query layer — is asserted on both sides of that wording.
    const { run, issued } = await runProbe({ $lt: '{TOMORROW()}' });
    expect(run?.success).toBe(false);
    expect(String(run?.error)).toMatch(/unknown function 'TOMORROW'|resolved to nothing and were dropped/);
    expect(issued, 'a refused node must not reach the query layer at all').toBeUndefined();
  });
});
