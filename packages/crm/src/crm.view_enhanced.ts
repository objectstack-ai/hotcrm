import type { ViewTab, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

/**
 * CRM List View Enhancements
 * ViewTabs, sharing, appearance, and user actions for CRM objects
 */

// --- Opportunity View Tabs ---
export const OpportunityViewTabs = [
  { name: 'pipeline', label: 'Pipeline', filter: [['stage', '!=', 'closed_won'], ['stage', '!=', 'closed_lost']] },
  { name: 'won', label: 'Won', filter: [['stage', '=', 'closed_won']] },
  { name: 'lost', label: 'Lost', filter: [['stage', '=', 'closed_lost']] },
  { name: 'all', label: 'All', filter: [] }
] satisfies ViewTab[];

// --- Account View Tabs ---
export const AccountViewTabs = [
  { name: 'active', label: 'Active Accounts', filter: [['status', '=', 'active']] },
  { name: 'inactive', label: 'Inactive', filter: [['status', '=', 'inactive']] },
  { name: 'my_accounts', label: 'My Accounts', filter: [['owner', '=', '${currentUser.id}']] }
] satisfies ViewTab[];

// --- Contact View Tabs ---
export const ContactViewTabs = [
  { name: 'all', label: 'All Contacts', filter: [] },
  { name: 'decision_makers', label: 'Decision Makers', filter: [['is_decision_maker', '=', 'true']] },
  { name: 'recent', label: 'Recently Contacted', filter: [['last_contact_date', '>=', 'LAST_30_DAYS']] }
] satisfies ViewTab[];

// --- Shared Configs ---
export const CrmSharingConfig = {
  visibility: 'public' as const
} satisfies SharingConfig;

export const CrmAppearanceConfig = {
  density: 'comfortable' as const
} satisfies AppearanceConfig;

export const CrmAddRecordConfig = {
  enabled: true
} satisfies AddRecordConfig;

export const CrmUserActionsConfig = {
  actions: ['edit', 'delete', 'change_owner', 'export']
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
