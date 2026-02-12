import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Knowledge Article Detail Page Layout
 */
export const KnowledgeArticlePage = {
  name: 'knowledge_article_detail',
  object: 'knowledge_article',
  type: 'record' as const,
  label: 'Knowledge Article Detail Page',

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['title', 'article_number', 'status', 'category', 'helpful_rating']
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
            tabs: ['article_info', 'publishing_info', 'metrics_info']
          }
        }
      ]
    },
    {
      name: 'article_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Article Information',
          properties: {
            fields: [
              'title', 'article_number', 'summary', 'content',
              'category', 'subcategory', 'keywords', 'language',
              'author_id', 'owner_id'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'publishing_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Publishing Information',
          properties: {
            fields: [
              'status', 'publish_date', 'is_internal', 'is_public', 'version_number'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'metrics_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Metrics Information',
          properties: {
            fields: [
              'view_count', 'helpful_count', 'not_helpful_count',
              'helpful_rating', 'quality_score'
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
          label: 'Related Cases',
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

PageSchema.parse(KnowledgeArticlePage);

export default KnowledgeArticlePage;
