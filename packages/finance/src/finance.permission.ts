import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = ['contract', 'invoice', 'invoice_line', 'payment'] as const;

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

export const FinanceAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'finance_admin',
  label: 'Finance Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  systemPermissions: ['manage_billing', 'manage_contracts']
});

export const FinanceUser: PermissionSet = PermissionSetSchema.parse({
  name: 'finance_user',
  label: 'Finance Standard User',
  isProfile: false,
  objects: {
    contract: standardAccess,
    invoice: standardAccess,
    invoice_line: standardAccess,
    payment: readOnlyAccess
  }
});

export const FinanceReadOnly: PermissionSet = PermissionSetSchema.parse({
  name: 'finance_read_only',
  label: 'Finance Read Only',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, readOnlyAccess]))
});
