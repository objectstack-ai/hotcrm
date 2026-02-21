import type { ViewTab, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

/**
 * Support List View Enhancements
 * ViewTabs, sharing, appearance, and user actions for Support objects
 */

// --- Case View Tabs ---
export const CaseViewTabs = [
  { name: 'open', label: 'Open', filter: [['status', '=', 'open']] },
  { name: 'escalated', label: 'Escalated', filter: [['is_escalated', '=', 'true']] },
  { name: 'resolved', label: 'Resolved', filter: [['status', '=', 'resolved']] },
  { name: 'all', label: 'All Cases', filter: [] }
] satisfies ViewTab[];

// --- Knowledge Base View Tabs ---
export const KnowledgeArticleViewTabs = [
  { name: 'published', label: 'Published', filter: [['status', '=', 'published']] },
  { name: 'draft', label: 'Draft', filter: [['status', '=', 'draft']] },
  { name: 'all', label: 'All Articles', filter: [] }
] satisfies ViewTab[];

// --- Queue View Tabs ---
export const QueueViewTabs = [
  { name: 'unassigned', label: 'Unassigned', filter: [['owner', '=', '']] },
  { name: 'my_queue', label: 'My Queue', filter: [['owner', '=', '${currentUser.id}']] },
  { name: 'all', label: 'All Queues', filter: [] }
] satisfies ViewTab[];

// --- Shared Configs ---
export const SupportSharingConfig = {
  visibility: 'team' as const
} satisfies SharingConfig;

export const SupportAppearanceConfig = {
  density: 'compact' as const
} satisfies AppearanceConfig;

export const SupportAddRecordConfig = {
  enabled: true
} satisfies AddRecordConfig;

export const SupportUserActionsConfig = {
  actions: ['edit', 'delete', 'escalate', 'assign', 'export']
} satisfies UserActionsConfig;

// Schema validation
CaseViewTabs.forEach(t => ViewTabSchema.parse(t));
KnowledgeArticleViewTabs.forEach(t => ViewTabSchema.parse(t));
QueueViewTabs.forEach(t => ViewTabSchema.parse(t));
SharingConfigSchema.parse(SupportSharingConfig);
AppearanceConfigSchema.parse(SupportAppearanceConfig);
AddRecordConfigSchema.parse(SupportAddRecordConfig);
UserActionsConfigSchema.parse(SupportUserActionsConfig);

export default {
  caseTabs: CaseViewTabs,
  knowledgeArticleTabs: KnowledgeArticleViewTabs,
  queueTabs: QueueViewTabs,
  sharing: SupportSharingConfig,
  appearance: SupportAppearanceConfig,
  addRecord: SupportAddRecordConfig,
  userActions: SupportUserActionsConfig
};
