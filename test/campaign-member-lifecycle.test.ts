// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import campaignMemberHooks from '../src/objects/campaign_member.hook';
import { CampaignMember } from '../src/objects/campaign_member.object';
import { Campaign } from '../src/objects/campaign.object';
import stack from '../objectstack.config';
import campaignHooks, { CAMPAIGN_METRIC_FIELDS } from '../src/objects/campaign.hook';
import { extractSandboxBody } from './helpers/action-sandbox';
import { localePacks } from './helpers/metadata-fixtures';
import { makeHarness, makeCtx, hookNamed, type Rec } from './helpers/hook-harness';

/**
 * `crm_campaign_member` lifecycle — the #597 contract, both halves.
 *
 * The card's shape is a trade, and this file pins both sides of it so neither
 * can drift back:
 *
 *  1. **The trim.** `first_opened_date`, `first_clicked_date` and the
 *     `opened` / `clicked` / `bounced` statuses are gone. They were never
 *     writable: `@objectstack/plugin-email` is outbound-only (its
 *     `sys_email.status` vocabulary is `queued | sent | failed`), there is no
 *     open/click webhook and no bounce ingestion anywhere on the platform, so
 *     an author was promised engagement tracking the product cannot deliver.
 *  2. **The writers.** Every value that SURVIVED has a real one, and the tests
 *     below run those writers rather than asserting that they are registered.
 *
 * The half that is easiest to fake is the live-metrics one, so it is asserted
 * the only way that distinguishes it from the old behaviour: a membership
 * changes, the campaign is NOT completed, and the numbers have already moved.
 */

const USER = { id: 'user_1' };

// ────────────────────────────────────────────────── the trim (metadata) ──

describe('the untrackable tracker surface is gone (#597)', () => {
  const fields = CampaignMember.fields as Record<string, Rec>;

  it('ships no field the platform cannot write', () => {
    // Not "these two are absent" — anything shaped like an engagement stamp
    // reintroduced later trips this too.
    const unwritable = Object.keys(fields).filter((f) => /opened|clicked|bounced/.test(f));
    expect(unwritable, `fields no writer can reach: ${unwritable.join(', ')}`).toEqual([]);
  });

  it('offers only lifecycle statuses a writer produces', () => {
    const values = (fields.status.options as Rec[]).map((o) => String(o.value));
    expect(values).toEqual(['sent', 'responded', 'converted', 'unsubscribed']);
  });

  /**
   * A removed option is only really removed when the locale packs stop
   * translating it. A stale entry is not inert decoration: it is a translation
   * that was written, shipped and can never render, and it is exactly what
   * `test/i18n-references.test.ts` calls a key that names nothing.
   */
  it('no locale pack translates a status option that no longer exists', () => {
    const values = new Set((fields.status.options as Rec[]).map((o) => String(o.value)));
    expect(localePacks.length, 'no locale packs found — derivation is broken').toBeGreaterThanOrEqual(4);
    const bad: string[] = [];
    for (const [locale, pack] of localePacks) {
      const member = pack?.objects?.crm_campaign_member;
      for (const key of Object.keys(member?.fields?.status?.options ?? {})) {
        if (!values.has(key)) bad.push(`${locale}: status.${key}`);
      }
      for (const key of Object.keys(member?.fields ?? {})) {
        if (!(key in fields)) bad.push(`${locale}: field ${key}`);
      }
    }
    expect(bad, `translations for a surface that no longer exists:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

// ──────────────────────────────────────────── has_responded / response ──

describe('campaign_member_lifecycle', () => {
  const hook = hookNamed(campaignMemberHooks, 'campaign_member_lifecycle');

  it('back-fills has_responded and response_date when a rep flips the status by hand', async () => {
    // The `mark_responded` action stamps all three. This is the OTHER path —
    // the record detail page, where only `status` is written — and without the
    // hook the row reads "Responded" beside "Has Responded: false".
    const input: Rec = { status: 'responded' };
    await hook.handler(makeCtx({
      event: 'beforeUpdate', input, previous: { status: 'sent' }, user: USER,
    }));
    expect(input.has_responded).toBe(true);
    expect(typeof input.response_date, 'a responded member needs a response date').toBe('string');
  });

  it('counts `converted` as responded — a member cannot convert without answering', async () => {
    const input: Rec = { status: 'converted' };
    await hook.handler(makeCtx({
      event: 'beforeUpdate', input, previous: { status: 'sent' }, user: USER,
    }));
    expect(input.has_responded).toBe(true);
  });

  it('never moves an existing response date forward on a later edit', async () => {
    // Response-time reporting reads this column; re-stamping it on every touch
    // would quietly rewrite when the person answered.
    const input: Rec = { status: 'converted' };
    await hook.handler(makeCtx({
      event: 'beforeUpdate',
      input,
      previous: { status: 'responded', response_date: '2026-01-01T00:00:00.000Z' },
      user: USER,
    }));
    expect(input.response_date, 'the original stamp survives').toBeUndefined();
  });

  it('clears the summary when a member is reset out of a responded state', async () => {
    const input: Rec = { status: 'sent' };
    await hook.handler(makeCtx({
      event: 'beforeUpdate',
      input,
      previous: { status: 'responded', has_responded: true, response_date: '2026-01-01T00:00:00.000Z' },
      user: USER,
    }));
    expect(input.has_responded).toBe(false);
    expect(input.response_date).toBeNull();
  });

  it('defaults has_responded on a fresh enrollment', async () => {
    const input: Rec = { crm_campaign: 'cmp1', crm_lead: 'l1', status: 'sent' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.has_responded).toBe(false);
    expect(input.response_date, 'nothing to stamp yet').toBeUndefined();
  });
});

// ─────────────────────────────────────────────────── the opt-out loop ──

describe('campaign_member_optout_sync', () => {
  const hook = hookNamed(campaignMemberHooks, 'campaign_member_optout_sync');

  const store = () => ({
    crm_lead: [{ id: 'l1', email_opt_out: false }],
    crm_contact: [{ id: 'c1', email_opt_out: false }],
    crm_campaign: [{ id: 'cmp1', status: 'in_progress' }],
    crm_campaign_member: [],
  });

  /**
   * The app already had one half of this loop: `campaign_enrollment` filters on
   * `email_opt_out: false` and `send_email` hides itself on an opted-out
   * contact. Nothing ever SET the flag, so honouring it was a promise about a
   * column no user action could reach — unsubscribing marked the junction row
   * and left the person enrollable by the very next campaign.
   */
  it('round-trips an unsubscribed LEAD member to email_opt_out', async () => {
    const h = makeHarness(store());
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'unsubscribed' },
      previous: { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'sent' },
      user: USER,
      api: h.api,
    }));
    expect(h.rows('crm_lead')[0].email_opt_out).toBe(true);
  });

  it('round-trips an unsubscribed CONTACT member too', async () => {
    const h = makeHarness(store());
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'm2', crm_campaign: 'cmp1', crm_contact: 'c1', status: 'unsubscribed' },
      previous: { id: 'm2', crm_campaign: 'cmp1', crm_contact: 'c1', status: 'sent' },
      user: USER,
      api: h.api,
    }));
    expect(h.rows('crm_contact')[0].email_opt_out).toBe(true);
  });

  it('syncs on insert, not only on update — an import can land already unsubscribed', async () => {
    const h = makeHarness(store());
    await hook.handler(makeCtx({
      event: 'afterInsert',
      input: { id: 'm3', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'unsubscribed' },
      user: USER,
      api: h.api,
    }));
    expect(h.rows('crm_lead')[0].email_opt_out).toBe(true);
  });

  it('leaves every other status alone', async () => {
    const h = makeHarness(store());
    for (const status of ['sent', 'responded', 'converted']) {
      await hook.handler(makeCtx({
        event: 'afterUpdate',
        input: { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status },
        previous: { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'sent' },
        user: USER,
        api: h.api,
      }));
    }
    expect(h.calls, 'only an unsubscribe writes').toHaveLength(0);
    expect(h.rows('crm_lead')[0].email_opt_out).toBe(false);
  });

  it('does not re-sync a member that was already unsubscribed', async () => {
    const h = makeHarness(store());
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'unsubscribed' },
      previous: { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'unsubscribed' },
      user: USER,
      api: h.api,
    }));
    expect(h.calls).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────── live metrics ──

describe('campaign_member_metrics_refresh — LIVE, not at completion', () => {
  const hook = hookNamed(campaignMemberHooks, 'campaign_member_metrics_refresh');

  /** A campaign mid-flight, with two members already enrolled. */
  const live = () => makeHarness({
    crm_campaign: [{ id: 'cmp1', status: 'in_progress', num_sent: 2, num_responses: 0 }],
    crm_campaign_member: [
      { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'sent' },
      { id: 'm2', crm_campaign: 'cmp1', crm_contact: 'c1', status: 'sent' },
    ],
    crm_lead: [{ id: 'l1', is_converted: false }],
    crm_opportunity: [],
  });

  /**
   * ⚠️ THE ACCEPTANCE CRITERION, and the one assertion the removed behaviour
   * would also have passed if it were written any other way.
   *
   * The RETIRED `campaign_snapshot_metrics` — gone since #597, replaced by the
   * four refresh hooks this file exercises — fired on the `→ completed`
   * transition ONLY, so "the numbers are right once the campaign is completed"
   * was true before this change and proves nothing about it. What has to be
   * shown is that the numbers move while the campaign is still `in_progress` —
   * the state it spends its entire useful life in, and during which every
   * metric read 0.
   *
   * So: enrol a third member, do NOT touch the campaign's status, and read the
   * campaign back.
   */
  it('a new member moves num_sent immediately, with the campaign still in_progress', async () => {
    const h = live();
    h.rows('crm_campaign_member').push({ id: 'm3', crm_campaign: 'cmp1', crm_lead: 'l2', status: 'sent' });
    h.rows('crm_lead').push({ id: 'l2', is_converted: false });

    await hook.handler(makeCtx({
      event: 'afterInsert',
      input: { id: 'm3', crm_campaign: 'cmp1', crm_lead: 'l2', status: 'sent' },
      user: USER,
      api: h.api,
    }));

    const campaign = h.rows('crm_campaign')[0];
    expect(campaign.status, 'the campaign must still be running for this to mean anything').toBe('in_progress');
    expect(campaign.num_sent).toBe(3);
    expect(campaign.num_leads).toBe(2);
  });

  it('marking one member responded moves num_responses immediately', async () => {
    const h = live();
    h.rows('crm_campaign_member')[0].status = 'responded';
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'responded' },
      previous: { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'sent' },
      user: USER,
      api: h.api,
    }));
    const campaign = h.rows('crm_campaign')[0];
    expect(campaign.status).toBe('in_progress');
    expect(campaign.num_responses).toBe(1);
    // response_rate is a FORMULA over these two; a live num_sent of 2 with one
    // response is the 50% the ROI dashboard renders.
    expect(campaign.num_sent).toBe(2);
  });

  it('removing a member decrements it, again with no status transition', async () => {
    const h = live();
    h.rows('crm_campaign_member').splice(1, 1);
    await hook.handler(makeCtx({
      event: 'afterDelete',
      input: {},
      previous: { id: 'm2', crm_campaign: 'cmp1', crm_contact: 'c1', status: 'sent' },
      user: USER,
      api: h.api,
    }));
    expect(h.rows('crm_campaign')[0].num_sent).toBe(1);
  });

  it('refreshes BOTH campaigns when a member is moved between them', async () => {
    const h = makeHarness({
      crm_campaign: [
        { id: 'cmp1', status: 'in_progress' },
        { id: 'cmp2', status: 'planning' },
      ],
      crm_campaign_member: [{ id: 'm1', crm_campaign: 'cmp2', crm_lead: 'l1', status: 'sent' }],
      crm_lead: [{ id: 'l1', is_converted: false }],
      crm_opportunity: [],
    });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'm1', crm_campaign: 'cmp2', crm_lead: 'l1', status: 'sent' },
      previous: { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'sent' },
      user: USER,
      api: h.api,
    }));
    const byId = Object.fromEntries(h.rows('crm_campaign').map((c) => [c.id, c]));
    expect(byId.cmp2.num_sent).toBe(1);
    expect(byId.cmp1.num_sent, 'the campaign it left has to shrink').toBe(0);
  });

  /**
   * The other side of the recursion guard in `campaign.hook.ts`: this hook
   * writes `crm_campaign`, and the campaign-side refresh listens on
   * `crm_campaign`. It does not loop because the write carries no `status`.
   */
  it('writes only the metric block, so it cannot re-trigger the campaign refresh', async () => {
    const h = live();
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'responded' },
      previous: { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'sent' },
      user: USER,
      api: h.api,
    }));
    const writes = h.callsFor('crm_campaign', 'update');
    expect(writes).toHaveLength(1);
    expect(Object.keys(writes[0].args[0] as Rec)).not.toContain('status');
  });
});

// ─────────────────────────────────────── every field has a writer (#597) ──

describe('every surviving member field and campaign metric has a writer', () => {
  /**
   * The card's own acceptance criterion, mechanised. `WRITERS` is the table the
   * PR body carries; this test only checks that it COVERS the schema, so a
   * field added later without a writer fails here instead of shipping inert.
   */
  const MEMBER_WRITERS: Record<string, string> = {
    member_number: 'platform autonumber',
    crm_campaign: 'campaign_enrollment flow / create_campaign / add_contact_to_campaign',
    crm_lead: 'campaign_enrollment flow (leads branch) / create_campaign',
    crm_contact: 'campaign_enrollment flow (contacts branch) / add_contact_to_campaign',
    added_date: 'campaign_enrollment flow',
    status: 'enrollment (sent) / mark_responded / campaign_lead_conversion_refresh / rep unsubscribe',
    response_date: 'mark_responded action + campaign_member_lifecycle',
    has_responded: 'campaign_member_lifecycle',
  };

  const CAMPAIGN_METRIC_WRITERS: Record<string, string> = {
    num_sent: 'campaign metric refresh hooks',
    num_responses: 'campaign metric refresh hooks',
    num_leads: 'campaign metric refresh hooks',
    num_converted_leads: 'campaign metric refresh hooks',
    num_opportunities: 'campaign metric refresh hooks',
    num_won_opportunities: 'campaign metric refresh hooks',
    actual_revenue: 'campaign metric refresh hooks',
    // Manual entry by design — nothing on the platform knows what a booth cost.
    // Their writer is a HUMAN, which is only true while the form gives them a
    // reachable place to type it; `test/view-references.test.ts` and the form
    // section assertion below are what keep that half honest.
    actual_cost: 'human, via the Budget & ROI form section',
    budgeted_cost: 'human, via the Budget & ROI form section',
    expected_revenue: 'human, via the Budget & ROI form section',
    target_size: 'human, via the Performance form section',
    response_rate: 'formula over num_responses / num_sent',
    roi: 'formula over actual_revenue / actual_cost',
  };

  it('every campaign_member field is accounted for', () => {
    const missing = Object.keys(CampaignMember.fields as Record<string, unknown>)
      .filter((f) => !(f in MEMBER_WRITERS));
    expect(missing, `member fields with no declared writer: ${missing.join(', ')}`).toEqual([]);
  });

  it('every campaign metric and money field is accounted for', () => {
    const fields = Campaign.fields as Record<string, Rec>;
    const metricish = Object.keys(fields).filter(
      (f) => f.startsWith('num_') || f.endsWith('_cost') || f.endsWith('_revenue')
        || f === 'response_rate' || f === 'roi' || f === 'target_size',
    );
    expect(metricish.length, 'derivation found nothing — it is broken').toBeGreaterThan(10);
    const missing = metricish.filter((f) => !(f in CAMPAIGN_METRIC_WRITERS));
    expect(missing, `campaign metrics with no declared writer: ${missing.join(', ')}`).toEqual([]);
  });

  /**
   * `roi` divides by `actual_cost`, `actual_cost` is manual-entry, and a manual
   * field nobody can find is not written. The chain is only closed while the
   * form gives those two a section of their own — so the section is asserted,
   * not assumed.
   */
  it('the manual-entry cost fields sit in a visible form section beside roi', () => {
    const views = (stack.views ?? {}) as Record<string, Rec>;
    const campaignForm = Object.values(views)
      .map((v) => v?.form)
      .find((f) => Array.isArray(f?.sections)
        && (f.sections as Rec[]).some((s) => (s.fields ?? []).includes?.('budgeted_cost')));
    expect(campaignForm, 'the campaign form no longer exposes budgeted_cost at all').toBeTruthy();
    const section = (campaignForm!.sections as Rec[]).find(
      (s) => (s.fields as string[]).includes('budgeted_cost'),
    )!;
    const fields = section.fields as string[];
    expect(fields).toContain('actual_cost');
    expect(fields, 'roi belongs beside the costs it divides by').toContain('roi');
    expect(section.name, 'a nameless section renders untranslated in every locale').toBe('budget');
  });
});

// ────────────────────────────────── the four inlined recompute copies ──

/**
 * The metric recompute is written out FOUR times — once per trigger — and this
 * is the guard that keeps the four copies one definition.
 *
 * It is duplicated for a hard platform reason, not for convenience: L2 hook
 * bodies lower to metadata and run BODY-ONLY in the QuickJS sandbox, so a
 * handler cannot reach module scope. The first draft of #597 shared a
 * `refreshCampaignMetrics()` import; `test/action-sandbox.test.ts` failed it,
 * because a body with a free identifier silently stops lowering — the CLI keeps
 * the handler in a bundled runtime file and the hook is no longer deployable as
 * pure metadata. `account_protection` inlines the territory table for the same
 * reason, and `test/territory-single-source.test.ts` guards it the same way.
 *
 * What this asserts is the thing duplication actually costs: a fix landing on
 * one copy and skipping three. The comparison is on the LOWERED bodies (what
 * ships), not the TypeScript source, and comments are stripped first so the
 * per-hook prose around each block does not count as divergence.
 */
describe('the inlined metric recompute is one definition, copied (#597)', () => {
  const REFRESH_HOOKS = [
    ...(campaignHooks as Rec[]),
    ...(campaignMemberHooks as Rec[]),
  ].filter((h) => /recompute/.test(String(h.description)) || /refresh/.test(String(h.name)));

  /** The block between the `recompute` fences, comments stripped, whitespace flat. */
  const recomputeBlockOf = (hook: Rec): string | null => {
    const { source } = extractSandboxBody(hook.handler, `hook '${String(hook.name)}'`);
    const stripped = source
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n')
      .replace(/\s+/g, ' ');
    // The fences themselves are comments, so the block is located by its first
    // and last statements instead — both unmistakable, neither appearing
    // anywhere else in these bodies. Note the DOUBLE quotes: the lowered body is
    // the bundler's output, not the TypeScript source, and it re-quotes every
    // string literal (it also folds `5000` to `5e3`). Anchoring on the authored
    // spelling silently matched nothing and made this test vacuously green
    // until the `no recompute block found` guard below caught it.
    const START = 'const memberRows = await api.object("crm_campaign_member")';
    const END = '}, { where: { id } });';
    const start = stripped.indexOf(START);
    const end = stripped.indexOf(END, start);
    if (start < 0 || end < 0) return null;
    return stripped.slice(start, end + END.length);
  };

  it('finds every refresh hook — the derivation is not silently empty', () => {
    const names = REFRESH_HOOKS.map((h) => String(h.name)).sort();
    expect(names).toEqual([
      'campaign_attribution_refresh',
      'campaign_lead_conversion_refresh',
      'campaign_member_metrics_refresh',
      'campaign_metrics_refresh',
    ]);
  });

  it('every copy of the recompute block is character-identical', () => {
    const blocks = REFRESH_HOOKS.map((h) => [String(h.name), recomputeBlockOf(h)] as const);
    const missing = blocks.filter(([, b]) => b === null).map(([n]) => n);
    expect(missing, `no recompute block found in: ${missing.join(', ')}`).toEqual([]);
    const canonical = blocks[0]![1];
    const divergent = blocks.filter(([, b]) => b !== canonical).map(([n]) => n);
    expect(
      divergent,
      `these hooks compute the campaign metrics differently: ${divergent.join(', ')} — ` +
        'a fix that landed on one copy and skipped the others is exactly what this guards',
    ).toEqual([]);
  });

  it('and it writes every metric field, so no copy can go partial', () => {
    const block = recomputeBlockOf(REFRESH_HOOKS[0]!)!;
    for (const field of CAMPAIGN_METRIC_FIELDS) {
      expect(block, `the recompute never writes ${field}`).toContain(`${field}:`);
    }
  });
});
