import campaign from './campaign.object';

export const MarketingPlugin = {
  name: 'marketing',
  label: 'Marketing Cloud',
  version: '1.0.0',
  description: 'Marketing automation and campaign management.',
  dependencies: ['crm'],
  objects: {
    campaign
  }
};
export default MarketingPlugin;
