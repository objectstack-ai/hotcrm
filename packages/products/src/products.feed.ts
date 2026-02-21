import type { Reaction, Mention, FieldChangeEntry } from '@objectstack/spec/data';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';

/**
 * Products Feed Configuration
 * Activity feed configurations for Product, Price Book, Quote Line
 */

// --- Feed Item Configurations ---

export const ProductLaunchFeedItem = {
  id: 'prod-fi-001',
  type: 'record_create' as const,
  actor: { type: 'user' as const, id: 'u-prod-mgr-01', name: 'Natalie Brooks' },
  object: 'product',
  recordId: 'prod-0056',
  body: 'New product created: "Enterprise AI Suite v3.0". Category: Software. Available in all regions.',
  visibility: 'public' as const,
  createdAt: '2027-06-01T09:00:00Z',
};

export const PriceBookUpdateFeedItem = {
  id: 'prod-fi-002',
  type: 'field_change' as const,
  actor: { type: 'user' as const, id: 'u-pricing-01', name: 'Steven Hayes' },
  object: 'price_book',
  recordId: 'pb-0008',
  body: 'Updated EMEA price book with Q3 2027 pricing adjustments. 12 products affected.',
  visibility: 'public' as const,
  createdAt: '2027-06-05T14:00:00Z',
};

export const QuoteLineCommentFeedItem = {
  id: 'prod-fi-003',
  type: 'comment' as const,
  actor: { type: 'user' as const, id: 'u-sales-rep-04', name: 'Hannah Wright' },
  object: 'quote_line',
  recordId: 'ql-0234',
  body: 'Applied partner discount tier 2 (20%) as per agreement MSA-2027-045. Margin remains above threshold.',
  visibility: 'public' as const,
  createdAt: '2027-06-08T11:30:00Z',
};

export const ProductDeprecationFeedItem = {
  id: 'prod-fi-004',
  type: 'system' as const,
  actor: { type: 'user' as const, id: 'u-system', name: 'System' },
  object: 'product',
  recordId: 'prod-0032',
  body: 'Product "Legacy Connector v1.x" marked as end-of-life. Effective date: 2027-09-30.',
  visibility: 'public' as const,
  createdAt: '2027-06-10T08:00:00Z',
};

export const PriceBookApprovalFeedItem = {
  id: 'prod-fi-005',
  type: 'approval' as const,
  actor: { type: 'user' as const, id: 'u-vp-sales-01', name: 'Michael Grant' },
  object: 'price_book',
  recordId: 'pb-0008',
  body: 'EMEA price book Q3 adjustments approved. Changes will be effective 2027-07-01.',
  visibility: 'public' as const,
  createdAt: '2027-06-12T16:00:00Z',
};

// --- Reaction Configurations ---

export const ThumbsUpReaction = {
  emoji: '👍',
  userIds: ['u-prod-mgr-01', 'u-pricing-01'],
  count: 2,
} satisfies Reaction;

export const MoneyReaction = {
  emoji: '💰',
  userIds: ['u-sales-rep-04', 'u-vp-sales-01'],
  count: 2,
} satisfies Reaction;

export const RocketReaction = {
  emoji: '🚀',
  userIds: ['u-prod-mgr-01', 'u-pricing-01', 'u-sales-rep-04'],
  count: 3,
} satisfies Reaction;

// --- Mention Configurations ---

export const ProductManagerMention = {
  type: 'user' as const,
  id: 'u-prod-mgr-01',
  name: 'Natalie Brooks',
  offset: 0,
  length: 14,
} satisfies Mention;

export const PricingAnalystMention = {
  type: 'user' as const,
  id: 'u-pricing-01',
  name: 'Steven Hayes',
  offset: 19,
  length: 12,
} satisfies Mention;

// --- Record Subscriptions ---

export const ProductOwnerSubscription = {
  object: 'product',
  recordId: 'prod-0056',
  userId: 'u-prod-mgr-01',
  events: ['all'],
  createdAt: '2027-06-01T09:00:00Z',
};

export const PriceBookPricingSubscription = {
  object: 'price_book',
  recordId: 'pb-0008',
  userId: 'u-pricing-01',
  events: ['field_change', 'approval', 'comment'],
  createdAt: '2027-05-01T08:00:00Z',
};

export const QuoteLineSalesSubscription = {
  object: 'quote_line',
  recordId: 'ql-0234',
  userId: 'u-sales-rep-04',
  events: ['comment', 'field_change'],
  createdAt: '2027-06-07T10:00:00Z',
};

// --- Field Change Entries ---

export const ProductStatusChange = {
  field: 'status',
  oldValue: 'active',
  newValue: 'end_of_life',
} satisfies FieldChangeEntry;

export const PriceBookEntryPriceChange = {
  field: 'unit_price',
  oldValue: '299.00',
  newValue: '349.00',
} satisfies FieldChangeEntry;

export const QuoteLineDiscountChange = {
  field: 'discount_percent',
  oldValue: '10',
  newValue: '20',
} satisfies FieldChangeEntry;

// --- Schema Validation ---

FeedItemSchema.parse(ProductLaunchFeedItem);
FeedItemSchema.parse(PriceBookUpdateFeedItem);
FeedItemSchema.parse(QuoteLineCommentFeedItem);
FeedItemSchema.parse(ProductDeprecationFeedItem);
FeedItemSchema.parse(PriceBookApprovalFeedItem);

ReactionSchema.parse(ThumbsUpReaction);
ReactionSchema.parse(MoneyReaction);
ReactionSchema.parse(RocketReaction);

MentionSchema.parse(ProductManagerMention);
MentionSchema.parse(PricingAnalystMention);

RecordSubscriptionSchema.parse(ProductOwnerSubscription);
RecordSubscriptionSchema.parse(PriceBookPricingSubscription);
RecordSubscriptionSchema.parse(QuoteLineSalesSubscription);

FieldChangeEntrySchema.parse(ProductStatusChange);
FieldChangeEntrySchema.parse(PriceBookEntryPriceChange);
FieldChangeEntrySchema.parse(QuoteLineDiscountChange);

// --- Aggregate Export ---

export const ProductsFeedConfig = {
  feedItems: [
    ProductLaunchFeedItem,
    PriceBookUpdateFeedItem,
    QuoteLineCommentFeedItem,
    ProductDeprecationFeedItem,
    PriceBookApprovalFeedItem,
  ],
  reactions: [ThumbsUpReaction, MoneyReaction, RocketReaction],
  mentions: [ProductManagerMention, PricingAnalystMention],
  subscriptions: [ProductOwnerSubscription, PriceBookPricingSubscription, QuoteLineSalesSubscription],
  fieldChanges: [ProductStatusChange, PriceBookEntryPriceChange, QuoteLineDiscountChange],
};

export default ProductsFeedConfig;
