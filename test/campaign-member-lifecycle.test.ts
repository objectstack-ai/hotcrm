// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import campaignMemberHooks from '../src/marketing/objects/campaign_member.hook';
import { CampaignMember } from '../src/marketing/objects/campaign_member.object';
import { Campaign } from '../src/marketing/objects/campaign.object';
import stack, { localePacks } from './helpers/composed-stack';
import campaignHooks, { CAMPAIGN_METRIC_FIELDS } from '../src/marketing/objects/campaign.hook';
// The two hooks of this family that fire on a SALES object live beside that
// object since the ADR-0130 layout (co-location is what enforces R4) — the
// four bodies are still one definition copied, and this suite still reads all
// four, now from three files.
import opportunityCampaignMetricsHooks from '../src/sales/objects/opportunity.campaign-metrics.hook';
import leadCampaignMetricsHooks from '../src/sales/objects/lead.campaign-metrics.hook';
import { extractHookBody } from '@objectstack/cli/hook-body';
import {
  hotcrmStack, signUpPerson, systemUpdate, recordEngineWrites, daysFromNow, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

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
 *
 * The writers run on the shipped app booted by `@objectstack/verify`: a
 * marketing user working a campaign's members through the engine's write door
 * (`hooks.run`), the campaign and the people written as the system, an admin
 * removing a member (marketing holds no delete right); what is asserted is the
 * row the engine stored. Two of the hooks are `async: true`, so their result is
 * waited for, and a claim that one wrote NOTHING is read off the writes the
 * engine received.
 */

let verify: VerifyStack;
let admin: string;
let marketer: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  marketer = await signUpPerson(verify, 'marketer@campaign-member-lifecycle.test', {
    name: 'Marketing User', positions: ['marketing_user'], permissionSets: ['marketing_user'],
  });
}, 120_000);

const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;

/** A running campaign of the marketer's, written as the system. */
const campaignOf = async (over: Rec = {}): Promise<Rec> =>
  (await verify.seed('crm_campaign', [{
    name: `Spring Push ${++k}`, status: 'in_progress', start_date: daysFromNow(-7), end_date: daysFromNow(30),
    owner_id: marketer.id, ...over,
  }]))[0]!;

/** A lead and a contact of the marketer's, written as the system. */
const people = async (): Promise<{ lead: Rec; contact: Rec }> => {
  const n = ++k;
  const [lead] = await verify.seed('crm_lead', [{
    first_name: 'Lee', last_name: `Member ${n}`, company: `Lead Co ${n}`, email: `lee${n}@campaign-member-lifecycle.test`,
    email_opt_out: false, owner_id: marketer.id,
  }]);
  const [account] = await verify.seed('crm_account', [{ name: `Member Co ${n}`, owner_id: marketer.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Cy', last_name: `Member ${n}`, email: `cy${n}@campaign-member-lifecycle.test`, crm_account: account!.id,
    email_opt_out: false, owner_id: marketer.id,
  }]);
  return { lead: lead!, contact: contact! };
};

/** The marketer enrolling `who` (a `crm_lead` / `crm_contact` link) in `campaign`. */
const enroll = (campaign: Rec, who: Rec, status = 'sent'): Promise<Rec> =>
  verify.hooks.run('crm_campaign_member', 'insert', { crm_campaign: campaign.id, status, ...who }, { as: marketer.token });

/** The marketer editing a member. */
const editMember = (id: string, doc: Rec): Promise<Rec> =>
  verify.hooks.run('crm_campaign_member', 'update', { id, ...doc }, { as: marketer.token });

/** Run `write`, give the async hooks time to run, and return what the engine received. */
const engineWritesDuring = async (write: () => Promise<unknown>) => {
  const recorder = recordEngineWrites(verify);
  try {
    await write();
    await new Promise((r) => setTimeout(r, 400));
    await Promise.all(recorder.writes.map((w) => w.settled));
    return recorder;
  } finally {
    recorder.restore();
  }
};

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
  /** A member of a running campaign, enrolled by the marketer. */
  const member = async (): Promise<Rec> => enroll(await campaignOf(), { crm_lead: (await people()).lead.id });

  it('back-fills has_responded and response_date when a rep flips the status by hand', async () => {
    // The `mark_responded` action stamps all three. This is the OTHER path —
    // the record detail page, where only `status` is written — and without the
    // hook the row reads "Responded" beside "Has Responded: false".
    const m = await member();
    await editMember(m.id, { status: 'responded' });
    const row = await stored('crm_campaign_member', m.id);
    expect(row.has_responded).toBe(true);
    expect(typeof row.response_date, 'a responded member needs a response date').toBe('string');
  });

  it('counts `converted` as responded — a member cannot convert without answering', async () => {
    const m = await member();
    await editMember(m.id, { status: 'converted' });
    expect((await stored('crm_campaign_member', m.id)).has_responded).toBe(true);
  });

  it('never moves an existing response date forward on a later edit', async () => {
    // Response-time reporting reads this column; re-stamping it on every touch
    // would quietly rewrite when the person answered.
    const m = await member();
    await editMember(m.id, { status: 'responded' });
    await systemUpdate(verify, 'crm_campaign_member', { id: m.id, response_date: '2026-01-01T00:00:00.000Z' });
    await editMember(m.id, { status: 'converted' });
    const row = await stored('crm_campaign_member', m.id);
    expect(new Date(String(row.response_date)).toISOString(), 'the original stamp survives').toBe('2026-01-01T00:00:00.000Z');
  });

  it('clears the summary when a member is reset out of a responded state', async () => {
    const m = await member();
    await editMember(m.id, { status: 'responded' });
    await editMember(m.id, { status: 'sent' });
    const row = await stored('crm_campaign_member', m.id);
    expect(row.has_responded).toBe(false);
    expect(row.response_date ?? null).toBeNull();
  });

  it('defaults has_responded on a fresh enrollment', async () => {
    const row = await stored('crm_campaign_member', (await member()).id);
    expect(row.has_responded).toBe(false);
    expect(row.response_date ?? null, 'nothing to stamp yet').toBeNull();
  });
});

// ─────────────────────────────────────────────────── the opt-out loop ──

describe('campaign_member_optout_sync', () => {
  /** Wait for `object`'s row to be opted out. */
  const optedOut = (object: string, id: string) =>
    vi.waitFor(async () => expect((await stored(object, id)).email_opt_out).toBe(true), { timeout: 10_000, interval: 50 });

  /**
   * The app already had one half of this loop: `campaign_enrollment` filters on
   * `email_opt_out: false` and `send_email` hides itself on an opted-out
   * contact. Nothing ever SET the flag, so honouring it was a promise about a
   * column no user action could reach — unsubscribing marked the junction row
   * and left the person enrollable by the very next campaign.
   */
  it('round-trips an unsubscribed LEAD member to email_opt_out', async () => {
    const { lead } = await people();
    const m = await enroll(await campaignOf(), { crm_lead: lead.id });
    await editMember(m.id, { status: 'unsubscribed' });
    await optedOut('crm_lead', lead.id);
  });

  /**
   * Campaign members are worked by marketing — the only non-admin persona this
   * app lets edit them — and a contact is a master-detail child of its
   * account, which a marketing user may not edit. The sync declares
   * `runAs: 'system'` (#2014): before it did, the contact write was refused as
   * the marketer ("requires edit access to its master record"), `onError:
   * 'log'` swallowed it, and the contact stayed enrollable by the next
   * campaign. An unsubscribe reaches the person whoever recorded it.
   */
  it('round-trips a marketing user’s unsubscribed CONTACT member too', async () => {
    const { contact } = await people();
    const m = await enroll(await campaignOf(), { crm_contact: contact.id });
    await editMember(m.id, { status: 'unsubscribed' });
    expect((await stored('crm_campaign_member', m.id)).status).toBe('unsubscribed');
    await optedOut('crm_contact', contact.id);
    expect((await stored('crm_contact', contact.id)).updated_by, 'the opt-out was recorded as nobody’s write').toBe(marketer.id);
  });

  it('syncs on insert, not only on update — an import can land already unsubscribed', async () => {
    const { lead } = await people();
    await verify.seed('crm_campaign_member', [{ crm_campaign: (await campaignOf()).id, crm_lead: lead.id, status: 'unsubscribed' }]);
    await optedOut('crm_lead', lead.id);
  });

  it('leaves every other status alone', async () => {
    const { lead } = await people();
    const m = await enroll(await campaignOf(), { crm_lead: lead.id });
    const engine = await engineWritesDuring(async () => {
      for (const status of ['responded', 'converted', 'sent']) await editMember(m.id, { status });
    });
    expect(engine.of('crm_lead', 'update'), 'only an unsubscribe writes').toHaveLength(0);
    expect((await stored('crm_lead', lead.id)).email_opt_out).toBe(false);
  });

  it('does not re-sync a member that was already unsubscribed', async () => {
    const { lead } = await people();
    const m = await enroll(await campaignOf(), { crm_lead: lead.id });
    await editMember(m.id, { status: 'unsubscribed' });
    await optedOut('crm_lead', lead.id);
    const engine = await engineWritesDuring(() => editMember(m.id, { status: 'unsubscribed' }));
    expect(engine.of('crm_lead', 'update')).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────── live metrics ──

describe('campaign_member_metrics_refresh — LIVE, not at completion', () => {
  /** A campaign mid-flight, with a lead member and a contact member already enrolled. */
  const live = async () => {
    const campaign = await campaignOf();
    const { lead, contact } = await people();
    const m1 = await enroll(campaign, { crm_lead: lead.id });
    const m2 = await enroll(campaign, { crm_contact: contact.id });
    await settlesAt(campaign.id, { num_sent: 2 });
    return { campaign, m1, m2 };
  };
  const settlesAt = (campaignId: string, expected: Rec) =>
    vi.waitFor(async () => expect(await stored('crm_campaign', campaignId)).toMatchObject(expected), { timeout: 10_000, interval: 50 });

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
    const { campaign } = await live();
    await enroll(campaign, { crm_lead: (await people()).lead.id });
    await settlesAt(campaign.id, { num_sent: 3, num_leads: 2 });
    expect((await stored('crm_campaign', campaign.id)).status, 'the campaign must still be running for this to mean anything').toBe('in_progress');
  });

  it('marking one member responded moves num_responses immediately', async () => {
    const { campaign, m1 } = await live();
    await editMember(m1.id, { status: 'responded' });
    await settlesAt(campaign.id, { num_responses: 1 });
    const row = await stored('crm_campaign', campaign.id);
    expect(row.status).toBe('in_progress');
    // response_rate is a FORMULA over these two; a live num_sent of 2 with one
    // response is the 50% the ROI dashboard renders.
    expect(row.num_sent).toBe(2);
  });

  it('removing a member decrements it, again with no status transition', async () => {
    const { campaign, m2 } = await live();
    await verify.hooks.run('crm_campaign_member', 'delete', { id: m2.id }, { as: admin });
    await settlesAt(campaign.id, { num_sent: 1, status: 'in_progress' });
  });

  /**
   * The recompute does not depend on who fired it (#2014). A Private deal is
   * visible to its owner alone, so a recompute run AS a marketing user counted
   * only the public half of the campaign's won pipeline and wrote that over
   * the right numbers — measured: 2 won deals / 1,100 became 1 / 100 the moment
   * a marketer enrolled a member. The hook declares `runAs: 'system'`.
   */
  it('a marketer’s enrollment keeps every won deal the campaign earned, Private ones included', async () => {
    const campaign = await campaignOf();
    const [account] = await verify.seed('crm_account', [{ name: `Attributed Co ${++k}`, owner_id: marketer.id }]);
    const owner = await signUpPerson(verify, `owner${k}@campaign-member-lifecycle.test`, {
      name: 'Deal Owner', positions: ['sales_rep'], permissionSets: ['sales_rep'],
    });
    await verify.seed('crm_opportunity', [100, 1_000].map((amount) => ({
      name: `Attributed ${k}.${amount}`, amount, stage: 'closed_won', win_reason: 'better_price', close_date: daysFromNow(-1),
      crm_account: account!.id, crm_campaign: campaign.id, owner_id: owner.id, is_private: amount === 1_000,
    })));
    expect(
      (await verify.rows('crm_opportunity', { crm_campaign: campaign.id }, { as: marketer.token })).length,
      'the Private deal is visible to the marketer, so this case cannot tell the two readings apart',
    ).toBe(1);
    await enroll(campaign, { crm_lead: (await people()).lead.id });
    await settlesAt(campaign.id, { num_sent: 1, num_won_opportunities: 2, actual_revenue: 1_100 });
  }, 30_000);

  it('refreshes BOTH campaigns when a member is moved between them', async () => {
    const left = await campaignOf();
    const arrived = await campaignOf({ status: 'planning' });
    const m = await enroll(left, { crm_lead: (await people()).lead.id });
    await settlesAt(left.id, { num_sent: 1 });
    await verify.hooks.run('crm_campaign_member', 'update', { id: m.id, crm_campaign: arrived.id }, { as: admin });
    await settlesAt(arrived.id, { num_sent: 1 });
    await settlesAt(left.id, { num_sent: 0 });
  });

  /**
   * The other side of the recursion guard in `campaign.hook.ts`: this hook
   * writes `crm_campaign`, and the campaign-side refresh listens on
   * `crm_campaign`. It does not loop because the write carries no `status`.
   */
  it('writes only the metric block, so it cannot re-trigger the campaign refresh', async () => {
    const { campaign, m1 } = await live();
    const engine = await engineWritesDuring(async () => {
      await editMember(m1.id, { status: 'responded' });
      await settlesAt(campaign.id, { num_responses: 1 });
    });
    const writes = engine.of('crm_campaign', 'update').filter((w) => (w.args[1] as Rec).id === campaign.id);
    expect(writes).toHaveLength(1);
    expect(Object.keys(writes[0]!.args[1] as Rec)).not.toContain('status');
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
 * `refreshCampaignMetrics()` import; the lowering sweep failed it (today
 * `os lint --strict`'s `hook-body/not-lowerable`),
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
    ...(opportunityCampaignMetricsHooks as Rec[]),
    ...(leadCampaignMetricsHooks as Rec[]),
    ...(campaignMemberHooks as Rec[]),
  ].filter((h) => /recompute/.test(String(h.description)) || /refresh/.test(String(h.name)));

  /** The block between the `recompute` fences, comments stripped, whitespace flat. */
  const recomputeBlockOf = (hook: Rec): string | null => {
    const { source } = extractHookBody(hook.handler, `hook '${String(hook.name)}'`);
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
