import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Topic Detail Page Layout
 * Provides topic content, replies, voting, and best answer capabilities
 */
export const TopicPage = {
  name: 'topic_detail',
  object: 'topic',
  type: 'record' as const,
  label: 'Topic Detail',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['community_manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['title', 'status', 'category_id', 'author_id', 'last_activity_at']
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
            tabs: ['discussion', 'details', 'activity']
          }
        }
      ]
    },
    {
      name: 'discussion',
      components: [
        {
          type: 'record:details' as const,
          label: 'Topic Content',
          properties: {
            fields: [
              'title', 'body', 'tags'
            ],
            columns: 1
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Replies',
          properties: {
            object: 'reply',
            columns: ['body', 'author_id', 'upvotes', 'downvotes', 'is_accepted_answer'],
            sort: [{ field: 'is_accepted_answer', direction: 'desc' }, { field: 'upvotes', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        }
      ]
    },
    {
      name: 'details',
      components: [
        {
          type: 'record:details' as const,
          label: 'Topic Details',
          properties: {
            fields: [
              'category_id', 'author_id', 'status',
              'is_pinned', 'is_locked',
              'view_count', 'reply_count'
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
          type: 'record:details' as const,
          label: 'Activity',
          properties: {
            fields: [
              'view_count', 'reply_count', 'last_activity_at'
            ],
            columns: 2
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(TopicPage);

export default TopicPage;
