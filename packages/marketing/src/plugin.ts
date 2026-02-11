import { Campaign } from './campaign.object';
import { CampaignMember } from './campaign_member.object';
import { EmailTemplate } from './email_template.object';
import { LandingPage } from './landing_page.object';
import { Form } from './form.object';
import { MarketingList } from './marketing_list.object';
import { Unsubscribe } from './unsubscribe.object';

import { CampaignROIHook } from './hooks/roi.hook';
import { CampaignROICalculationTrigger, CampaignBudgetTrackingTrigger, CampaignStatusChangeTrigger, CampaignDateValidationTrigger } from './hooks/campaign.hook';
import { CampaignMemberEngagementTrigger, CampaignMemberLeadScoringTrigger, CampaignMemberStatsTrigger, CampaignMemberBounceHandlerTrigger } from './hooks/campaign_member.hook';

// Import actions
import CampaignAIAction from './actions/campaign_ai.action';
import ContentGeneratorAction from './actions/content_generator.action';
import MarketingAnalyticsAction from './actions/marketing_analytics.action';

export const MarketingPlugin: any = {
  name: 'marketing',
  label: 'Marketing Cloud',
  version: '1.0.0',
  description: 'Marketing automation, campaign management, email templates, landing pages, and list management.',
  dependencies: ['crm'],
  
  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },
  
  objects: {
    campaign: Campaign,
    campaign_member: CampaignMember,
    email_template: EmailTemplate,
    landing_page: LandingPage,
    form: Form,
    marketing_list: MarketingList,
    unsubscribe: Unsubscribe,
  },
  actions: {
    campaign_ai: CampaignAIAction,
    content_generator: ContentGeneratorAction,
    marketing_analytics: MarketingAnalyticsAction,
  },
  triggers: {
    campaign_roi: CampaignROIHook,
    campaign_roi_calculation: CampaignROICalculationTrigger,
    campaign_budget_tracking: CampaignBudgetTrackingTrigger,
    campaign_status_change: CampaignStatusChangeTrigger,
    campaign_date_validation: CampaignDateValidationTrigger,
    campaign_member_engagement: CampaignMemberEngagementTrigger,
    campaign_member_lead_scoring: CampaignMemberLeadScoringTrigger,
    campaign_member_stats: CampaignMemberStatsTrigger,
    campaign_member_bounce_handler: CampaignMemberBounceHandlerTrigger,
  },
  navigation: [
    {
      type: 'group',
      label: 'Campaigns',
      children: [
        { type: 'object', object: 'campaign' },
        { type: 'object', object: 'campaign_member' }
      ]
    },
    {
      type: 'group',
      label: 'Marketing Automation',
      children: [
        { type: 'object', object: 'email_template' },
        { type: 'object', object: 'landing_page' },
        { type: 'object', object: 'form' },
        { type: 'object', object: 'marketing_list' },
        { type: 'object', object: 'unsubscribe' },
      ]
    }
  ]
};
export default MarketingPlugin;
