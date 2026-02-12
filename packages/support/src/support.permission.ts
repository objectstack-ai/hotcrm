import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = [
  'case', 'case_comment', 'knowledge_article',
  'sla_policy', 'sla_template', 'sla_milestone',
  'business_hours', 'holiday_calendar', 'holiday',
  'queue', 'queue_member', 'routing_rule', 'escalation_rule',
  'skill', 'agent_skill',
  'email_to_case', 'web_to_case', 'social_media_case',
  'portal_user', 'forum_topic', 'forum_post'
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

export const SupportAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'support_admin',
  label: 'Support Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  systemPermissions: ['manage_support_settings', 'manage_sla', 'manage_queues', 'manage_routing']
});

export const SupportUser: PermissionSet = PermissionSetSchema.parse({
  name: 'support_user',
  label: 'Support Standard User',
  isProfile: false,
  objects: {
    case: standardAccess,
    case_comment: standardAccess,
    knowledge_article: standardAccess,
    sla_policy: readOnlyAccess,
    sla_template: readOnlyAccess,
    sla_milestone: readOnlyAccess,
    business_hours: readOnlyAccess,
    holiday_calendar: readOnlyAccess,
    holiday: readOnlyAccess,
    queue: readOnlyAccess,
    queue_member: readOnlyAccess,
    routing_rule: readOnlyAccess,
    escalation_rule: readOnlyAccess,
    skill: readOnlyAccess,
    agent_skill: standardAccess,
    email_to_case: standardAccess,
    web_to_case: standardAccess,
    social_media_case: standardAccess,
    portal_user: readOnlyAccess,
    forum_topic: standardAccess,
    forum_post: standardAccess
  }
});

export const SupportReadOnly: PermissionSet = PermissionSetSchema.parse({
  name: 'support_read_only',
  label: 'Support Read Only',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, readOnlyAccess]))
});
