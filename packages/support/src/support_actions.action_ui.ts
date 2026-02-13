import type { Action } from '@objectstack/spec/ui';
import { ActionSchema } from '@objectstack/spec/ui';

/**
 * Support Quick Actions
 * Escalate Case, Merge Cases, Create Knowledge Article
 */

export const EscalateCaseAction = {
  name: 'escalate_case',
  label: 'Escalate Case',
  icon: 'arrow-up-circle',
  type: 'modal' as const,
  locations: ['record_header' as const, 'list_item' as const],
  params: [
    { name: 'escalation_reason', label: 'Reason', type: 'select' as const, required: true, options: ['sla_breach', 'customer_request', 'technical_complexity', 'executive_escalation'] },
    { name: 'notes', label: 'Escalation Notes', type: 'textarea' as const, required: true },
    { name: 'escalate_to', label: 'Escalate To', type: 'lookup' as const }
  ],
  variant: 'danger' as const,
  confirmText: 'Are you sure you want to escalate this case?',
  successMessage: 'Case escalated successfully'
} satisfies Action;

export const MergeCasesAction = {
  name: 'merge_cases',
  label: 'Merge Cases',
  icon: 'git-merge',
  type: 'modal' as const,
  locations: ['list_toolbar' as const],
  params: [
    { name: 'primary_case', label: 'Primary Case', type: 'lookup' as const, required: true },
    { name: 'merge_comments', label: 'Merge Comments', type: 'boolean' as const }
  ],
  variant: 'secondary' as const,
  confirmText: 'Merge selected cases? This action cannot be undone.',
  bulkEnabled: true,
  successMessage: 'Cases merged successfully'
} satisfies Action;

export const CreateKnowledgeArticleAction = {
  name: 'create_knowledge_article',
  label: 'Create Knowledge Article',
  icon: 'book-open',
  type: 'modal' as const,
  locations: ['record_header' as const, 'record_more' as const],
  params: [
    { name: 'title', label: 'Article Title', type: 'text' as const, required: true },
    { name: 'article_type', label: 'Article Type', type: 'select' as const, options: ['how_to', 'faq', 'troubleshooting', 'best_practice'] },
    { name: 'include_resolution', label: 'Include Case Resolution', type: 'boolean' as const }
  ],
  variant: 'secondary' as const,
  successMessage: 'Knowledge article created'
} satisfies Action;

ActionSchema.parse(EscalateCaseAction);
ActionSchema.parse(MergeCasesAction);
ActionSchema.parse(CreateKnowledgeArticleAction);

export const SupportActions = {
  escalateCase: EscalateCaseAction,
  mergeCases: MergeCasesAction,
  createKnowledgeArticle: CreateKnowledgeArticleAction
};

export default SupportActions;
