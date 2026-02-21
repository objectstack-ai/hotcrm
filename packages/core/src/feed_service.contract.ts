/**
 * Feed Service Contract
 *
 * Defines the HotCRM configuration layer on top of the platform IFeedService contract.
 * Specifies which objects support feeds, default settings, permission rules,
 * and auto-subscription behavior.
 */

import type {
  IFeedService,
  ListFeedOptions,
  CreateFeedItemInput,
  UpdateFeedItemInput,
  SubscribeInput,
  FeedListResult,
} from '@objectstack/spec/contracts';

// ---------------------------------------------------------------------------
// Feed-Enabled Objects
// ---------------------------------------------------------------------------

/** Objects that have the activity feed enabled */
export const FEED_ENABLED_OBJECTS = [
  'account',
  'contact',
  'opportunity',
  'lead',
  'case',
  'contract',
  'campaign',
  'task',
  'quote',
] as const;

export type FeedEnabledObject = (typeof FEED_ENABLED_OBJECTS)[number];

// ---------------------------------------------------------------------------
// Default Feed Configuration
// ---------------------------------------------------------------------------

export interface FeedObjectConfig {
  /** Whether feed tracking is enabled for this object */
  enabled: boolean;
  /** Feed item types allowed on this object */
  allowedTypes: Array<'comment' | 'field_change' | 'status_change' | 'attachment' | 'mention' | 'system'>;
  /** Whether reactions are enabled */
  reactionsEnabled: boolean;
  /** Whether users can subscribe to record feeds */
  subscriptionsEnabled: boolean;
  /** Maximum body length for feed items */
  maxBodyLength: number;
  /** Number of feed items returned per page */
  defaultPageSize: number;
}

export const DEFAULT_FEED_CONFIG: Record<FeedEnabledObject, FeedObjectConfig> = {
  account: {
    enabled: true,
    allowedTypes: ['comment', 'field_change', 'status_change', 'attachment', 'mention', 'system'],
    reactionsEnabled: true,
    subscriptionsEnabled: true,
    maxBodyLength: 10000,
    defaultPageSize: 25,
  },
  contact: {
    enabled: true,
    allowedTypes: ['comment', 'field_change', 'attachment', 'mention', 'system'],
    reactionsEnabled: true,
    subscriptionsEnabled: true,
    maxBodyLength: 10000,
    defaultPageSize: 25,
  },
  opportunity: {
    enabled: true,
    allowedTypes: ['comment', 'field_change', 'status_change', 'attachment', 'mention', 'system'],
    reactionsEnabled: true,
    subscriptionsEnabled: true,
    maxBodyLength: 10000,
    defaultPageSize: 25,
  },
  lead: {
    enabled: true,
    allowedTypes: ['comment', 'field_change', 'status_change', 'mention', 'system'],
    reactionsEnabled: true,
    subscriptionsEnabled: true,
    maxBodyLength: 5000,
    defaultPageSize: 20,
  },
  case: {
    enabled: true,
    allowedTypes: ['comment', 'field_change', 'status_change', 'attachment', 'mention', 'system'],
    reactionsEnabled: true,
    subscriptionsEnabled: true,
    maxBodyLength: 10000,
    defaultPageSize: 25,
  },
  contract: {
    enabled: true,
    allowedTypes: ['comment', 'field_change', 'status_change', 'attachment', 'system'],
    reactionsEnabled: false,
    subscriptionsEnabled: true,
    maxBodyLength: 5000,
    defaultPageSize: 20,
  },
  campaign: {
    enabled: true,
    allowedTypes: ['comment', 'field_change', 'status_change', 'mention', 'system'],
    reactionsEnabled: true,
    subscriptionsEnabled: true,
    maxBodyLength: 5000,
    defaultPageSize: 20,
  },
  task: {
    enabled: true,
    allowedTypes: ['comment', 'status_change', 'mention', 'system'],
    reactionsEnabled: false,
    subscriptionsEnabled: false,
    maxBodyLength: 3000,
    defaultPageSize: 15,
  },
  quote: {
    enabled: true,
    allowedTypes: ['comment', 'field_change', 'status_change', 'attachment', 'system'],
    reactionsEnabled: false,
    subscriptionsEnabled: true,
    maxBodyLength: 5000,
    defaultPageSize: 20,
  },
};

// ---------------------------------------------------------------------------
// Feed Permission Rules
// ---------------------------------------------------------------------------

export interface FeedPermissionRule {
  /** Action the rule governs */
  action: 'create' | 'update' | 'delete' | 'react' | 'subscribe' | 'read';
  /** Required permission on the parent object */
  requiredObjectPermission: string;
  /** Whether the user must own the feed item (for update/delete) */
  ownerOnly: boolean;
  /** Roles that can bypass the ownerOnly restriction */
  adminOverrideRoles: string[];
}

export const FEED_PERMISSION_RULES: FeedPermissionRule[] = [
  {
    action: 'read',
    requiredObjectPermission: 'read',
    ownerOnly: false,
    adminOverrideRoles: ['admin', 'system_admin'],
  },
  {
    action: 'create',
    requiredObjectPermission: 'read',
    ownerOnly: false,
    adminOverrideRoles: ['admin', 'system_admin'],
  },
  {
    action: 'update',
    requiredObjectPermission: 'read',
    ownerOnly: true,
    adminOverrideRoles: ['admin', 'system_admin'],
  },
  {
    action: 'delete',
    requiredObjectPermission: 'read',
    ownerOnly: true,
    adminOverrideRoles: ['admin', 'system_admin'],
  },
  {
    action: 'react',
    requiredObjectPermission: 'read',
    ownerOnly: false,
    adminOverrideRoles: ['admin', 'system_admin'],
  },
  {
    action: 'subscribe',
    requiredObjectPermission: 'read',
    ownerOnly: false,
    adminOverrideRoles: ['admin', 'system_admin'],
  },
];

// ---------------------------------------------------------------------------
// Auto-Subscription Rules
// ---------------------------------------------------------------------------

export interface AutoSubscriptionRule {
  /** Object type this rule applies to */
  object: FeedEnabledObject;
  /** Trigger that causes auto-subscription */
  trigger: 'record_create' | 'record_assign' | 'mention' | 'comment';
  /** Who gets auto-subscribed */
  subscribee: 'creator' | 'owner' | 'mentioned_user' | 'commenter';
  /** Whether the subscription can be removed by the user */
  canUnsubscribe: boolean;
}

export const AUTO_SUBSCRIPTION_RULES: AutoSubscriptionRule[] = [
  { object: 'account', trigger: 'record_create', subscribee: 'creator', canUnsubscribe: true },
  { object: 'account', trigger: 'record_assign', subscribee: 'owner', canUnsubscribe: true },
  { object: 'account', trigger: 'mention', subscribee: 'mentioned_user', canUnsubscribe: true },
  { object: 'opportunity', trigger: 'record_create', subscribee: 'creator', canUnsubscribe: true },
  { object: 'opportunity', trigger: 'record_assign', subscribee: 'owner', canUnsubscribe: true },
  { object: 'opportunity', trigger: 'comment', subscribee: 'commenter', canUnsubscribe: true },
  { object: 'lead', trigger: 'record_create', subscribee: 'creator', canUnsubscribe: true },
  { object: 'lead', trigger: 'record_assign', subscribee: 'owner', canUnsubscribe: true },
  { object: 'case', trigger: 'record_create', subscribee: 'creator', canUnsubscribe: false },
  { object: 'case', trigger: 'record_assign', subscribee: 'owner', canUnsubscribe: false },
  { object: 'case', trigger: 'comment', subscribee: 'commenter', canUnsubscribe: true },
  { object: 'contact', trigger: 'record_create', subscribee: 'creator', canUnsubscribe: true },
  { object: 'contract', trigger: 'record_create', subscribee: 'creator', canUnsubscribe: true },
  { object: 'contract', trigger: 'record_assign', subscribee: 'owner', canUnsubscribe: false },
  { object: 'campaign', trigger: 'record_create', subscribee: 'creator', canUnsubscribe: true },
  { object: 'quote', trigger: 'record_create', subscribee: 'creator', canUnsubscribe: true },
];

// ---------------------------------------------------------------------------
// Service Contract Type Re-exports
// ---------------------------------------------------------------------------

export type {
  IFeedService,
  ListFeedOptions,
  CreateFeedItemInput,
  UpdateFeedItemInput,
  SubscribeInput,
  FeedListResult,
};

// ---------------------------------------------------------------------------
// Aggregate Export
// ---------------------------------------------------------------------------

export const FeedServiceContract = {
  enabledObjects: FEED_ENABLED_OBJECTS,
  defaultConfig: DEFAULT_FEED_CONFIG,
  permissionRules: FEED_PERMISSION_RULES,
  autoSubscriptionRules: AUTO_SUBSCRIPTION_RULES,
} as const;

export default FeedServiceContract;
