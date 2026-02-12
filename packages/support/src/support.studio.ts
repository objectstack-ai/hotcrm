/**
 * Support Studio Plugin — Service Cloud
 *
 * Provides Studio IDE extensions for the Service Cloud package including
 * case escalation, knowledge management, SLA monitoring, and case timelines.
 */
import { defineStudioPlugin, StudioPluginManifestSchema } from '@objectstack/spec/studio';

const supportStudioConfig = {
  id: 'hotcrm.support',
  name: 'hotcrm-support-studio',
  version: '1.0.0',
  description: 'Studio extensions for Service Cloud',
  activationEvents: [
    'onObject:case',
    'onObject:case_comment',
    'onObject:knowledge_article',
    'onObject:sla_policy',
    'onObject:queue',
    'onObject:routing_rule'
  ],
  contributes: {
    sidebarGroups: [
      {
        key: 'support',
        label: 'Service Cloud',
        order: 60,
        metadataTypes: ['object']
      }
    ],
    actions: [
      {
        id: 'escalate_case',
        label: 'Escalate Case',
        location: 'toolbar' as const
      },
      {
        id: 'knowledge_search',
        label: 'Knowledge Search',
        location: 'commandPalette' as const
      }
    ],
    panels: [
      {
        id: 'case_timeline',
        label: 'Case Timeline',
        location: 'right' as const
      },
      {
        id: 'sla_status',
        label: 'SLA Status',
        location: 'right' as const
      },
      {
        id: 'knowledge_suggestions',
        label: 'Knowledge Suggestions',
        location: 'right' as const
      }
    ],
    commands: [
      { id: 'hotcrm.support.escalateCase', label: 'Escalate Support Case' },
      { id: 'hotcrm.support.searchKnowledge', label: 'Search Knowledge Base' },
      { id: 'hotcrm.support.showCaseTimeline', label: 'Show Case Timeline' },
      { id: 'hotcrm.support.showSLAStatus', label: 'Show SLA Status' },
      { id: 'hotcrm.support.showKnowledgeSuggestions', label: 'Show Knowledge Suggestions' }
    ]
  }
};

export const SupportStudioPlugin = defineStudioPlugin(supportStudioConfig);

export const SupportStudioManifest = StudioPluginManifestSchema.parse(supportStudioConfig);

export default SupportStudioPlugin;
