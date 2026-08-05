// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';

/**
 * Deleting an enrolled person must work (#696).
 *
 * ### The bug this file exists to keep dead
 *
 * `crm_campaign_member` carries a record-level rule, `lead_or_contact_required`,
 * that rejects a member row naming neither a Lead nor a Contact. Both party
 * lookups used to take `Field.lookup`'s SPEC DEFAULT for `deleteBehavior`,
 * which is `set_null` — measured on 17.0.0-rc.2, the resolved field literally
 * reads `"deleteBehavior":"set_null"` even though the source declared nothing.
 *
 * So the engine's own referential pass turned the delete into a self-defeating
 * sequence: `cascadeDeleteRelations` cleared `crm_campaign_member.crm_lead`,
 * the row it had just edited instantly broke the rule the same object declares,
 * and the whole delete rolled back. Measured before the fix, on this exact
 * harness:
 *
 *     DELETE lead error: A campaign member must reference either a Lead or a Contact
 *     members after:     [ …the member row, untouched… ]
 *     lead after:        [ …the lead, still there… ]
 *
 * Over REST that surfaces as a 400 naming a DIFFERENT object than the one the
 * caller addressed (`"object":"crm_lead"`, message about campaign members), and
 * it makes anyone who was ever enrolled in a campaign permanently undeletable
 * through the API and the UI — a GDPR "delete this person" request could not be
 * served at all. Since `enroll_leads` / `campaign_enrollment` are ordinary parts
 * of the marketing flow, ordinary use reaches it.
 *
 * ### The fix, and why cascade rather than restrict
 *
 * `deleteBehavior: 'cascade'` on both party lookups. A campaign member is a
 * JUNCTION row whose whole meaning is "this person is enrolled in this
 * campaign"; once the person is gone the row denotes nothing. `restrict` would
 * have produced an accurate message — the platform's own
 * "N dependent crm_campaign_member record(s) reference it via crm_lead" — but
 * the person would still be undeletable until someone un-enrolled them by hand,
 * and the impact being fixed here is undeletable PEOPLE, not confusing text.
 *
 * Cascade also removes the state that made this possible: with it, no stored
 * member row can be manoeuvred into breaking its object's own rule. Declared is
 * enforced, with nothing for a consumer to be lenient about.
 *
 * ### Scope
 *
 * This is the campaign-member half only. `crm_event_attendee` has the same
 * construction (`attendee_resolves`, severity `error`, over `set_null` party
 * lookups) and the same defect — measured, and filed separately; do not fix it
 * by editing this file's object.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const byName = (n: string) => objects.find((o) => o.name === n) as AnyRec;

const CAMPAIGN_MEMBER = byName('crm_campaign_member');

// ───────────────────────────────────────────────── the declaration ──

describe('crm_campaign_member declares cascade on both party lookups', () => {
  /**
   * A structural pin, deliberately kept next to the end-to-end run below: the
   * hazard is a MISSING key, and a missing key is invisible in review because
   * the spec quietly fills in `set_null`. Asserting the resolved value catches
   * both a deletion of the declaration and a future spec default flip.
   */
  it.each(['crm_lead', 'crm_contact'])('%s cascades', (field) => {
    expect(CAMPAIGN_MEMBER.fields[field].type).toBe('lookup');
    expect(CAMPAIGN_MEMBER.fields[field].deleteBehavior).toBe('cascade');
  });

  it('still declares the rule that the cascade keeps satisfiable', () => {
    const rule = (CAMPAIGN_MEMBER.validations ?? []).find(
      (v: AnyRec) => v.name === 'lead_or_contact_required',
    );
    expect(rule).toBeDefined();
    expect(rule.severity).toBe('error');
  });

  /**
   * The CAMPAIGN side is deliberately NOT cascade, and is not changed by #696.
   * `crm_campaign` is a REQUIRED lookup, and the engine escalates a `set_null`
   * default on a required lookup to `restrict` — a campaign with members
   * refuses to delete, with a message that names the real obstacle. That is the
   * correct answer there (a campaign's member list is its historical record,
   * not a per-person artefact), and it is pinned so a copy-paste of the two
   * lines above cannot silently start shredding campaign history.
   */
  it('leaves the required campaign lookup on the default', () => {
    expect(CAMPAIGN_MEMBER.fields.crm_campaign.required).toBe(true);
    expect(CAMPAIGN_MEMBER.fields.crm_campaign.deleteBehavior).toBe('set_null');
  });
});

// ─────────────────────────────────────────── on the real engine ──

/**
 * End-to-end over a real ObjectQL — the only place the interaction is visible.
 * `cascadeDeleteRelations` is engine behaviour driven by metadata; no
 * metadata-only assertion can show that a delete now succeeds, and no hook
 * harness runs the referential pass at all.
 *
 * `InMemoryDriver` is used for the same reason `object-validation-predicates`
 * uses it: it stores only the columns a row was written with, so the merged
 * record handed to the validator has ABSENT keys — the shape that made the rule
 * fire in the first place. A column-complete driver would still reproduce this
 * bug (the cleared column is `null`, not absent, and `isBlank(null)` is true),
 * but the sparse one exercises the harder shape.
 */
describe('deleting an enrolled person', () => {
  let ql: AnyRec;
  let api: AnyRec;

  beforeEach(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_campaign_member: CAMPAIGN_MEMBER,
        crm_campaign: byName('crm_campaign'),
        crm_lead: byName('crm_lead'),
        crm_contact: byName('crm_contact'),
        crm_account: byName('crm_account'),
      } as never,
    })) as never;
    api = ql.createContext({ isSystem: true });
  });
  afterEach(async () => {
    await ql?.close();
  });

  const newCampaign = (name = 'Spring Webinar') =>
    api.object('crm_campaign').insert({
      name,
      type: 'webinar',
      status: 'in_progress',
      start_date: '2026-01-01',
      end_date: '2026-03-01',
    });

  const newLead = (email = 'wei.zhang@acme.test') =>
    api.object('crm_lead').insert({
      first_name: 'Wei',
      last_name: 'Zhang',
      company: 'ACME',
      status: 'new',
      lead_source: 'web',
      email,
    });

  const newContact = async (email = 'li.wang@acme.test') => {
    const account = await api.object('crm_account').insert({
      name: `ACME ${email}`,
      type: 'customer',
      industry: 'technology',
    });
    return api.object('crm_contact').insert({
      first_name: 'Li',
      last_name: 'Wang',
      crm_account: account.id,
      email,
    });
  };

  const members = () => api.object('crm_campaign_member').find({ where: {} });

  it('deletes a lead enrolled in several campaigns, and takes its memberships with it', async () => {
    const [spring, autumn] = await Promise.all([newCampaign('Spring'), newCampaign('Autumn')]);
    const lead = await newLead();
    for (const campaign of [spring, autumn]) {
      await api.object('crm_campaign_member').insert({
        crm_campaign: campaign.id,
        crm_lead: lead.id,
        status: 'sent',
      });
    }
    expect(await members()).toHaveLength(2);

    // The assertion that WAS the bug: this used to reject with
    // "A campaign member must reference either a Lead or a Contact".
    await expect(
      api.object('crm_lead').delete({ where: { id: lead.id } }),
    ).resolves.not.toThrow();

    expect(await api.object('crm_lead').find({ where: { id: lead.id } })).toHaveLength(0);
    expect(await members()).toHaveLength(0);
  });

  it('deletes an enrolled contact the same way', async () => {
    const campaign = await newCampaign();
    const contact = await newContact();
    await api.object('crm_campaign_member').insert({
      crm_campaign: campaign.id,
      crm_contact: contact.id,
      status: 'opened',
    });

    await expect(
      api.object('crm_contact').delete({ where: { id: contact.id } }),
    ).resolves.not.toThrow();

    expect(await api.object('crm_contact').find({ where: { id: contact.id } })).toHaveLength(0);
    expect(await members()).toHaveLength(0);
  });

  it('leaves every membership that named somebody else alone', async () => {
    const campaign = await newCampaign();
    const lead = await newLead();
    const bystanderLead = await newLead('bystander@acme.test');
    const contact = await newContact();

    await api.object('crm_campaign_member').insert({
      crm_campaign: campaign.id, crm_lead: lead.id, status: 'sent',
    });
    // The two rows that must SURVIVE: one naming the other party TYPE, one
    // naming a different record of the same type. A cascade that keyed off the
    // object rather than the id would take both.
    const keepContact = await api.object('crm_campaign_member').insert({
      crm_campaign: campaign.id, crm_contact: contact.id, status: 'clicked',
    });
    const keepLead = await api.object('crm_campaign_member').insert({
      crm_campaign: campaign.id, crm_lead: bystanderLead.id, status: 'sent',
    });

    await api.object('crm_lead').delete({ where: { id: lead.id } });

    const remaining = (await members()).map((r: AnyRec) => r.id).sort();
    expect(remaining).toEqual([keepContact.id, keepLead.id].sort());
  });

  it('still refuses a member row that names nobody — the rule is intact, not neutered', async () => {
    const campaign = await newCampaign();
    await expect(
      api.object('crm_campaign_member').insert({ crm_campaign: campaign.id, status: 'sent' }),
    ).rejects.toThrow(/must reference either a Lead or a Contact/i);
  });

  /**
   * The one semantic cost of cascading on BOTH lookups, measured and written
   * down rather than left for the next reader to trip over: a row naming a lead
   * AND a contact is removed when EITHER party is deleted, even though the
   * other party still exists.
   *
   * It is accepted because no such row is reachable today — the enrollment flow
   * and `enroll_leads` write `crm_lead` only, `lead_conversion` never touches
   * this object, and `content/docs/marketing/campaign-members.mdx` states the
   * intended semantics as "either a lead or a contact — but not both". If a
   * future change (e.g. #597) starts writing both, this test is the place that
   * says what has to be decided again.
   */
  it('removes a both-parties row on either delete (documented consequence)', async () => {
    const campaign = await newCampaign();
    const lead = await newLead();
    const contact = await newContact();
    await api.object('crm_campaign_member').insert({
      crm_campaign: campaign.id,
      crm_lead: lead.id,
      crm_contact: contact.id,
      status: 'sent',
    });

    await api.object('crm_lead').delete({ where: { id: lead.id } });

    expect(await members()).toHaveLength(0);
    expect(await api.object('crm_contact').find({ where: { id: contact.id } })).toHaveLength(1);
  });
});
