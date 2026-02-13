import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Contact Detail Page Layout
 */
export const ContactPage = {
  name: 'contact_detail',
  object: 'contact',
  type: 'record' as const,
  label: 'Contact Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['sales_rep', 'sales_manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['first_name', 'last_name', 'title', 'email', 'phone']
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
            tabs: ['contact_info', 'communication_info']
          }
        }
      ]
    },
    {
      name: 'contact_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Contact Information',
          properties: {
            fields: [
              'first_name', 'last_name', 'salutation', 'account_id',
              'title', 'department', 'level', 'is_decision_maker',
              'influence_level', 'relationship_strength'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'communication_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Communication Information',
          properties: {
            fields: [
              'email', 'phone', 'mobile_phone', 'fax',
              'preferred_contact', 'last_contact_date'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'related_lists',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Opportunities',
          properties: {
            object: 'opportunity',
            columns: ['name', 'stage', 'amount', 'close_date', 'probability'],
            filters: [['stage', '!=', 'closed_lost']],
            sort: [{ field: 'close_date', direction: 'asc' }],
            actions: ['new', 'edit', 'delete']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Activities',
          properties: {
            object: 'activity',
            columns: ['subject', 'type', 'status', 'due_date', 'owner_id'],
            sort: [{ field: 'due_date', direction: 'asc' }],
            actions: ['new', 'edit', 'delete']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Cases',
          properties: {
            object: 'case',
            columns: ['case_number', 'subject', 'status', 'priority', 'created_date'],
            filters: [['status', '!=', 'closed']],
            sort: [{ field: 'created_date', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ContactPage);

export default ContactPage;
