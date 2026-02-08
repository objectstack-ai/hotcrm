/**
 * @hotcrm/marketing - Marketing Module
 * 
 * This package contains all marketing-related business objects:
 * - Campaign: Marketing campaign management
 * - CampaignMember: Links leads/contacts to campaigns
 */

export { Campaign } from './campaign.object';
export { CampaignMember } from './campaign_member.object';

// Export Hooks
export { default as CampaignROIHook } from './hooks/roi.hook';

// Export plugin definition
export { default as MarketingPlugin } from './plugin';

