// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition, type ObjectStackDefinitionInput } from '@objectstack/spec';

import { EnrollLeadsAction, MarkRespondedAction } from './actions/index.js';
import {
  CampaignEnrollmentFlow, CampaignCompletionFlow, CampaignLeadMemberEnrollFlow, CampaignContactMemberEnrollFlow,
} from './flows/index.js';
import { Campaign, CampaignMember } from './objects/index.js';
import { campaignHook, campaignMemberHook } from './objects/hooks.js';
import { CampaignLeadershipSharingRules } from './sharing/index.js';
import { CampaignViews } from './views/index.js';

/**
 * The collections of this package that the artifact-wide sweeps also read —
 * see `serviceHooks` in `src/service/index.ts` for the arrangement.
 *
 * The two campaign-METRICS hooks are not here: they attach to `crm_lead` and
 * `crm_opportunity`, so they live in sales beside those objects (ADR-0130 R4,
 * plan decision 1 of 2026-09-02).
 */
export const marketingHooks = [campaignHook, campaignMemberHook].flat();

/**
 * This package's flows — see {@link marketingHooks}.
 *
 * The two member-enroll flows (`campaign_lead_member_enroll`,
 * `campaign_contact_member_enroll`) are launched by app-package actions
 * (`create_campaign` on `crm_lead`, `add_contact_to_campaign` on
 * `crm_contact`); the app stack resolves those targets through
 * `artifactFlows` (see `src/sales/index.ts`).
 */
export const marketingFlows = [
  CampaignEnrollmentFlow, CampaignCompletionFlow, CampaignLeadMemberEnrollFlow, CampaignContactMemberEnrollFlow,
];

/** This package's sharing rules — see {@link marketingHooks}. */
export const marketingSharingRules = [...CampaignLeadershipSharingRules];

/** What this package registers but does not assemble: its seed rows (#1361). */
export type HotCrmMarketingCollections = Pick<ObjectStackDefinitionInput, 'data'>;

/**
 * `app.objectstack.hotcrm.marketing` — the MARKETING module of this artifact
 * (ADR-0130 D4, `module-split-plan.md` decision 5).
 *
 * It owns `crm_campaign` and `crm_campaign_member`, and every item authored
 * against them: their hooks and views, the enrollment, completion and two
 * member-enroll flows (see {@link marketingFlows}), the two campaign actions,
 * the campaign-leadership sharing rules and the campaign seed rows.
 *
 * Packaged exactly as `src/service/index.ts` is; that file carries the
 * reasoning for `namespace`, `dependencies`, the absent `i18n` and a `requires`
 * of this package's own. The lead record page's campaign-history list and the
 * `crm_opportunity.crm_campaign` lookup stay with the sales objects they are
 * authored on.
 */
export const createHotCrmMarketingStack = (
  collections: HotCrmMarketingCollections,
): ObjectStackDefinition => defineStack({
  manifest: {
    id: 'app.objectstack.hotcrm.marketing',
    name: 'HotCRM Marketing',
    // The app package's namespace, deliberately (ADR-0130 D1).
    namespace: 'crm',
    // The ARTIFACT's version (ADR-0130 D6) — `test/docs-declared-versions.test.ts`
    // holds it, and the range below, to the app package's.
    version: '6.0.0',
    type: 'module',
    description: 'HotCRM marketing module — campaigns and campaign members.',
    engines: { protocol: '^18.2.0' },
    // The App package this module extends, and nothing else (the star).
    dependencies: { 'app.objectstack.hotcrm': '^6.0.0' },

    /**
     * The one entry this module puts into the app's Marketing group, which the
     * app keeps with no children of its own — as it keeps `group_service` — so
     * the sidebar reads exactly as before. Rule R3; see `src/service/index.ts`.
     */
    navigationContributions: [
      {
        app: 'crm_enterprise',
        group: 'group_marketing',
        priority: 50,
        items: [
          { id: 'nav_campaign', type: 'object', objectName: 'crm_campaign', label: 'Campaigns', icon: 'megaphone' },
        ],
      },
    ],
  },

  // What THIS package's metadata needs: `automation` and `triggers` for the
  // scheduled campaign-completion flow (each refused by name when deleted),
  // `sharing` for the leadership rules — not refused when deleted, any more
  // than the service package's is, and declared for the same reason.
  requires: ['automation', 'triggers', 'sharing'],

  objects: [Campaign, CampaignMember],
  hooks: marketingHooks,
  views: [CampaignViews],
  flows: marketingFlows,
  actions: [EnrollLeadsAction, MarkRespondedAction],
  sharingRules: marketingSharingRules,

  ...collections,
});
