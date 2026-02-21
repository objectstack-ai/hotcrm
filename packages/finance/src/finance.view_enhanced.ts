import type { ViewTab, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

/**
 * Finance List View Enhancements
 * ViewTabs, sharing, appearance, and user actions for Finance objects
 */

// --- Invoice View Tabs ---
export const InvoiceViewTabs = [
  { name: 'pending', label: 'Pending', filter: [['status', '=', 'pending']] },
  { name: 'paid', label: 'Paid', filter: [['status', '=', 'paid']] },
  { name: 'overdue', label: 'Overdue', filter: [['status', '=', 'overdue']] },
  { name: 'all', label: 'All Invoices', filter: [] }
] satisfies ViewTab[];

// --- Contract View Tabs ---
export const ContractViewTabs = [
  { name: 'active', label: 'Active', filter: [['status', '=', 'activated']] },
  { name: 'expired', label: 'Expired', filter: [['status', '=', 'expired']] },
  { name: 'draft', label: 'Draft', filter: [['status', '=', 'draft']] }
] satisfies ViewTab[];

// --- Payment View Tabs ---
export const PaymentViewTabs = [
  { name: 'completed', label: 'Completed', filter: [['status', '=', 'completed']] },
  { name: 'pending', label: 'Pending', filter: [['status', '=', 'pending']] },
  { name: 'all', label: 'All Payments', filter: [] }
] satisfies ViewTab[];

// --- Shared Configs ---
export const FinanceSharingConfig = {
  visibility: 'team' as const
} satisfies SharingConfig;

export const FinanceAppearanceConfig = {
  density: 'compact' as const
} satisfies AppearanceConfig;

export const FinanceAddRecordConfig = {
  enabled: true
} satisfies AddRecordConfig;

export const FinanceUserActionsConfig = {
  actions: ['edit', 'delete', 'send_invoice', 'export']
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
