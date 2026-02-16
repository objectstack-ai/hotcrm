import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Advisory Meeting Page Layout
 * Record page with meeting details, notes, and action items.
 */
export const AdvisoryPage = {
  name: 'advisory_detail',
  object: 'advisory',
  type: 'record' as const,
  label: 'Advisory Meeting Detail',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['wealth_advisor', 'portfolio_manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['wealth_account', 'meeting_date', 'meeting_type', 'advisor_id', 'status']
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
            tabs: ['meeting_details', 'notes', 'action_items']
          }
        }
      ]
    },
    {
      name: 'meeting_details',
      components: [
        {
          type: 'record:details' as const,
          label: 'Meeting Information',
          properties: {
            fields: [
              'wealth_account', 'meeting_date', 'meeting_type', 'duration',
              'advisor_id', 'location', 'status', 'attendees'
            ],
            columns: 2
          }
        },
        {
          type: 'record:details' as const,
          label: 'Agenda',
          properties: {
            fields: ['agenda', 'objectives'],
            columns: 1
          }
        }
      ]
    },
    {
      name: 'notes',
      components: [
        {
          type: 'record:details' as const,
          label: 'Meeting Notes',
          properties: {
            fields: ['summary', 'discussion_points', 'client_concerns', 'recommendations'],
            columns: 1
          }
        }
      ]
    },
    {
      name: 'action_items',
      components: [
        {
          type: 'record:details' as const,
          label: 'Follow-Up Actions',
          properties: {
            fields: ['follow_up_actions', 'next_meeting_date', 'assigned_tasks'],
            columns: 1
          }
        },
        {
          type: 'record:activity' as const,
          label: 'Activity Timeline',
          properties: {}
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(AdvisoryPage);

export default AdvisoryPage;
