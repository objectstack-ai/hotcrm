import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = [
  'product', 'pricebook', 'quote', 'quote_line_item',
  'product_bundle', 'product_bundle_component',
  'price_rule', 'approval_request', 'discount_schedule'
] as const;

const fullAccess = {
  allowCreate: true,
  allowRead: true,
  allowEdit: true,
  allowDelete: true,
  viewAllRecords: true,
  modifyAllRecords: true
};

const standardAccess = {
  allowCreate: true,
  allowRead: true,
  allowEdit: true,
  allowDelete: false,
  viewAllRecords: false,
  modifyAllRecords: false
};

const readOnlyAccess = {
  allowCreate: false,
  allowRead: true,
  allowEdit: false,
  allowDelete: false,
  viewAllRecords: false,
  modifyAllRecords: false
};

export const ProductsAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'products_admin',
  label: 'Products Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  systemPermissions: ['manage_product_catalog', 'manage_pricing', 'manage_approvals']
});

export const ProductsUser: PermissionSet = PermissionSetSchema.parse({
  name: 'products_user',
  label: 'Products Standard User',
  isProfile: false,
  objects: {
    product: readOnlyAccess,
    pricebook: readOnlyAccess,
    quote: standardAccess,
    quote_line_item: standardAccess,
    product_bundle: readOnlyAccess,
    product_bundle_component: readOnlyAccess,
    price_rule: readOnlyAccess,
    approval_request: standardAccess,
    discount_schedule: readOnlyAccess
  }
});

export const ProductsReadOnly: PermissionSet = PermissionSetSchema.parse({
  name: 'products_read_only',
  label: 'Products Read Only',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, readOnlyAccess]))
});
