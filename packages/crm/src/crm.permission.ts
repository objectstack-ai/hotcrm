import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = [
  'account', 'activity', 'contact', 'lead',
  'opportunity', 'task', 'note', 'assignment_rule'
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

export const CRMAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'crm_admin',
  label: 'CRM Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  fields: {
    'account.annual_revenue': { readable: true, editable: true },
    'opportunity.amount': { readable: true, editable: true },
    'lead.email': { readable: true, editable: true }
  },
  systemPermissions: ['manage_crm_settings', 'manage_assignment_rules']
});

export const CRMUser: PermissionSet = PermissionSetSchema.parse({
  name: 'crm_user',
  label: 'CRM Standard User',
  isProfile: false,
  objects: {
    account: standardAccess,
    contact: standardAccess,
    lead: standardAccess,
    opportunity: standardAccess,
    activity: standardAccess,
    task: standardAccess,
    note: standardAccess,
    assignment_rule: readOnlyAccess
  },
  fields: {
    'account.annual_revenue': { readable: true, editable: false },
    'opportunity.amount': { readable: true, editable: true },
    'lead.email': { readable: true, editable: true }
  }
});

export const CRMReadOnly: PermissionSet = PermissionSetSchema.parse({
  name: 'crm_read_only',
  label: 'CRM Read Only',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, readOnlyAccess])),
  fields: {
    'account.annual_revenue': { readable: false, editable: false },
    'opportunity.amount': { readable: false, editable: false },
    'lead.email': { readable: false, editable: false }
  }
});
