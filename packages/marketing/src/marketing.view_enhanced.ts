import type { ViewTab, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

/**
 * Marketing List View Enhancements
 * ViewTabs, sharing, appearance, and user actions for Marketing objects
 */

// --- Campaign View Tabs ---
export const CampaignViewTabs = [
  { name: 'active', label: 'Active', filter: [['status', '=', 'active']] },
  { name: 'planned', label: 'Planned', filter: [['status', '=', 'planned']] },
  { name: 'completed', label: 'Completed', filter: [['status', '=', 'completed']] },
  { name: 'all', label: 'All Campaigns', filter: [] }
] satisfies ViewTab[];

// --- Lead View Tabs ---
export const LeadViewTabs = [
  { name: 'new', label: 'New Leads', filter: [['status', '=', 'new']] },
  { name: 'qualified', label: 'Qualified', filter: [['status', '=', 'qualified']] },
  { name: 'converted', label: 'Converted', filter: [['status', '=', 'converted']] },
  { name: 'all', label: 'All Leads', filter: [] }
] satisfies ViewTab[];

// --- Email Template View Tabs ---
export const EmailTemplateViewTabs = [
  { name: 'active', label: 'Active', filter: [['status', '=', 'active']] },
  { name: 'draft', label: 'Draft', filter: [['status', '=', 'draft']] },
  { name: 'all', label: 'All Templates', filter: [] }
] satisfies ViewTab[];

// --- Shared Configs ---
export const MarketingSharingConfig = {
  visibility: 'public' as const
} satisfies SharingConfig;

export const MarketingAppearanceConfig = {
  density: 'comfortable' as const
} satisfies AppearanceConfig;

export const MarketingAddRecordConfig = {
  enabled: true
} satisfies AddRecordConfig;

export const MarketingUserActionsConfig = {
  actions: ['edit', 'delete', 'clone_campaign', 'export']
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
