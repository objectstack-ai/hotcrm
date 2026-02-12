/**
 * Marketing Studio Plugin — Marketing Cloud
 *
 * Provides Studio IDE extensions for the Marketing Cloud package including
 * campaign management, AI content generation, and marketing ROI analytics.
 */
import { defineStudioPlugin, StudioPluginManifestSchema } from '@objectstack/spec/studio';

const marketingStudioConfig = {
  id: 'hotcrm.marketing',
  name: 'hotcrm-marketing-studio',
  version: '1.0.0',
  description: 'Studio extensions for Marketing Cloud',
  activationEvents: [
    'onObject:campaign',
    'onObject:campaign_member',
    'onObject:email_template',
    'onObject:form',
    'onObject:landing_page',
    'onObject:marketing_list'
  ],
  contributes: {
    sidebarGroups: [
      {
        key: 'marketing',
        label: 'Marketing Cloud',
        order: 40,
        metadataTypes: ['object']
      }
    ],
    actions: [
      {
        id: 'launch_campaign',
        label: 'Launch Campaign',
        location: 'toolbar' as const
      },
      {
        id: 'content_generator',
        label: 'Content Generator',
        location: 'commandPalette' as const
      }
    ],
    panels: [
      {
        id: 'campaign_performance',
        label: 'Campaign Performance',
        location: 'right' as const
      },
      {
        id: 'roi_metrics',
        label: 'ROI Metrics',
        location: 'right' as const
      }
    ],
    commands: [
      { id: 'hotcrm.marketing.launchCampaign', label: 'Launch Marketing Campaign' },
      { id: 'hotcrm.marketing.generateContent', label: 'Generate Marketing Content' },
      { id: 'hotcrm.marketing.showCampaignPerformance', label: 'Show Campaign Performance' },
      { id: 'hotcrm.marketing.showROIMetrics', label: 'Show ROI Metrics Dashboard' }
    ]
  }
};

export const MarketingStudioPlugin = defineStudioPlugin(marketingStudioConfig);

export const MarketingStudioManifest = StudioPluginManifestSchema.parse(marketingStudioConfig);

export default MarketingStudioPlugin;
