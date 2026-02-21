import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Knowledge Base Article Page Layout
 * Record page for viewing and managing knowledge base articles.
 */
export const KbArticlePage = {
  name: 'kb_article',
  type: 'record' as const,
  label: 'Knowledge Base Article Page',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['support_agent', 'support_manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'page:header' as const,
          properties: {}
        }
      ]
    },
    {
      name: 'content',
      components: [
        {
          type: 'record:detail' as const,
          properties: {}
        }
      ]
    },
    {
      name: 'related_cases',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Related Cases',
          properties: {
            object: 'case'
          }
        }
      ]
    },
    {
      name: 'feedback',
      components: [
        {
          type: 'page:card' as const,
          label: 'Article Feedback',
          properties: {}
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(KbArticlePage);

export default KbArticlePage;
