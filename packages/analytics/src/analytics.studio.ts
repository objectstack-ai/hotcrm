/**
 * Analytics Studio Plugin — Analytics Cloud
 *
 * Provides Studio IDE extensions for the Analytics Cloud package including
 * report building tools, AI-powered data exploration, and report scheduling.
 */
import { defineStudioPlugin, StudioPluginManifestSchema } from '@objectstack/spec/studio';

const analyticsStudioConfig = {
  id: 'hotcrm.analytics',
  name: 'hotcrm-analytics-studio',
  version: '1.0.0',
  description: 'Studio extensions for Analytics Cloud',
  activationEvents: [
    'onObject:report',
    'onObject:dashboard',
    'onObject:kpi'
  ],
  contributes: {
    sidebarGroups: [
      {
        key: 'analytics',
        label: 'Analytics Cloud',
        order: 60,
        metadataTypes: ['object']
      }
    ],
    actions: [
      {
        id: 'report_builder',
        label: 'Report Builder',
        location: 'toolbar' as const
      },
      {
        id: 'ai_data_explorer',
        label: 'AI Data Explorer',
        location: 'toolbar' as const
      },
      {
        id: 'schedule_report',
        label: 'Schedule Report',
        location: 'commandPalette' as const
      }
    ],
    panels: [
      {
        id: 'data_explorer',
        label: 'Data Explorer',
        location: 'right' as const
      },
      {
        id: 'report_preview',
        label: 'Report Preview',
        location: 'right' as const
      }
    ],
    commands: [
      { id: 'hotcrm.analytics.buildReport', label: 'Build Report' },
      { id: 'hotcrm.analytics.exploreData', label: 'Explore Data' },
      { id: 'hotcrm.analytics.scheduleReport', label: 'Schedule Report' }
    ]
  }
};

export const AnalyticsStudioPlugin = defineStudioPlugin(analyticsStudioConfig);

export const AnalyticsStudioManifest = StudioPluginManifestSchema.parse(analyticsStudioConfig);

export default AnalyticsStudioPlugin;
