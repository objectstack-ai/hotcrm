import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = [
  'campaign', 'campaign_member', 'email_template', 'landing_page',
  'form', 'marketing_list', 'unsubscribe', 'automation_workflow',
  'email_send', 'lead_nurture_program', 'touchpoint'
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

export const MarketingAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'marketing_admin',
  label: 'Marketing Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  systemPermissions: ['manage_marketing_settings', 'manage_email_templates', 'manage_automation']
});

export const MarketingUser: PermissionSet = PermissionSetSchema.parse({
  name: 'marketing_user',
  label: 'Marketing Standard User',
  isProfile: false,
  objects: {
    campaign: standardAccess,
    campaign_member: standardAccess,
    email_template: standardAccess,
    landing_page: standardAccess,
    form: standardAccess,
    marketing_list: standardAccess,
    unsubscribe: readOnlyAccess,
    automation_workflow: standardAccess,
    email_send: standardAccess,
    lead_nurture_program: standardAccess,
    touchpoint: readOnlyAccess
  }
});

export const MarketingReadOnly: PermissionSet = PermissionSetSchema.parse({
  name: 'marketing_read_only',
  label: 'Marketing Read Only',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, readOnlyAccess]))
});
