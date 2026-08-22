// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { allHooks } from '../src/hooks';
import { makeHarness } from './helpers/hook-harness';
import { makeSandboxEngine, runHookBody, type Rec } from './helpers/action-sandbox';

/**
 * `ctx.api.object(x).update(...)` takes a DOCUMENT, not an id. This file is the
 * proof — and the reason the proof has to exist.
 *
 * `src/objects/_hook-api.ts` declared `update(id, doc)` for months. Nothing in
 * the repo could contradict it: `HookContext.api` is `unknown`, so the
 * declaration WAS the contract as far as the compiler was concerned, and both
 * hook stand-ins implemented the declaration rather than the engine. Every
 * hook-side derived write in the app therefore compiled, tested green, and
 * threw on every single invocation in production (#616):
 *
 *     update('crm_opportunity') does not recognise option 'amount'. The engine
 *     executes none of it, so the call would succeed with the option silently
 *     ignored (#4371).
 *
 * Rollups, the campaign completion snapshot and account promotion were dead for
 * as long as that type was wrong, and every one of them is `onError: 'log'`, so
 * the only symptom was a parent record that never moved.
 *
 * The lesson is about what the tests assert, not about the signature: a test
 * that watches a stand-in's row change proves the stand-in works. So these
 * assert the ARGUMENT LIST that reaches the engine, through the same
 * `hookBodyRunnerFactory` + repo facade the runtime wires at boot, with the
 * facade's contract itself pinned against a real ObjectQL below. A test written
 * this way fails against the broken signature; the ones that existed did not.
 */

type AnyRec = Record<string, any>;

const hook = (name: string): AnyRec => {
  const found = (allHooks as AnyRec[]).find((h) => h.name === name);
  if (!found) throw new Error(`no ${name} hook registered`);
  return found;
};

/** Today, the way every hook here stamps it. */
const today = new Date().toISOString().slice(0, 10);

const HOOK_DIR = join(process.cwd(), 'src', 'objects');
const hookFiles = (): string[] => readdirSync(HOOK_DIR).filter((f) => f.endsWith('.ts'));

/**
 * A file's source with comment lines blanked out.
 *
 * Both scans below look for `.update(`, and `_hook-api.ts` documents the very
 * signature it declares (`engine.update(object, data, options)`). Prose about
 * the API is not a call into it.
 */
const codeOf = (file: string): string =>
  readFileSync(join(HOOK_DIR, file), 'utf8')
    .split('\n')
    .map((line) => (/^\s*(\/\/|\*|\/\*)/.test(line) ? '' : line))
    .join('\n');

// ────────────────────────────────── the kernel says what the shape is ──

describe('the kernel’s update contract, first-hand', () => {
  const makeEngine = () =>
    ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_opportunity: {
          name: 'crm_opportunity',
          fields: { id: { type: 'text' }, name: { type: 'text' }, amount: { type: 'number' } },
        },
      } as never,
    });

  let ql: Awaited<ReturnType<typeof makeEngine>>;
  beforeAll(async () => {
    ql = await makeEngine();
  });
  afterAll(async () => {
    await ql?.close();
  });

  it('rejects the (id, doc) spelling every hook used to ship', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_opportunity').insert({ name: 'Rollup target', amount: 1 });

    await expect(
      (api.object('crm_opportunity') as AnyRec).update(row.id, { amount: 2450 }),
    ).rejects.toThrow(/does not recognise option 'amount'|Update requires an ID/);

    // The failure mode that made this invisible: the throw is the ONLY signal.
    // Nothing about the record says a write was attempted.
    expect((await api.object('crm_opportunity').findOne({ where: { id: row.id } }))?.amount).toBe(1);
  });

  it('applies `update({ id, …fields }, { where: { id } })` — the shape the hooks now ship', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_opportunity').insert({ name: 'Rollup target', amount: 1 });

    await api
      .object('crm_opportunity')
      .update({ id: row.id, amount: 2450 }, { where: { id: row.id } });

    expect((await api.object('crm_opportunity').findOne({ where: { id: row.id } }))?.amount).toBe(2450);
  });

  it('has no `updateMany` to call at all (the method `_hook-api.ts` used to declare)', () => {
    const api = ql.createContext({ isSystem: true });
    expect((api.object('crm_opportunity') as AnyRec).updateMany).toBeUndefined();
  });
});

// ───────────────────────── every hook-side derived write, shape-asserted ──

/**
 * One row per `update(...)` call site under `src/objects/` — the table from
 * #616, executed.
 *
 * `runHookBody` runs the hook's LOWERED body (the `body.source` the build
 * ships) inside QuickJS against the runtime's own repo facade, so what these
 * assert is not "the handler function worked" but "these are the arguments the
 * engine was handed".
 */
interface WriteCase {
  /** Registered hook name. */
  hook: string;
  /** The lifecycle event to fire. */
  event: string;
  input: Rec;
  previous?: Rec;
  /** Rows the hook reads / writes. */
  seed: Record<string, Rec[]>;
  /** The derived writes the hook must perform, in no particular order. */
  writes: Array<{ object: string; id: string; doc: Rec }>;
}

const CASES: Record<string, WriteCase> = {
  'opportunity_amount_rollup — the opportunity amount re-rolls from its lines': {
    hook: 'opportunity_amount_rollup',
    event: 'afterInsert',
    input: { crm_opportunity: 'opp_1' },
    seed: {
      crm_opportunity: [{ id: 'opp_1', stage: 'qualification', amount: 1 }],
      crm_opportunity_line_item: [
        { id: 'oli_1', crm_opportunity: 'opp_1', quantity: 2, unit_price: 1000, discount: 0 },
        { id: 'oli_2', crm_opportunity: 'opp_1', quantity: 1, unit_price: 500, discount: 10 },
      ],
    },
    writes: [{ object: 'crm_opportunity', id: 'opp_1', doc: { amount: 2450 } }],
  },

  'quote_total_rollup — subtotal / discount_amount / total_price re-roll': {
    hook: 'quote_total_rollup',
    event: 'afterInsert',
    input: { crm_quote: 'q_1' },
    seed: {
      crm_quote: [{ id: 'q_1', status: 'draft', discount: 10, tax: 50, shipping_handling: 25 }],
      crm_quote_line_item: [
        { id: 'qli_1', crm_quote: 'q_1', quantity: 4, unit_price: 100, discount: 0 },
      ],
    },
    writes: [
      {
        object: 'crm_quote',
        id: 'q_1',
        doc: { subtotal: 400, discount_amount: 40, total_price: 435 },
      },
    ],
  },

  // The four #597 metric-refresh hooks. `campaign_snapshot_metrics` used to sit
  // here alone, firing on the `→ completed` transition; it was replaced by a
  // refresh that runs on every input change, and each of the four triggers
  // reaches the SAME inlined write, so each needs its own call-shape case.
  //
  // Only the fields the stub engine can compute exactly are asserted — its
  // `where` matcher is equality-only, so the `$in` lead count comes back 0. The
  // metric arithmetic is covered in `hooks-runtime*.test.ts` and
  // `campaign-member-lifecycle.test.ts`; what is on trial in this file is the
  // call shape.
  'campaign_metrics_refresh — the status-transition refresh': {
    hook: 'campaign_metrics_refresh',
    event: 'afterUpdate',
    input: { id: 'cmp_1', status: 'completed' },
    previous: { id: 'cmp_1', status: 'in_progress' },
    seed: {
      crm_campaign: [{ id: 'cmp_1', status: 'completed' }],
      crm_campaign_member: [
        { id: 'cm_1', crm_campaign: 'cmp_1', crm_lead: 'lead_1', status: 'responded' },
      ],
      crm_opportunity: [
        { id: 'opp_1', crm_campaign: 'cmp_1', stage: 'closed_won', amount: 1000 },
      ],
      crm_lead: [{ id: 'lead_1', is_converted: true }],
    },
    writes: [
      {
        object: 'crm_campaign',
        id: 'cmp_1',
        doc: { num_opportunities: 1, num_won_opportunities: 1, num_sent: 1, actual_revenue: 1000 },
      },
    ],
  },

  'campaign_member_metrics_refresh — the live membership refresh': {
    hook: 'campaign_member_metrics_refresh',
    event: 'afterInsert',
    input: { id: 'cm_1', crm_campaign: 'cmp_1', crm_lead: 'lead_1', status: 'sent' },
    seed: {
      crm_campaign: [{ id: 'cmp_1', status: 'in_progress' }],
      crm_campaign_member: [
        { id: 'cm_1', crm_campaign: 'cmp_1', crm_lead: 'lead_1', status: 'sent' },
      ],
      crm_opportunity: [],
      crm_lead: [{ id: 'lead_1', is_converted: false }],
    },
    writes: [{ object: 'crm_campaign', id: 'cmp_1', doc: { num_sent: 1, num_responses: 0 } }],
  },

  // #601 — the writer that finally moves the knowledge article's engagement
  // counters. It RECOUNTS from `crm_article_feedback` rather than incrementing,
  // so the seeded article deliberately carries a WRONG stored count: a write
  // that reaches the engine correctly overwrites it with the true tally.
  'article_feedback_metrics_refresh — the article vote recount': {
    hook: 'article_feedback_metrics_refresh',
    event: 'afterInsert',
    input: { id: 'af_1', crm_knowledge_article: 'ka_1', verdict: 'helpful', owner_id: 'usr_1' },
    seed: {
      crm_knowledge_article: [{ id: 'ka_1', helpful_count: 99, not_helpful_count: 99 }],
      crm_article_feedback: [
        { id: 'af_1', crm_knowledge_article: 'ka_1', verdict: 'helpful', owner_id: 'usr_1' },
        { id: 'af_2', crm_knowledge_article: 'ka_1', verdict: 'not_helpful', owner_id: 'usr_2' },
      ],
    },
    writes: [
      { object: 'crm_knowledge_article', id: 'ka_1', doc: { helpful_count: 1, not_helpful_count: 1 } },
    ],
  },

  'campaign_member_optout_sync — the unsubscribe round-trip': {
    hook: 'campaign_member_optout_sync',
    event: 'afterUpdate',
    input: { id: 'cm_1', crm_campaign: 'cmp_1', crm_lead: 'lead_1', status: 'unsubscribed' },
    previous: { id: 'cm_1', crm_campaign: 'cmp_1', crm_lead: 'lead_1', status: 'sent' },
    seed: { crm_lead: [{ id: 'lead_1', email_opt_out: false }] },
    writes: [{ object: 'crm_lead', id: 'lead_1', doc: { email_opt_out: true } }],
  },

  // The contact branch of the same hook is a SECOND update() call site — the
  // two are not an if/else, so a row carrying both lookups opts out both people
  // rather than half of them, and each branch needs its own case here.
  'campaign_member_optout_sync — the contact branch': {
    hook: 'campaign_member_optout_sync',
    event: 'afterUpdate',
    input: { id: 'cm_2', crm_campaign: 'cmp_1', crm_contact: 'con_1', status: 'unsubscribed' },
    previous: { id: 'cm_2', crm_campaign: 'cmp_1', crm_contact: 'con_1', status: 'sent' },
    seed: { crm_contact: [{ id: 'con_1', email_opt_out: false }] },
    writes: [{ object: 'crm_contact', id: 'con_1', doc: { email_opt_out: true } }],
  },

  'campaign_attribution_refresh — the opportunity side': {
    hook: 'campaign_attribution_refresh',
    event: 'afterUpdate',
    input: { id: 'opp_1', crm_campaign: 'cmp_1', stage: 'closed_won' },
    previous: { id: 'opp_1', crm_campaign: 'cmp_1', stage: 'negotiation' },
    seed: {
      crm_campaign: [{ id: 'cmp_1', status: 'in_progress' }],
      crm_campaign_member: [],
      crm_opportunity: [{ id: 'opp_1', crm_campaign: 'cmp_1', stage: 'closed_won', amount: 250 }],
      crm_lead: [],
    },
    writes: [
      {
        object: 'crm_campaign',
        id: 'cmp_1',
        doc: { num_opportunities: 1, num_won_opportunities: 1, actual_revenue: 250 },
      },
    ],
  },

  'campaign_lead_conversion_refresh — promotes the member, then refreshes': {
    hook: 'campaign_lead_conversion_refresh',
    event: 'afterUpdate',
    input: { id: 'lead_1', is_converted: true },
    previous: { id: 'lead_1', is_converted: false },
    seed: {
      crm_campaign: [{ id: 'cmp_1', status: 'in_progress' }],
      crm_campaign_member: [
        { id: 'cm_1', crm_campaign: 'cmp_1', crm_lead: 'lead_1', status: 'responded' },
      ],
      crm_opportunity: [],
      crm_lead: [{ id: 'lead_1', is_converted: true }],
    },
    writes: [
      { object: 'crm_campaign_member', id: 'cm_1', doc: { status: 'converted' } },
      { object: 'crm_campaign', id: 'cmp_1', doc: { num_sent: 1, num_responses: 1 } },
    ],
  },

  'opportunity_promote_account — the won deal promotes its account': {
    hook: 'opportunity_promote_account',
    event: 'afterUpdate',
    input: { id: 'opp_1', stage: 'closed_won', crm_account: 'acc_1', owner_id: 'usr_1' },
    previous: { id: 'opp_1', stage: 'negotiation' },
    seed: { crm_account: [{ id: 'acc_1', type: 'prospect' }] },
    writes: [{ object: 'crm_account', id: 'acc_1', doc: { type: 'customer' } }],
  },

  'contract_on_activation — signed_date stamp AND account promotion': {
    hook: 'contract_on_activation',
    event: 'afterUpdate',
    input: { id: 'ctr_1', status: 'activated', crm_account: 'acc_1', end_date: '2027-01-01' },
    previous: { id: 'ctr_1', status: 'draft' },
    seed: {
      crm_contract: [{ id: 'ctr_1', status: 'activated' }],
      crm_account: [{ id: 'acc_1', type: 'prospect' }],
    },
    writes: [
      { object: 'crm_contract', id: 'ctr_1', doc: { signed_date: today } },
      { object: 'crm_account', id: 'acc_1', doc: { type: 'customer' } },
    ],
  },

  'case_status_side_effects — the account service rollup': {
    hook: 'case_status_side_effects',
    event: 'afterUpdate',
    input: { id: 'case_1', status: 'resolved', crm_account: 'acc_1' },
    previous: { id: 'case_1', status: 'in_progress' },
    seed: { crm_account: [{ id: 'acc_1', type: 'customer' }] },
    writes: [{ object: 'crm_account', id: 'acc_1', doc: { last_activity_date: today } }],
  },

  'quote_on_accepted — the opportunity close-out': {
    hook: 'quote_on_accepted',
    event: 'afterUpdate',
    input: {
      id: 'q_1',
      status: 'accepted',
      crm_account: 'acc_1',
      crm_opportunity: 'opp_1',
      total_price: 1000,
    },
    previous: { id: 'q_1', status: 'draft' },
    seed: { crm_opportunity: [{ id: 'opp_1', stage: 'proposal' }] },
    writes: [
      { object: 'crm_opportunity', id: 'opp_1', doc: { stage: 'closed_won', close_date: today } },
    ],
  },

  'task_activity_bubble — the activity bubble on the parent record': {
    hook: 'task_activity_bubble',
    event: 'afterUpdate',
    // The COMPLETING transition is what bubbles now (#592): an open task is a
    // promise, not an interaction, and the hook used to fire on any edit.
    input: { id: 'task_1', status: 'completed', related_to_account: 'acc_1' },
    previous: { id: 'task_1', status: 'in_progress' },
    seed: { crm_account: [{ id: 'acc_1' }] },
    writes: [{ object: 'crm_account', id: 'acc_1', doc: { last_activity_date: today } }],
  },

  'event_activity_bubble — interaction recency from a held event': {
    hook: 'event_activity_bubble',
    event: 'afterUpdate',
    input: { id: 'evt_1', status: 'held', related_to_account: 'acc_1' },
    previous: { id: 'evt_1', status: 'planned' },
    seed: { crm_account: [{ id: 'acc_1' }] },
    writes: [{ object: 'crm_account', id: 'acc_1', doc: { last_activity_date: today } }],
  },

  // The second derived write in the same handler (#595): the first held event
  // on a case stamps `first_response_date`. The case carries no `crm_account`,
  // so the recency walk-up finds no parent and this is the only write — which
  // is what lets the per-object assertions above stay "exactly one update".
  'event_activity_bubble — first response on the related case': {
    hook: 'event_activity_bubble',
    event: 'afterInsert',
    input: { id: 'evt_2', status: 'held', related_to_case: 'case_1' },
    seed: { crm_case: [{ id: 'case_1', first_response_date: null }] },
    writes: [
      { object: 'crm_case', id: 'case_1', doc: { first_response_date: expect.any(String) } },
    ],
  },
};

describe('every hook-side derived write reaches the engine in the engine’s own shape', () => {
  it.each(Object.keys(CASES))('%s', async (label) => {
    const spec = CASES[label]!;
    const engine = makeSandboxEngine(spec.seed);

    await runHookBody(hook(spec.hook), {
      event: spec.event,
      input: { ...spec.input },
      previous: spec.previous,
      user: { id: 'usr_1' },
      engine,
    });

    for (const expected of spec.writes) {
      const calls = engine.callsFor(expected.object, 'update');
      expect(calls, `${spec.hook} performed no update on ${expected.object}`).toHaveLength(1);
      const { args } = calls[0]!;

      // (1) Two positional arguments — a document and options. The broken
      //     spelling put an id string first and the document second, where the
      //     engine reads its OPTIONS bag; that is what produced the "does not
      //     recognise option" throw on every invocation.
      expect(args).toHaveLength(2);
      const [doc, options] = args as [Rec, Rec];
      expect(typeof doc, 'the first argument must be the document, never an id').toBe('object');
      expect(doc).not.toBeNull();

      // (2) The target id travels INSIDE the document — that is the only place
      //     `ObjectQL.update` looks for it first.
      expect(doc.id).toBe(expected.id);
      expect(doc).toMatchObject(expected.doc);

      // (3) The row scope is explicit and agrees with the document. A `where`
      //     naming a different row would be silently ignored by the kernel
      //     (`data.id` wins), so a disagreement can only ever be a bug.
      expect(options).toEqual({ where: { id: expected.id } });

      // (4) And, because a correct shape that writes nothing is still a dead
      //     rollup: the stored row actually moved.
      const row = engine.rows(expected.object).find((r) => r.id === expected.id);
      expect(row, `${expected.object}/${expected.id} was not stored`).toBeDefined();
      expect(row).toMatchObject(expected.doc);
    }
  });

  it('covers every `update(` call site under src/objects/', () => {
    const sites = hookFiles().flatMap((f) =>
      [...codeOf(f).matchAll(/\.update\(/g)].map(() => f),
    );
    const covered = Object.values(CASES).flatMap((c) => c.writes).length;
    expect(
      covered,
      `src/objects/ has ${sites.length} update() call sites (${[...new Set(sites)].join(', ')}) ` +
        `but this file exercises ${covered}. A derived write nothing runs is a derived write ` +
        'nobody notices is dead — add the case.',
    ).toBe(sites.length);
  });
});

// ─────────────────────────────────────── the shape, enforced statically ──

/**
 * The runtime assertions above can only speak for the call sites they exercise.
 * This one speaks for all of them, including ones added tomorrow: a first
 * argument that is not an object literal is the #616 defect, whatever else the
 * hook does.
 */
describe('no hook-side code may address a write by bare id', () => {
  it('finds files to check (guards against a silently empty scan)', () => {
    expect(hookFiles().length).toBeGreaterThan(10);
  });

  it.each(hookFiles())('%s passes a document to update()/delete(), never an id', (file) => {
    const code = codeOf(file);
    const offenders: string[] = [];
    for (const m of code.matchAll(/\.(update|delete)\(/g)) {
      const rest = code.slice(m.index! + m[0].length);
      const firstChar = rest.replace(/^\s*/, '')[0];
      if (firstChar !== '{') offenders.push(`${m[1]}(${rest.slice(0, 24).trim()}…`);
    }
    expect(
      offenders,
      `${file} calls the repository facade with an id where a document/options object belongs — ` +
        'the engine reads the second positional argument as its options bag and throws ' +
        '"does not recognise option" on every invocation (#616).',
    ).toEqual([]);
  });
});

// ──────────────────────────────────────── the stand-in is not a liar ──

/**
 * The harness half of the same rule as `hook-query-predicate.test.ts`: a fake
 * that accepts what the kernel rejects turns a green suite into evidence of
 * nothing. `hook-harness.ts` previously implemented `update(id, doc)` — the
 * declaration, not the engine — which is precisely why every rollup test passed
 * while the rollups were dead.
 */
describe('the hook harness must not be more permissive than the kernel', () => {
  const seeded = () => makeHarness({ crm_opportunity: [{ id: 'opp_1', amount: 1 }] });

  it('rejects update(id, doc) instead of quietly doing what the caller meant', async () => {
    const h = seeded();
    await expect(
      (h.api.object('crm_opportunity') as AnyRec).update('opp_1', { amount: 2450 }),
    ).rejects.toThrow(/DOCUMENT/);
    expect(h.rows('crm_opportunity')[0]!.amount, 'a rejected write must not land').toBe(1);
  });

  it('rejects a document with no id — the kernel would have no row to resolve', async () => {
    const h = seeded();
    await expect(
      (h.api.object('crm_opportunity') as AnyRec).update({ amount: 2450 }, { where: { id: 'opp_1' } }),
    ).rejects.toThrow(/carries no `id`/);
  });

  it('rejects a missing row scope', async () => {
    const h = seeded();
    await expect(
      (h.api.object('crm_opportunity') as AnyRec).update({ id: 'opp_1', amount: 2450 }),
    ).rejects.toThrow(/where/);
  });

  it('rejects a scope that disagrees with the document', async () => {
    const h = seeded();
    await expect(
      h.api.object('crm_opportunity').update({ id: 'opp_1', amount: 2450 }, { where: { id: 'opp_2' } }),
    ).rejects.toThrow(/scopes to 'opp_2'/);
  });

  it('applies the shape the hooks ship, and records both arguments', async () => {
    const h = seeded();
    await h.api
      .object('crm_opportunity')
      .update({ id: 'opp_1', amount: 2450 }, { where: { id: 'opp_1' } });
    expect(h.rows('crm_opportunity')[0]!.amount).toBe(2450);
    expect(h.callsFor('crm_opportunity', 'update')[0]!.args).toEqual([
      { id: 'opp_1', amount: 2450 },
      { where: { id: 'opp_1' } },
    ]);
  });

  it('has no `updateMany`, exactly like the surface it stands in for', () => {
    expect((makeHarness().api.object('crm_opportunity') as AnyRec).updateMany).toBeUndefined();
  });
});
