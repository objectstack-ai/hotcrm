import type { ViewTab, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

/**
 * Marketing List View Enhancements
 * ViewTabs, sharing, appearance, and user actions for Marketing objects
 */

// --- Campaign View Tabs ---
export const CampaignViewTabs = [
  { name: 'active', label: 'Active', pinned: false, isDefault: true, visible: true, filter: [['status', '=', 'active']] },
  { name: 'planned', label: 'Planned', pinned: false, isDefault: false, visible: true, filter: [['status', '=', 'planned']] },
  { name: 'completed', label: 'Completed', pinned: false, isDefault: false, visible: true, filter: [['status', '=', 'completed']] },
  { name: 'all', label: 'All Campaigns', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Lead View Tabs ---
export const LeadViewTabs = [
  { name: 'new', label: 'New Leads', pinned: false, isDefault: true, visible: true, filter: [['status', '=', 'new']] },
  { name: 'qualified', label: 'Qualified', pinned: false, isDefault: false, visible: true, filter: [['status', '=', 'qualified']] },
  { name: 'converted', label: 'Converted', pinned: false, isDefault: false, visible: true, filter: [['status', '=', 'converted']] },
  { name: 'all', label: 'All Leads', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Email Template View Tabs ---
export const EmailTemplateViewTabs = [
  { name: 'active', label: 'Active', pinned: false, isDefault: true, visible: true, filter: [['status', '=', 'active']] },
  { name: 'draft', label: 'Draft', pinned: false, isDefault: false, visible: true, filter: [['status', '=', 'draft']] },
  { name: 'all', label: 'All Templates', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Shared Configs ---
export const MarketingSharingConfig = {
  enabled: true, allowAnonymous: false
} satisfies SharingConfig;

export const MarketingAppearanceConfig = {
  showDescription: true
} satisfies AppearanceConfig;

export const MarketingAddRecordConfig = {
  enabled: true, position: 'top' as const, mode: 'modal' as const
} satisfies AddRecordConfig;

export const MarketingUserActionsConfig = {
  sort: true, search: true, filter: true, rowHeight: false, addRecordForm: true, buttons: ['edit', 'delete', 'clone_campaign', 'export']
} satisfies UserActionsConfig;

// Schema validation
CampaignViewTabs.forEach(t => ViewTabSchema.parse(t));
LeadViewTabs.forEach(t => ViewTabSchema.parse(t));
EmailTemplateViewTabs.forEach(t => ViewTabSchema.parse(t));
SharingConfigSchema.parse(MarketingSharingConfig);
AppearanceConfigSchema.parse(MarketingAppearanceConfig);
AddRecordConfigSchema.parse(MarketingAddRecordConfig);
UserActionsConfigSchema.parse(MarketingUserActionsConfig);

export default {
  campaignTabs: CampaignViewTabs,
  leadTabs: LeadViewTabs,
  emailTemplateTabs: EmailTemplateViewTabs,
  sharing: MarketingSharingConfig,
  appearance: MarketingAppearanceConfig,
  addRecord: MarketingAddRecordConfig,
  userActions: MarketingUserActionsConfig
};
