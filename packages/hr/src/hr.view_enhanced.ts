import type { ViewTab, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

/**
 * HR List View Enhancements
 * ViewTabs, sharing, appearance, and user actions for HR objects
 */

// --- Employee View Tabs ---
export const EmployeeViewTabs = [
  { name: 'active', label: 'Active', filter: [['status', '=', 'active']] },
  { name: 'on_leave', label: 'On Leave', filter: [['status', '=', 'on_leave']] },
  { name: 'all', label: 'All Employees', filter: [] }
] satisfies ViewTab[];

// --- Application View Tabs ---
export const ApplicationViewTabs = [
  { name: 'new', label: 'New', filter: [['status', '=', 'new']] },
  { name: 'in_review', label: 'In Review', filter: [['status', '=', 'in_review']] },
  { name: 'hired', label: 'Hired', filter: [['status', '=', 'hired']] },
  { name: 'all', label: 'All Applications', filter: [] }
] satisfies ViewTab[];

// --- Time Off View Tabs ---
export const TimeOffViewTabs = [
  { name: 'pending', label: 'Pending Approval', filter: [['status', '=', 'pending']] },
  { name: 'approved', label: 'Approved', filter: [['status', '=', 'approved']] },
  { name: 'all', label: 'All Requests', filter: [] }
] satisfies ViewTab[];

// --- Shared Configs ---
export const HrSharingConfig = {
  visibility: 'private' as const
} satisfies SharingConfig;

export const HrAppearanceConfig = {
  density: 'comfortable' as const
} satisfies AppearanceConfig;

export const HrAddRecordConfig = {
  enabled: true
} satisfies AddRecordConfig;

export const HrUserActionsConfig = {
  actions: ['edit', 'delete', 'assign_manager', 'export']
} satisfies UserActionsConfig;

// Schema validation
EmployeeViewTabs.forEach(t => ViewTabSchema.parse(t));
ApplicationViewTabs.forEach(t => ViewTabSchema.parse(t));
TimeOffViewTabs.forEach(t => ViewTabSchema.parse(t));
SharingConfigSchema.parse(HrSharingConfig);
AppearanceConfigSchema.parse(HrAppearanceConfig);
AddRecordConfigSchema.parse(HrAddRecordConfig);
UserActionsConfigSchema.parse(HrUserActionsConfig);

export default {
  employeeTabs: EmployeeViewTabs,
  applicationTabs: ApplicationViewTabs,
  timeOffTabs: TimeOffViewTabs,
  sharing: HrSharingConfig,
  appearance: HrAppearanceConfig,
  addRecord: HrAddRecordConfig,
  userActions: HrUserActionsConfig
};
