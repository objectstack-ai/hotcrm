import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Case Detail Page Layout
 * Leverages PageSchema features: isDefault, assignedProfiles, visibility, ai:chat_window, record:activity.
 */
export const CasePage = {
  name: 'case_detail',
  object: 'case',
  type: 'record' as const,
  label: 'Case Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['support_agent', 'support_manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['case_number', 'subject', 'status', 'priority', 'severity']
          }
        }
      ]
    },
    {
      name: 'tabs',
      components: [
        {
          type: 'page:tabs' as const,
          properties: {
            tabs: ['case_info', 'sla_info', 'resolution_info']
          }
        }
      ]
    },
    {
      name: 'case_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Case Information',
          properties: {
            fields: [
              'case_number', 'subject', 'status', 'priority',
              'severity', 'type', 'origin', 'account_id',
              'contact_id', 'owner_id', 'description'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'sla_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'SLA Information',
          properties: {
            fields: [
              'sla_level', 'response_due_date', 'resolution_due_date',
              'is_sla_violated', 'is_escalated', 'escalated_date'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'resolution_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Resolution Information',
          visibility: "record.status == 'Resolved' || record.status == 'Closed'",
          properties: {
            fields: [
              'resolution', 'root_cause', 'customer_satisfaction', 'tags'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'activity',
      components: [
        {
          type: 'record:activity' as const,
          label: 'Case Activity',
          properties: {}
        }
      ]
    },
    {
      name: 'related_lists',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Case Comments',
          properties: {
            object: 'case_comment',
            columns: ['body', 'created_by', 'created_date'],
            sort: [{ field: 'created_date', direction: 'desc' }],
            actions: ['new', 'edit', 'delete']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Knowledge Articles',
          properties: {
            object: 'knowledge_article',
            columns: ['article_number', 'title', 'category', 'status', 'helpful_rating'],
            actions: ['new', 'edit']
          }
        }
      ]
    },
    {
      name: 'ai_assistant',
      components: [
        {
          type: 'ai:chat_window' as const,
          label: 'Resolution Assistant',
          properties: {
            mode: 'sidebar'
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(CasePage);

export default CasePage;
