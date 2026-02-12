import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = [
  'employee', 'department', 'position',
  'recruitment', 'candidate', 'application', 'interview', 'offer', 'onboarding',
  'performance_review', 'goal', 'training', 'certification',
  'time_off', 'attendance', 'payroll'
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

export const HRAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'hr_admin',
  label: 'HR Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  systemPermissions: ['manage_hr_settings', 'manage_payroll', 'manage_recruitment']
});

export const HRUser: PermissionSet = PermissionSetSchema.parse({
  name: 'hr_user',
  label: 'HR Standard User',
  isProfile: false,
  objects: {
    employee: standardAccess,
    department: readOnlyAccess,
    position: readOnlyAccess,
    recruitment: standardAccess,
    candidate: standardAccess,
    application: standardAccess,
    interview: standardAccess,
    offer: readOnlyAccess,
    onboarding: standardAccess,
    performance_review: standardAccess,
    goal: standardAccess,
    training: standardAccess,
    certification: readOnlyAccess,
    time_off: standardAccess,
    attendance: standardAccess,
    payroll: readOnlyAccess
  }
});

export const HRReadOnly: PermissionSet = PermissionSetSchema.parse({
  name: 'hr_read_only',
  label: 'HR Read Only',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, readOnlyAccess]))
});
