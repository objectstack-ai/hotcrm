import type { ViewTab, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

/**
 * CRM List View Enhancements
 * ViewTabs, sharing, appearance, and user actions for CRM objects
 */

// --- Opportunity View Tabs ---
export const OpportunityViewTabs = [
  { name: 'pipeline', label: 'Pipeline', pinned: false, isDefault: true, visible: true, filter: [{ field: 'stage', operator: '!=', value: 'closed_won' }, { field: 'stage', operator: '!=', value: 'closed_lost' }] },
  { name: 'won', label: 'Won', pinned: false, isDefault: false, visible: true, filter: [{ field: 'stage', operator: '=', value: 'closed_won' }] },
  { name: 'lost', label: 'Lost', pinned: false, isDefault: false, visible: true, filter: [{ field: 'stage', operator: '=', value: 'closed_lost' }] },
  { name: 'all', label: 'All', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Account View Tabs ---
export const AccountViewTabs = [
  { name: 'active', label: 'Active Accounts', pinned: false, isDefault: true, visible: true, filter: [{ field: 'status', operator: '=', value: 'active' }] },
  { name: 'inactive', label: 'Inactive', pinned: false, isDefault: false, visible: true, filter: [{ field: 'status', operator: '=', value: 'inactive' }] },
  { name: 'my_accounts', label: 'My Accounts', pinned: false, isDefault: false, visible: true, filter: [{ field: 'owner', operator: '=', value: '${currentUser.id}' }] }
] satisfies ViewTab[];

// --- Contact View Tabs ---
export const ContactViewTabs = [
  { name: 'all', label: 'All Contacts', pinned: false, isDefault: true, visible: true, filter: [] },
  { name: 'decision_makers', label: 'Decision Makers', pinned: false, isDefault: false, visible: true, filter: [{ field: 'is_decision_maker', operator: '=', value: 'true' }] },
  { name: 'recent', label: 'Recently Contacted', pinned: false, isDefault: false, visible: true, filter: [{ field: 'last_contact_date', operator: '>=', value: 'LAST_30_DAYS' }] }
] satisfies ViewTab[];

// --- Shared Configs ---
export const CrmSharingConfig = {
  enabled: true, allowAnonymous: false
} satisfies SharingConfig;

export const CrmAppearanceConfig = {
  showDescription: true
} satisfies AppearanceConfig;

export const CrmAddRecordConfig = {
  enabled: true, position: 'top' as const, mode: 'modal' as const
} satisfies AddRecordConfig;

export const CrmUserActionsConfig = {
  sort: true, search: true, filter: true, rowHeight: false, addRecordForm: true, buttons: ['edit', 'delete', 'change_owner', 'export']
} satisfies UserActionsConfig;

// Schema validation
OpportunityViewTabs.forEach(t => ViewTabSchema.parse(t));
AccountViewTabs.forEach(t => ViewTabSchema.parse(t));
ContactViewTabs.forEach(t => ViewTabSchema.parse(t));
SharingConfigSchema.parse(CrmSharingConfig);
AppearanceConfigSchema.parse(CrmAppearanceConfig);
AddRecordConfigSchema.parse(CrmAddRecordConfig);
UserActionsConfigSchema.parse(CrmUserActionsConfig);

export default {
  opportunityTabs: OpportunityViewTabs,
  accountTabs: AccountViewTabs,
  contactTabs: ContactViewTabs,
  sharing: CrmSharingConfig,
  appearance: CrmAppearanceConfig,
  addRecord: CrmAddRecordConfig,
  userActions: CrmUserActionsConfig
};
