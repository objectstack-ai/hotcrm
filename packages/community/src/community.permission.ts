import { PermissionSetSchema } from '@objectstack/spec/security';
import type { PermissionSet } from '@objectstack/spec/security';

const allObjects = [
  'community', 'forum_category', 'topic', 'reply',
  'idea', 'user_group', 'community_event', 'badge'
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

export const CommunityAdmin: PermissionSet = PermissionSetSchema.parse({
  name: 'community_admin',
  label: 'Community Administrator',
  isProfile: false,
  objects: Object.fromEntries(allObjects.map(obj => [obj, fullAccess])),
  fields: {
    'community.features_enabled': { readable: true, editable: true },
    'community.branding': { readable: true, editable: true },
    'user_group.criteria': { readable: true, editable: true }
  },
  systemPermissions: ['manage_community_settings', 'manage_user_groups', 'manage_badges']
});

export const CommunityModerator: PermissionSet = PermissionSetSchema.parse({
  name: 'community_moderator',
  label: 'Community Moderator',
  isProfile: false,
  objects: {
    community: readOnlyAccess,
    forum_category: standardAccess,
    topic: { ...standardAccess, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    reply: { ...standardAccess, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    idea: standardAccess,
    user_group: standardAccess,
    community_event: standardAccess,
    badge: readOnlyAccess
  },
  fields: {
    'community.features_enabled': { readable: true, editable: false },
    'community.branding': { readable: true, editable: false },
    'user_group.criteria': { readable: true, editable: false }
  },
  systemPermissions: ['moderate_content']
});

export const CommunityMember: PermissionSet = PermissionSetSchema.parse({
  name: 'community_member',
  label: 'Community Member',
  isProfile: false,
  objects: {
    community: readOnlyAccess,
    forum_category: readOnlyAccess,
    topic: standardAccess,
    reply: standardAccess,
    idea: standardAccess,
    user_group: readOnlyAccess,
    community_event: readOnlyAccess,
    badge: readOnlyAccess
  },
  fields: {
    'community.features_enabled': { readable: false, editable: false },
    'community.branding': { readable: false, editable: false },
    'user_group.criteria': { readable: false, editable: false }
  }
});
