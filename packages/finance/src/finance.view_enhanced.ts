import type { ViewTab, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

/**
 * Finance List View Enhancements
 * ViewTabs, sharing, appearance, and user actions for Finance objects
 */

// --- Invoice View Tabs ---
export const InvoiceViewTabs = [
  { name: 'pending', label: 'Pending', pinned: false, isDefault: true, visible: true, filter: [{ field: 'status', operator: '=', value: 'pending' }] },
  { name: 'paid', label: 'Paid', pinned: false, isDefault: false, visible: true, filter: [{ field: 'status', operator: '=', value: 'paid' }] },
  { name: 'overdue', label: 'Overdue', pinned: false, isDefault: false, visible: true, filter: [{ field: 'status', operator: '=', value: 'overdue' }] },
  { name: 'all', label: 'All Invoices', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Contract View Tabs ---
export const ContractViewTabs = [
  { name: 'active', label: 'Active', pinned: false, isDefault: true, visible: true, filter: [{ field: 'status', operator: '=', value: 'activated' }] },
  { name: 'expired', label: 'Expired', pinned: false, isDefault: false, visible: true, filter: [{ field: 'status', operator: '=', value: 'expired' }] },
  { name: 'draft', label: 'Draft', pinned: false, isDefault: false, visible: true, filter: [{ field: 'status', operator: '=', value: 'draft' }] }
] satisfies ViewTab[];

// --- Payment View Tabs ---
export const PaymentViewTabs = [
  { name: 'completed', label: 'Completed', pinned: false, isDefault: true, visible: true, filter: [{ field: 'status', operator: '=', value: 'completed' }] },
  { name: 'pending', label: 'Pending', pinned: false, isDefault: false, visible: true, filter: [{ field: 'status', operator: '=', value: 'pending' }] },
  { name: 'all', label: 'All Payments', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Shared Configs ---
export const FinanceSharingConfig = {
  enabled: true, allowAnonymous: false
} satisfies SharingConfig;

export const FinanceAppearanceConfig = {
  showDescription: true
} satisfies AppearanceConfig;

export const FinanceAddRecordConfig = {
  enabled: true, position: 'top' as const, mode: 'modal' as const
} satisfies AddRecordConfig;

export const FinanceUserActionsConfig = {
  sort: true, search: true, filter: true, rowHeight: false, addRecordForm: true, buttons: ['edit', 'delete', 'send_invoice', 'export']
} satisfies UserActionsConfig;

// Schema validation
InvoiceViewTabs.forEach(t => ViewTabSchema.parse(t));
ContractViewTabs.forEach(t => ViewTabSchema.parse(t));
PaymentViewTabs.forEach(t => ViewTabSchema.parse(t));
SharingConfigSchema.parse(FinanceSharingConfig);
AppearanceConfigSchema.parse(FinanceAppearanceConfig);
AddRecordConfigSchema.parse(FinanceAddRecordConfig);
UserActionsConfigSchema.parse(FinanceUserActionsConfig);

export default {
  invoiceTabs: InvoiceViewTabs,
  contractTabs: ContractViewTabs,
  paymentTabs: PaymentViewTabs,
  sharing: FinanceSharingConfig,
  appearance: FinanceAppearanceConfig,
  addRecord: FinanceAddRecordConfig,
  userActions: FinanceUserActionsConfig
};
