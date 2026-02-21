import type { ViewTab, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

/**
 * Support List View Enhancements
 * ViewTabs, sharing, appearance, and user actions for Support objects
 */

// --- Case View Tabs ---
export const CaseViewTabs = [
  { name: 'open', label: 'Open', pinned: false, isDefault: true, visible: true, filter: [['status', '=', 'open']] },
  { name: 'escalated', label: 'Escalated', pinned: false, isDefault: false, visible: true, filter: [['is_escalated', '=', 'true']] },
  { name: 'resolved', label: 'Resolved', pinned: false, isDefault: false, visible: true, filter: [['status', '=', 'resolved']] },
  { name: 'all', label: 'All Cases', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Knowledge Base View Tabs ---
export const KnowledgeArticleViewTabs = [
  { name: 'published', label: 'Published', pinned: false, isDefault: true, visible: true, filter: [['status', '=', 'published']] },
  { name: 'draft', label: 'Draft', pinned: false, isDefault: false, visible: true, filter: [['status', '=', 'draft']] },
  { name: 'all', label: 'All Articles', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Queue View Tabs ---
export const QueueViewTabs = [
  { name: 'unassigned', label: 'Unassigned', pinned: false, isDefault: true, visible: true, filter: [['owner', '=', '']] },
  { name: 'my_queue', label: 'My Queue', pinned: false, isDefault: false, visible: true, filter: [['owner', '=', '${currentUser.id}']] },
  { name: 'all', label: 'All Queues', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Shared Configs ---
export const SupportSharingConfig = {
  enabled: true, allowAnonymous: false
} satisfies SharingConfig;

export const SupportAppearanceConfig = {
  showDescription: true
} satisfies AppearanceConfig;

export const SupportAddRecordConfig = {
  enabled: true, position: 'top' as const, mode: 'modal' as const
} satisfies AddRecordConfig;

export const SupportUserActionsConfig = {
  sort: true, search: true, filter: true, rowHeight: false, addRecordForm: true, buttons: ['edit', 'delete', 'escalate', 'assign', 'export']
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
