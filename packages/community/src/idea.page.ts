import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Idea Detail Page Layout
 * Provides voting, status timeline, and comments for idea management
 */
export const IdeaPage = {
  name: 'idea_detail',
  object: 'idea',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Idea Detail',
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
            fields: ['title', 'status', 'category', 'vote_count', 'author_id']
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
            tabs: ['overview', 'timeline', 'comments']
          }
        }
      ]
    },
    {
      name: 'overview',
      components: [
        {
          type: 'record:details' as const,
          label: 'Idea Description',
          properties: {
            fields: [
              'title', 'description', 'category',
              'product_area', 'assigned_release'
            ],
            columns: 1
          }
        },
        {
          type: 'record:details' as const,
          label: 'Voting & Priority',
          properties: {
            fields: [
              'vote_count', 'priority_score', 'status'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'timeline',
      components: [
        {
          type: 'record:details' as const,
          label: 'Status Timeline',
          properties: {
            fields: [
              'status', 'author_id', 'assigned_release'
            ],
            columns: 1
          }
        }
      ]
    },
    {
      name: 'comments',
      components: [
        {
          type: 'record:details' as const,
          label: 'Discussion',
          properties: {
            fields: [
              'author_id', 'vote_count'
            ],
            columns: 2
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(IdeaPage);

export default IdeaPage;
