import type { Reaction, Mention, FieldChangeEntry } from '@objectstack/spec/data';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';

/**
 * Marketing Feed Configuration
 * Activity feed configurations for Campaign, Lead, Journey
 */

// --- Feed Item Configurations ---

export const CampaignLaunchFeedItem = {
  id: 'mkt-fi-001',
  type: 'record_create' as const,
  actor: { type: 'user' as const, id: 'u-mktg-mgr-01', name: 'Olivia Turner' },
  object: 'campaign',
  recordId: 'camp-0025',
  body: 'Campaign "Spring Product Launch 2027" activated. Target audience: 45,000 contacts across NA and EMEA.',
  visibility: 'public' as const,
  createdAt: '2027-03-01T08:00:00Z',
};

export const LeadScoringFeedItem = {
  id: 'mkt-fi-002',
  type: 'field_change' as const,
  actor: { type: 'user' as const, id: 'u-system', name: 'System' },
  object: 'lead',
  recordId: 'lead-0410',
  body: 'Lead score updated based on webinar attendance and email engagement.',
  visibility: 'public' as const,
  createdAt: '2027-03-05T12:00:00Z',
};

export const JourneyCommentFeedItem = {
  id: 'mkt-fi-003',
  type: 'comment' as const,
  actor: { type: 'user' as const, id: 'u-mktg-ops-01', name: 'Marcus Johnson' },
  object: 'journey',
  recordId: 'jrn-0011',
  body: 'Adjusted email cadence from 3-day to 5-day intervals based on A/B test results showing higher open rates.',
  visibility: 'public' as const,
  createdAt: '2027-03-08T15:30:00Z',
};

export const CampaignEmailFeedItem = {
  id: 'mkt-fi-004',
  type: 'email' as const,
  actor: { type: 'user' as const, id: 'u-mktg-mgr-01', name: 'Olivia Turner' },
  object: 'campaign',
  recordId: 'camp-0025',
  body: 'Blast email sent to 12,500 opted-in subscribers. Subject: "Introducing Our Latest Innovation".',
  visibility: 'public' as const,
  createdAt: '2027-03-10T10:00:00Z',
};

export const LeadConversionFeedItem = {
  id: 'mkt-fi-005',
  type: 'system' as const,
  actor: { type: 'user' as const, id: 'u-system', name: 'System' },
  object: 'lead',
  recordId: 'lead-0410',
  body: 'Lead converted to Contact and Opportunity. Source campaign: Spring Product Launch 2027.',
  visibility: 'public' as const,
  createdAt: '2027-03-15T09:00:00Z',
};

// --- Reaction Configurations ---

export const RocketReaction = {
  emoji: '🚀',
  userIds: ['u-mktg-mgr-01', 'u-mktg-ops-01'],
  count: 2,
} satisfies Reaction;

export const TargetReaction = {
  emoji: '🎯',
  userIds: ['u-mktg-ops-01'],
  count: 1,
} satisfies Reaction;

export const FireReaction = {
  emoji: '🔥',
  userIds: ['u-mktg-mgr-01', 'u-mktg-ops-01', 'u-sales-rep-01'],
  count: 3,
} satisfies Reaction;

// --- Mention Configurations ---

export const MarketingManagerMention = {
  type: 'user' as const,
  id: 'u-mktg-mgr-01',
  name: 'Olivia Turner',
  offset: 0,
  length: 13,
} satisfies Mention;

export const MarketingOpsMention = {
  type: 'user' as const,
  id: 'u-mktg-ops-01',
  name: 'Marcus Johnson',
  offset: 18,
  length: 14,
} satisfies Mention;

// --- Record Subscriptions ---

export const CampaignOwnerSubscription = {
  object: 'campaign',
  recordId: 'camp-0025',
  userId: 'u-mktg-mgr-01',
  events: ['all'],
  createdAt: '2027-03-01T08:00:00Z',
};

export const LeadNurtureSubscription = {
  object: 'lead',
  recordId: 'lead-0410',
  userId: 'u-mktg-ops-01',
  events: ['field_change', 'comment'],
  createdAt: '2027-03-02T09:00:00Z',
};

export const JourneyDesignerSubscription = {
  object: 'journey',
  recordId: 'jrn-0011',
  userId: 'u-mktg-ops-01',
  events: ['comment', 'field_change', 'mention'],
  createdAt: '2027-02-15T10:00:00Z',
};

// --- Field Change Entries ---

export const LeadScoreChange = {
  field: 'lead_score',
  oldValue: '45',
  newValue: '82',
} satisfies FieldChangeEntry;

export const CampaignStatusChange = {
  field: 'status',
  oldValue: 'draft',
  newValue: 'active',
} satisfies FieldChangeEntry;

export const JourneyCadenceChange = {
  field: 'email_cadence_days',
  oldValue: '3',
  newValue: '5',
} satisfies FieldChangeEntry;

// --- Schema Validation ---

FeedItemSchema.parse(CampaignLaunchFeedItem);
FeedItemSchema.parse(LeadScoringFeedItem);
FeedItemSchema.parse(JourneyCommentFeedItem);
FeedItemSchema.parse(CampaignEmailFeedItem);
FeedItemSchema.parse(LeadConversionFeedItem);

ReactionSchema.parse(RocketReaction);
ReactionSchema.parse(TargetReaction);
ReactionSchema.parse(FireReaction);

MentionSchema.parse(MarketingManagerMention);
MentionSchema.parse(MarketingOpsMention);

RecordSubscriptionSchema.parse(CampaignOwnerSubscription);
RecordSubscriptionSchema.parse(LeadNurtureSubscription);
RecordSubscriptionSchema.parse(JourneyDesignerSubscription);

FieldChangeEntrySchema.parse(LeadScoreChange);
FieldChangeEntrySchema.parse(CampaignStatusChange);
FieldChangeEntrySchema.parse(JourneyCadenceChange);

// --- Aggregate Export ---

export const MarketingFeedConfig = {
  feedItems: [
    CampaignLaunchFeedItem,
    LeadScoringFeedItem,
    JourneyCommentFeedItem,
    CampaignEmailFeedItem,
    LeadConversionFeedItem,
  ],
  reactions: [RocketReaction, TargetReaction, FireReaction],
  mentions: [MarketingManagerMention, MarketingOpsMention],
  subscriptions: [CampaignOwnerSubscription, LeadNurtureSubscription, JourneyDesignerSubscription],
  fieldChanges: [LeadScoreChange, CampaignStatusChange, JourneyCadenceChange],
};

export default MarketingFeedConfig;
