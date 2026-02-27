import type { ViewTab, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

/**
 * HR List View Enhancements
 * ViewTabs, sharing, appearance, and user actions for HR objects
 */

// --- Employee View Tabs ---
export const EmployeeViewTabs = [
  { name: 'active', label: 'Active', pinned: false, isDefault: true, visible: true, filter: [{ field: 'status', operator: '=', value: 'active' }] },
  { name: 'on_leave', label: 'On Leave', pinned: false, isDefault: false, visible: true, filter: [{ field: 'status', operator: '=', value: 'on_leave' }] },
  { name: 'all', label: 'All Employees', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Application View Tabs ---
export const ApplicationViewTabs = [
  { name: 'new', label: 'New', pinned: false, isDefault: true, visible: true, filter: [{ field: 'status', operator: '=', value: 'new' }] },
  { name: 'in_review', label: 'In Review', pinned: false, isDefault: false, visible: true, filter: [{ field: 'status', operator: '=', value: 'in_review' }] },
  { name: 'hired', label: 'Hired', pinned: false, isDefault: false, visible: true, filter: [{ field: 'status', operator: '=', value: 'hired' }] },
  { name: 'all', label: 'All Applications', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Time Off View Tabs ---
export const TimeOffViewTabs = [
  { name: 'pending', label: 'Pending Approval', pinned: false, isDefault: true, visible: true, filter: [{ field: 'status', operator: '=', value: 'pending' }] },
  { name: 'approved', label: 'Approved', pinned: false, isDefault: false, visible: true, filter: [{ field: 'status', operator: '=', value: 'approved' }] },
  { name: 'all', label: 'All Requests', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Shared Configs ---
export const HrSharingConfig = {
  enabled: true, allowAnonymous: false
} satisfies SharingConfig;

export const HrAppearanceConfig = {
  showDescription: true
} satisfies AppearanceConfig;

export const HrAddRecordConfig = {
  enabled: true, position: 'top' as const, mode: 'modal' as const
} satisfies AddRecordConfig;

export const HrUserActionsConfig = {
  sort: true, search: true, filter: true, rowHeight: false, addRecordForm: true, buttons: ['edit', 'delete', 'assign_manager', 'export']
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
