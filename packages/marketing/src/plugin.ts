import Campaign from './campaign.object';
import CampaignMember from './campaign_member.object';

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
