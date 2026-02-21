import type { Reaction, Mention, FieldChangeEntry } from '@objectstack/spec/data';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';

/**
 * Support Feed Configuration
 * Activity feed configurations for Case, Knowledge Article, SLA
 */

// --- Feed Item Configurations ---

export const CaseEscalationFeedItem = {
  id: 'sup-fi-001',
  type: 'field_change' as const,
  actor: { type: 'user' as const, id: 'u-support-mgr-01', name: 'Rachel Kim' },
  object: 'case',
  recordId: 'case-0320',
  body: 'Case escalated to Tier 2 support. Priority raised to Critical due to production outage impact.',
  visibility: 'public' as const,
  createdAt: '2027-05-01T08:15:00Z',
};

export const KnowledgeArticleCommentFeedItem = {
  id: 'sup-fi-002',
  type: 'comment' as const,
  actor: { type: 'user' as const, id: 'u-support-eng-01', name: 'Tom Bradley' },
  object: 'knowledge_article',
  recordId: 'ka-0089',
  body: 'Updated troubleshooting steps for SSO integration. Added section for SAML 2.0 configuration.',
  visibility: 'public' as const,
  createdAt: '2027-05-02T10:30:00Z',
};

export const SlaBreachFeedItem = {
  id: 'sup-fi-003',
  type: 'system' as const,
  actor: { type: 'user' as const, id: 'u-system', name: 'System' },
  object: 'sla',
  recordId: 'sla-0015',
  body: 'SLA first response time breached for Case #case-0320. Elapsed: 4h 15m. Target: 4h.',
  visibility: 'public' as const,
  createdAt: '2027-05-01T12:30:00Z',
};

export const CaseResolutionFeedItem = {
  id: 'sup-fi-004',
  type: 'note' as const,
  actor: { type: 'user' as const, id: 'u-support-eng-02', name: 'Yuki Tanaka' },
  object: 'case',
  recordId: 'case-0320',
  body: 'Root cause identified: misconfigured load balancer rule. Applied fix and verified with customer.',
  visibility: 'public' as const,
  createdAt: '2027-05-01T16:45:00Z',
};

export const CaseCallFeedItem = {
  id: 'sup-fi-005',
  type: 'call' as const,
  actor: { type: 'user' as const, id: 'u-support-eng-01', name: 'Tom Bradley' },
  object: 'case',
  recordId: 'case-0325',
  body: 'Called customer to gather additional details. Issue is intermittent — occurs during peak traffic hours only.',
  visibility: 'public' as const,
  createdAt: '2027-05-03T14:00:00Z',
};

// --- Reaction Configurations ---

export const ThumbsUpReaction = {
  emoji: '👍',
  userIds: ['u-support-mgr-01', 'u-support-eng-02'],
  count: 2,
} satisfies Reaction;

export const ClappingReaction = {
  emoji: '👏',
  userIds: ['u-support-mgr-01', 'u-support-eng-01', 'u-support-eng-02'],
  count: 3,
} satisfies Reaction;

export const WarningReaction = {
  emoji: '🚨',
  userIds: ['u-support-mgr-01'],
  count: 1,
} satisfies Reaction;

// --- Mention Configurations ---

export const SupportManagerMention = {
  type: 'user' as const,
  id: 'u-support-mgr-01',
  name: 'Rachel Kim',
  offset: 0,
  length: 10,
} satisfies Mention;

export const SupportEngineerMention = {
  type: 'user' as const,
  id: 'u-support-eng-02',
  name: 'Yuki Tanaka',
  offset: 15,
  length: 11,
} satisfies Mention;

// --- Record Subscriptions ---

export const CaseOwnerSubscription = {
  object: 'case',
  recordId: 'case-0320',
  userId: 'u-support-eng-02',
  events: ['all'],
  createdAt: '2027-05-01T08:15:00Z',
};

export const KnowledgeArticleAuthorSubscription = {
  object: 'knowledge_article',
  recordId: 'ka-0089',
  userId: 'u-support-eng-01',
  events: ['comment', 'field_change'],
  createdAt: '2027-04-01T09:00:00Z',
};

export const SlaManagerSubscription = {
  object: 'sla',
  recordId: 'sla-0015',
  userId: 'u-support-mgr-01',
  events: ['task', 'field_change'],
  createdAt: '2027-01-01T08:00:00Z',
};

// --- Field Change Entries ---

export const CasePriorityChange = {
  field: 'priority',
  oldValue: 'high',
  newValue: 'critical',
} satisfies FieldChangeEntry;

export const CaseStatusChange = {
  field: 'status',
  oldValue: 'in_progress',
  newValue: 'resolved',
} satisfies FieldChangeEntry;

export const KnowledgeArticleStatusChange = {
  field: 'publish_status',
  oldValue: 'draft',
  newValue: 'published',
} satisfies FieldChangeEntry;

// --- Schema Validation ---

FeedItemSchema.parse(CaseEscalationFeedItem);
FeedItemSchema.parse(KnowledgeArticleCommentFeedItem);
FeedItemSchema.parse(SlaBreachFeedItem);
FeedItemSchema.parse(CaseResolutionFeedItem);
FeedItemSchema.parse(CaseCallFeedItem);

ReactionSchema.parse(ThumbsUpReaction);
ReactionSchema.parse(ClappingReaction);
ReactionSchema.parse(WarningReaction);

MentionSchema.parse(SupportManagerMention);
MentionSchema.parse(SupportEngineerMention);

RecordSubscriptionSchema.parse(CaseOwnerSubscription);
RecordSubscriptionSchema.parse(KnowledgeArticleAuthorSubscription);
RecordSubscriptionSchema.parse(SlaManagerSubscription);

FieldChangeEntrySchema.parse(CasePriorityChange);
FieldChangeEntrySchema.parse(CaseStatusChange);
FieldChangeEntrySchema.parse(KnowledgeArticleStatusChange);

// --- Aggregate Export ---

export const SupportFeedConfig = {
  feedItems: [
    CaseEscalationFeedItem,
    KnowledgeArticleCommentFeedItem,
    SlaBreachFeedItem,
    CaseResolutionFeedItem,
    CaseCallFeedItem,
  ],
  reactions: [ThumbsUpReaction, ClappingReaction, WarningReaction],
  mentions: [SupportManagerMention, SupportEngineerMention],
  subscriptions: [CaseOwnerSubscription, KnowledgeArticleAuthorSubscription, SlaManagerSubscription],
  fieldChanges: [CasePriorityChange, CaseStatusChange, KnowledgeArticleStatusChange],
};

export default SupportFeedConfig;
