/**
 * CRM Studio Plugin — Sales Cloud
 *
 * Provides Studio IDE extensions for the Sales Cloud package including
 * lead conversion tools, AI-powered insights, and sales performance reporting.
 */
import { defineStudioPlugin, StudioPluginManifestSchema } from '@objectstack/spec/studio';

const crmStudioConfig = {
  id: 'hotcrm.crm',
  name: 'hotcrm-crm-studio',
  version: '1.0.0',
  description: 'Studio extensions for Sales Cloud',
  activationEvents: [
    'onObject:account',
    'onObject:contact',
    'onObject:lead',
    'onObject:opportunity',
    'onObject:activity',
    'onObject:task',
    'onObject:note'
  ],
  contributes: {
    sidebarGroups: [
      {
        key: 'sales',
        label: 'Sales Cloud',
        order: 10,
        metadataTypes: ['object']
      }
    ],
    actions: [
      {
        id: 'convert_lead',
        label: 'Convert Lead',
        location: 'toolbar' as const
      },
      {
        id: 'ai_smart_briefing',
        label: 'AI Smart Briefing',
        location: 'toolbar' as const
      },
      {
        id: 'sales_performance_report',
        label: 'Sales Performance Report',
        location: 'commandPalette' as const
      }
    ],
    panels: [
      {
        id: 'ai_insights',
        label: 'AI Insights',
        location: 'right' as const
      },
      {
        id: 'lead_scoring_details',
        label: 'Lead Scoring Details',
        location: 'right' as const
      }
    ],
    commands: [
      { id: 'hotcrm.crm.convertLead', label: 'Convert Lead to Opportunity' },
      { id: 'hotcrm.crm.showAIInsights', label: 'Show AI Insights' },
      { id: 'hotcrm.crm.runSalesPerformance', label: 'Run Sales Performance Report' },
      { id: 'hotcrm.crm.showLeadScoring', label: 'Show Lead Scoring Details' }
    ]
  }
};

export const CrmStudioPlugin = defineStudioPlugin(crmStudioConfig);

export const CrmStudioManifest = StudioPluginManifestSchema.parse(crmStudioConfig);

export default CrmStudioPlugin;
