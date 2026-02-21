import type { ViewTab, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

/**
 * Products List View Enhancements
 * ViewTabs, sharing, appearance, and user actions for Products objects
 */

// --- Product View Tabs ---
export const ProductViewTabs = [
  { name: 'active', label: 'Active', filter: [['status', '=', 'active']] },
  { name: 'retired', label: 'Retired', filter: [['status', '=', 'retired']] },
  { name: 'draft', label: 'Draft', filter: [['status', '=', 'draft']] },
  { name: 'all', label: 'All Products', filter: [] }
] satisfies ViewTab[];

// --- Order View Tabs ---
export const OrderViewTabs = [
  { name: 'pending', label: 'Pending', filter: [['status', '=', 'pending']] },
  { name: 'shipped', label: 'Shipped', filter: [['status', '=', 'shipped']] },
  { name: 'delivered', label: 'Delivered', filter: [['status', '=', 'delivered']] },
  { name: 'all', label: 'All Orders', filter: [] }
] satisfies ViewTab[];

// --- Quote View Tabs ---
export const QuoteViewTabs = [
  { name: 'draft', label: 'Draft', filter: [['status', '=', 'draft']] },
  { name: 'approved', label: 'Approved', filter: [['status', '=', 'approved']] },
  { name: 'all', label: 'All Quotes', filter: [] }
] satisfies ViewTab[];

// --- Shared Configs ---
export const ProductsSharingConfig = {
  visibility: 'public' as const
} satisfies SharingConfig;

export const ProductsAppearanceConfig = {
  density: 'comfortable' as const
} satisfies AppearanceConfig;

export const ProductsAddRecordConfig = {
  enabled: true
} satisfies AddRecordConfig;

export const ProductsUserActionsConfig = {
  actions: ['edit', 'delete', 'clone', 'export']
} satisfies UserActionsConfig;

// Schema validation
ProductViewTabs.forEach(t => ViewTabSchema.parse(t));
OrderViewTabs.forEach(t => ViewTabSchema.parse(t));
QuoteViewTabs.forEach(t => ViewTabSchema.parse(t));
SharingConfigSchema.parse(ProductsSharingConfig);
AppearanceConfigSchema.parse(ProductsAppearanceConfig);
AddRecordConfigSchema.parse(ProductsAddRecordConfig);
UserActionsConfigSchema.parse(ProductsUserActionsConfig);

export default {
  productTabs: ProductViewTabs,
  orderTabs: OrderViewTabs,
  quoteTabs: QuoteViewTabs,
  sharing: ProductsSharingConfig,
  appearance: ProductsAppearanceConfig,
  addRecord: ProductsAddRecordConfig,
  userActions: ProductsUserActionsConfig
};
