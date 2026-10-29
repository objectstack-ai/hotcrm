// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { templateEngine } from '@objectstack/formula';
import { CampaignEnrollmentFlow } from '../src/marketing/flows/campaign-enrollment.flow';
import { CreateCampaignAction } from '../src/sales/actions/lead.actions';
import { AddContactToCampaignAction } from '../src/sales/actions/contact.actions';
import { localePacks } from './helpers/composed-stack';

type Rec = Record<string, any>;

/**
 * The enrollment results name their counts in every locale (#2371 row 1).
 *
 * Enroll Members ends on a result screen naming three counts (added, already
 * members, skipped), and its refusal names those three and the refused; Add to
 * Campaign's toast names the campaign and two counts (added, already a member).
 * The runtime cases are in `test/campaign-enrollment-doors.test.ts` and
 * `test/campaign-enrollment-gates.test.ts`. This file holds every locale to the
 * same counts, through the platform's own renderer: a pack that dropped a
 * count would win over the source and hide it again.
 */

const render = (source: string, vars: Rec): string => {
  const r = templateEngine.evaluate({ dialect: 'template', source }, { extra: vars } as Rec);
  if (!r.ok) throw new Error(`does not render: ${r.error.message}`);
  return String(r.value);
};

const nonEnglish = localePacks.filter(([locale]) => locale !== 'en');
const COUNTS = { enrolledCount: 7, alreadyCount: 5, skippedCount: 3, refusedCount: 2 };

describe('Enroll Members names its counts in every locale (#2371 row 1)', () => {
  const result = CampaignEnrollmentFlow.nodes.find((n) => n.id === 'result') as Rec;
  const refused = CampaignEnrollmentFlow.nodes.find((n) => n.id === 'end_refused') as Rec;
  const screens: Array<[string, string]> = [
    ['en (authored)', String(result.config.description)],
    ...nonEnglish.map(([l, p]) => [l, String(p.flows?.campaign_enrollment?.screens?.result?.description ?? '')] as [string, string]),
  ];
  const refusals: Array<[string, string]> = [
    ['en (authored)', String(refused.config.message)],
    ...nonEnglish.map(([l, p]) => [l, String(p.flows?.campaign_enrollment?.refusals?.end_refused?.message ?? '')] as [string, string]),
  ];

  it.each(screens)('%s: the result screen says added, already members and skipped', (_l, source) => {
    const text = render(source, COUNTS);
    for (const n of [7, 5, 3]) expect(text, source).toContain(String(n));
  });

  it.each(refusals)('%s: the refusal says added, already members, skipped and refused', (_l, source) => {
    const text = render(source, COUNTS);
    for (const n of [7, 5, 3, 2]) expect(text, source).toContain(String(n));
  });

  it.each(nonEnglish)('%s: the result screen has a title and a link label', (_l, pack) => {
    const screen = pack.flows?.campaign_enrollment?.screens?.result;
    expect(String(screen?.title ?? '').length).toBeGreaterThan(0);
    expect(String(screen?.fields?.campaignLink?.label ?? '').length).toBeGreaterThan(0);
  });
});

describe('Add to Campaign names the campaign and its counts in every locale (#2371 row 1)', () => {
  const sources: Array<[string, string]> = [
    ['lead, authored', String(CreateCampaignAction.successMessage)],
    ['contact, authored', String(AddContactToCampaignAction.successMessage)],
    ...localePacks.flatMap(([l, p]) => [
      [`${l} lead`, String(p.o?.crm_lead?._actions?.create_campaign?.successMessage ?? p.objects?.crm_lead?._actions?.create_campaign?.successMessage ?? '')],
      [`${l} contact`, String(p.o?.crm_contact?._actions?.add_contact_to_campaign?.successMessage ?? p.objects?.crm_contact?._actions?.add_contact_to_campaign?.successMessage ?? '')],
    ] as Array<[string, string]>),
  ];

  it.each(sources)('%s', (_l, source) => {
    const text = render(source, { result: { output: { campaignName: 'Spring Launch', addedCount: 0, alreadyCount: 1 } } });
    expect(text, source).toContain('Spring Launch');
    expect(text, source).toMatch(/0[^0-9]/);
    expect(text, source).toMatch(/1[^0-9]/);
    expect(source, 'still says the people were added whatever happened').not.toMatch(/added to campaign!|加入营销活动！/);
  });
});
