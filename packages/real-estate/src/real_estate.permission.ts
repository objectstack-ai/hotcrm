import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = [
  'property', 'listing', 'showing', 'real_estate_offer',
  'commission', 'open_house', 'neighborhood'
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

export const RealEstateAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'real_estate_admin',
  label: 'Real Estate Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  fields: {
    'commission.commission_amount': { readable: true, editable: true },
    'commission.commission_rate': { readable: true, editable: true },
    'listing.sold_price': { readable: true, editable: true }
  },
  systemPermissions: ['manage_real_estate_settings', 'manage_commission_rules']
});

export const RealEstateBroker: PermissionSet = PermissionSetSchema.parse({
  name: 'real_estate_broker',
  label: 'Real Estate Broker',
  isProfile: false,
  objects: {
    property: fullAccess,
    listing: fullAccess,
    showing: fullAccess,
    real_estate_offer: fullAccess,
    commission: { ...standardAccess, viewAllRecords: true },
    open_house: fullAccess,
    neighborhood: standardAccess
  },
  fields: {
    'commission.commission_amount': { readable: true, editable: true },
    'commission.commission_rate': { readable: true, editable: false },
    'listing.sold_price': { readable: true, editable: true }
  },
  systemPermissions: ['manage_commission_rules']
});

export const RealEstateAgent: PermissionSet = PermissionSetSchema.parse({
  name: 'real_estate_agent',
  label: 'Real Estate Agent',
  isProfile: false,
  objects: {
    property: standardAccess,
    listing: standardAccess,
    showing: standardAccess,
    real_estate_offer: standardAccess,
    commission: readOnlyAccess,
    open_house: standardAccess,
    neighborhood: readOnlyAccess
  },
  fields: {
    'commission.commission_amount': { readable: true, editable: false },
    'commission.commission_rate': { readable: false, editable: false },
    'listing.sold_price': { readable: true, editable: false }
  }
});

export const RealEstateReadOnly: PermissionSet = PermissionSetSchema.parse({
  name: 'real_estate_read_only',
  label: 'Real Estate Read Only',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, readOnlyAccess])),
  fields: {
    'commission.commission_amount': { readable: false, editable: false },
    'commission.commission_rate': { readable: false, editable: false },
    'listing.sold_price': { readable: false, editable: false }
  }
});
