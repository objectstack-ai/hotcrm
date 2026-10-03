// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Marketing flow barrel — the flows whose start node names `crm_campaign` or
 * `crm_campaign_member`. See `src/sales/flows/index.ts` for why the
 * registration order is assembled in `objectstack.config.ts` rather than here.
 */
export { CampaignEnrollmentFlow } from './campaign-enrollment.flow';
export {
  CampaignLeadMemberEnrollFlow,
  CampaignContactMemberEnrollFlow,
} from './campaign-member-enroll.flow';
export { CampaignCompletionFlow } from './campaign-completion.flow';
