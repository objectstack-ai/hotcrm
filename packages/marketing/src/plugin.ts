import Campaign from './campaign.object';
import CampaignMember from './campaign_member.object';

import { CampaignROIHook } from './hooks/roi.hook';

export const MarketingPlugin = {
  name: 'marketing',
  label: 'Marketing Cloud',
  version: '1.0.0',
  description: 'Marketing automation and campaign management.',
  dependencies: ['crm'],
  objects: {
    campaign: Campaign,
    campaign_member: CampaignMember
  },
  triggers: {
    campaign_roi: CampaignROIHook
  },
  navigation: [
    {
      type: 'group',
      label: 'Marketing',
      children: [
        { type: 'object', object: 'campaign' },
        { type: 'object', object: 'campaign_member' }
      ]
    }
  ]
};
export default MarketingPlugin;
