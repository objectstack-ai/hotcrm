import type { Reaction, Mention, FieldChangeEntry } from '@objectstack/spec/data';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';

/**
 * CRM Feed Configuration
 * Activity feed configurations for Account, Opportunity, Contact, Lead, Case
 */

// --- Feed Item Configurations ---

export const AccountCommentFeedItem = {
  id: 'crm-fi-001',
  type: 'comment' as const,
  actor: { type: 'user' as const, id: 'u-sales-rep-01', name: 'Sarah Chen' },
  object: 'account',
  recordId: 'acc-0001',
  body: 'Completed annual review with Acme Corp. They are expanding into APAC and may need additional licenses next quarter.',
  visibility: 'public' as const,
  createdAt: '2027-03-15T09:30:00Z',
};

export const OpportunityFieldChangeFeedItem = {
  id: 'crm-fi-002',
  type: 'field_change' as const,
  actor: { type: 'user' as const, id: 'u-sales-mgr-01', name: 'James Rodriguez' },
  object: 'opportunity',
  recordId: 'opp-0042',
  body: 'Updated opportunity stage and amount after negotiation call.',
  visibility: 'public' as const,
  createdAt: '2027-03-15T14:22:00Z',
};

export const ContactEmailFeedItem = {
  id: 'crm-fi-003',
  type: 'email' as const,
  actor: { type: 'user' as const, id: 'u-sales-rep-02', name: 'Emily Park' },
  object: 'contact',
  recordId: 'con-0088',
  body: 'Sent follow-up email regarding the product demo scheduled for next week.',
  visibility: 'public' as const,
  createdAt: '2027-03-16T10:15:00Z',
};

export const LeadTaskFeedItem = {
  id: 'crm-fi-004',
  type: 'task' as const,
  actor: { type: 'user' as const, id: 'u-sdr-01', name: 'Alex Kim' },
  object: 'lead',
  recordId: 'lead-0201',
  body: 'Created task: Qualify inbound lead from webinar registration.',
  visibility: 'public' as const,
  createdAt: '2027-03-16T11:00:00Z',
};

export const CaseNoteFeedItem = {
  id: 'crm-fi-005',
  type: 'note' as const,
  actor: { type: 'user' as const, id: 'u-support-01', name: 'Maria Santos' },
  object: 'case',
  recordId: 'case-0155',
  body: 'Customer confirmed the issue is resolved after applying the hotfix. Closing case.',
  visibility: 'public' as const,
  createdAt: '2027-03-17T08:45:00Z',
};

// --- Reaction Configurations ---

export const ThumbsUpReaction = {
  emoji: '👍',
  userIds: ['u-sales-rep-01', 'u-sales-mgr-01'],
  count: 2,
} satisfies Reaction;

export const CelebrationReaction = {
  emoji: '🎉',
  userIds: ['u-sales-rep-02', 'u-sdr-01', 'u-sales-mgr-01'],
  count: 3,
} satisfies Reaction;

export const HeartReaction = {
  emoji: '❤️',
  userIds: ['u-support-01'],
  count: 1,
} satisfies Reaction;

// --- Mention Configurations ---

export const AccountOwnerMention = {
  type: 'user' as const,
  id: 'u-sales-mgr-01',
  name: 'James Rodriguez',
  offset: 0,
  length: 16,
} satisfies Mention;

export const SalesTeamMention = {
  type: 'user' as const,
  id: 'u-sales-rep-01',
  name: 'Sarah Chen',
  offset: 22,
  length: 10,
} satisfies Mention;

// --- Record Subscriptions ---

export const AccountOwnerSubscription = {
  object: 'account',
  recordId: 'acc-0001',
  userId: 'u-sales-rep-01',
  events: ['all'],
  createdAt: '2027-01-10T08:00:00Z',
};

export const OpportunityWatcherSubscription = {
  object: 'opportunity',
  recordId: 'opp-0042',
  userId: 'u-sales-mgr-01',
  events: ['field_change', 'comment'],
  createdAt: '2027-02-20T09:00:00Z',
};

export const CaseEscalationSubscription = {
  object: 'case',
  recordId: 'case-0155',
  userId: 'u-support-01',
  events: ['comment', 'field_change', 'approval'],
  createdAt: '2027-03-01T10:00:00Z',
};

// --- Field Change Entries ---

export const OpportunityAmountChange = {
  field: 'amount',
  oldValue: '75000',
  newValue: '120000',
} satisfies FieldChangeEntry;

export const OpportunityStageChange = {
  field: 'stage',
  oldValue: 'proposal',
  newValue: 'negotiation',
} satisfies FieldChangeEntry;

export const LeadStatusChange = {
  field: 'status',
  oldValue: 'new',
  newValue: 'qualified',
} satisfies FieldChangeEntry;

// --- Schema Validation ---

FeedItemSchema.parse(AccountCommentFeedItem);
FeedItemSchema.parse(OpportunityFieldChangeFeedItem);
FeedItemSchema.parse(ContactEmailFeedItem);
FeedItemSchema.parse(LeadTaskFeedItem);
FeedItemSchema.parse(CaseNoteFeedItem);

ReactionSchema.parse(ThumbsUpReaction);
ReactionSchema.parse(CelebrationReaction);
ReactionSchema.parse(HeartReaction);

MentionSchema.parse(AccountOwnerMention);
MentionSchema.parse(SalesTeamMention);

RecordSubscriptionSchema.parse(AccountOwnerSubscription);
RecordSubscriptionSchema.parse(OpportunityWatcherSubscription);
RecordSubscriptionSchema.parse(CaseEscalationSubscription);

FieldChangeEntrySchema.parse(OpportunityAmountChange);
FieldChangeEntrySchema.parse(OpportunityStageChange);
FieldChangeEntrySchema.parse(LeadStatusChange);

// --- Aggregate Export ---

export const CrmFeedConfig = {
  feedItems: [
    AccountCommentFeedItem,
    OpportunityFieldChangeFeedItem,
    ContactEmailFeedItem,
    LeadTaskFeedItem,
    CaseNoteFeedItem,
  ],
  reactions: [ThumbsUpReaction, CelebrationReaction, HeartReaction],
  mentions: [AccountOwnerMention, SalesTeamMention],
  subscriptions: [AccountOwnerSubscription, OpportunityWatcherSubscription, CaseEscalationSubscription],
  fieldChanges: [OpportunityAmountChange, OpportunityStageChange, LeadStatusChange],
};

export default CrmFeedConfig;
