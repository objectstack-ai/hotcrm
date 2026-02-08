import { Campaign } from './campaign.object';
import { CampaignMember } from './campaign_member.object';
import { EmailTemplate } from './email_template.object';
import { LandingPage } from './landing_page.object';
import { Form } from './form.object';
import { MarketingList } from './marketing_list.object';
import { Unsubscribe } from './unsubscribe.object';

import { CampaignROIHook } from './hooks/roi.hook';

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
  triggers: {
    campaign_roi: CampaignROIHook
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
