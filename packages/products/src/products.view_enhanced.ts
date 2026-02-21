import type { ViewTab, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

/**
 * Products List View Enhancements
 * ViewTabs, sharing, appearance, and user actions for Products objects
 */

// --- Product View Tabs ---
export const ProductViewTabs = [
  { name: 'active', label: 'Active', pinned: false, isDefault: true, visible: true, filter: [['status', '=', 'active']] },
  { name: 'retired', label: 'Retired', pinned: false, isDefault: false, visible: true, filter: [['status', '=', 'retired']] },
  { name: 'draft', label: 'Draft', pinned: false, isDefault: false, visible: true, filter: [['status', '=', 'draft']] },
  { name: 'all', label: 'All Products', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Order View Tabs ---
export const OrderViewTabs = [
  { name: 'pending', label: 'Pending', pinned: false, isDefault: true, visible: true, filter: [['status', '=', 'pending']] },
  { name: 'shipped', label: 'Shipped', pinned: false, isDefault: false, visible: true, filter: [['status', '=', 'shipped']] },
  { name: 'delivered', label: 'Delivered', pinned: false, isDefault: false, visible: true, filter: [['status', '=', 'delivered']] },
  { name: 'all', label: 'All Orders', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Quote View Tabs ---
export const QuoteViewTabs = [
  { name: 'draft', label: 'Draft', pinned: false, isDefault: true, visible: true, filter: [['status', '=', 'draft']] },
  { name: 'approved', label: 'Approved', pinned: false, isDefault: false, visible: true, filter: [['status', '=', 'approved']] },
  { name: 'all', label: 'All Quotes', pinned: false, isDefault: false, visible: true, filter: [] }
] satisfies ViewTab[];

// --- Shared Configs ---
export const ProductsSharingConfig = {
  enabled: true, allowAnonymous: false
} satisfies SharingConfig;

export const ProductsAppearanceConfig = {
  showDescription: true
} satisfies AppearanceConfig;

export const ProductsAddRecordConfig = {
  enabled: true, position: 'top' as const, mode: 'modal' as const
} satisfies AddRecordConfig;

export const ProductsUserActionsConfig = {
  sort: true, search: true, filter: true, rowHeight: false, addRecordForm: true, buttons: ['edit', 'delete', 'clone', 'export']
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
