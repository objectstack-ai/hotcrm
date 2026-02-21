import type { Reaction, Mention, FieldChangeEntry } from '@objectstack/spec/data';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';

/**
 * Finance Feed Configuration
 * Activity feed configurations for Contract, Invoice, Quote
 */

// --- Feed Item Configurations ---

export const ContractApprovalFeedItem = {
  id: 'fin-fi-001',
  type: 'approval' as const,
  actor: { type: 'user' as const, id: 'u-legal-01', name: 'Diana Foster' },
  object: 'contract',
  recordId: 'ctr-0012',
  body: 'Contract approved after legal review. Terms updated to include 90-day termination clause.',
  visibility: 'public' as const,
  createdAt: '2027-04-01T11:00:00Z',
};

export const InvoiceFieldChangeFeedItem = {
  id: 'fin-fi-002',
  type: 'field_change' as const,
  actor: { type: 'user' as const, id: 'u-finance-01', name: 'Robert Chang' },
  object: 'invoice',
  recordId: 'inv-0087',
  body: 'Adjusted invoice amount to reflect early payment discount.',
  visibility: 'public' as const,
  createdAt: '2027-04-02T09:30:00Z',
};

export const QuoteCommentFeedItem = {
  id: 'fin-fi-003',
  type: 'comment' as const,
  actor: { type: 'user' as const, id: 'u-sales-rep-03', name: 'Liam Torres' },
  object: 'quote',
  recordId: 'qt-0034',
  body: 'Customer requested volume discount. Updated pricing tiers to reflect 15% discount on 100+ units.',
  visibility: 'public' as const,
  createdAt: '2027-04-03T14:15:00Z',
};

export const ContractRenewalFeedItem = {
  id: 'fin-fi-004',
  type: 'system' as const,
  actor: { type: 'user' as const, id: 'u-system', name: 'System' },
  object: 'contract',
  recordId: 'ctr-0008',
  body: 'Auto-renewal triggered for contract. New term: 2027-07-01 to 2028-06-30.',
  visibility: 'public' as const,
  createdAt: '2027-04-05T00:01:00Z',
};

export const InvoiceEmailFeedItem = {
  id: 'fin-fi-005',
  type: 'email' as const,
  actor: { type: 'user' as const, id: 'u-finance-02', name: 'Nina Patel' },
  object: 'invoice',
  recordId: 'inv-0092',
  body: 'Payment reminder sent to customer. Invoice overdue by 15 days.',
  visibility: 'public' as const,
  createdAt: '2027-04-06T08:00:00Z',
};

// --- Reaction Configurations ---

export const ApprovalReaction = {
  emoji: '✅',
  userIds: ['u-legal-01', 'u-finance-01'],
  count: 2,
} satisfies Reaction;

export const AlertReaction = {
  emoji: '⚠️',
  userIds: ['u-finance-02'],
  count: 1,
} satisfies Reaction;

export const ThumbsUpReaction = {
  emoji: '👍',
  userIds: ['u-sales-rep-03', 'u-finance-01', 'u-legal-01'],
  count: 3,
} satisfies Reaction;

// --- Mention Configurations ---

export const FinanceManagerMention = {
  type: 'user' as const,
  id: 'u-finance-01',
  name: 'Robert Chang',
  offset: 0,
  length: 13,
} satisfies Mention;

export const LegalCounselMention = {
  type: 'user' as const,
  id: 'u-legal-01',
  name: 'Diana Foster',
  offset: 18,
  length: 13,
} satisfies Mention;

// --- Record Subscriptions ---

export const ContractOwnerSubscription = {
  object: 'contract',
  recordId: 'ctr-0012',
  userId: 'u-legal-01',
  events: ['all'],
  createdAt: '2027-01-15T08:00:00Z',
};

export const InvoiceAccountingSubscription = {
  object: 'invoice',
  recordId: 'inv-0087',
  userId: 'u-finance-01',
  events: ['field_change', 'approval'],
  createdAt: '2027-03-10T09:00:00Z',
};

export const QuoteSalesSubscription = {
  object: 'quote',
  recordId: 'qt-0034',
  userId: 'u-sales-rep-03',
  events: ['comment', 'approval', 'field_change'],
  createdAt: '2027-03-20T10:00:00Z',
};

// --- Field Change Entries ---

export const InvoiceAmountChange = {
  field: 'total_amount',
  oldValue: '50000',
  newValue: '47500',
} satisfies FieldChangeEntry;

export const ContractStatusChange = {
  field: 'status',
  oldValue: 'pending_approval',
  newValue: 'active',
} satisfies FieldChangeEntry;

export const QuoteDiscountChange = {
  field: 'discount_percent',
  oldValue: '10',
  newValue: '15',
} satisfies FieldChangeEntry;

// --- Schema Validation ---

FeedItemSchema.parse(ContractApprovalFeedItem);
FeedItemSchema.parse(InvoiceFieldChangeFeedItem);
FeedItemSchema.parse(QuoteCommentFeedItem);
FeedItemSchema.parse(ContractRenewalFeedItem);
FeedItemSchema.parse(InvoiceEmailFeedItem);

ReactionSchema.parse(ApprovalReaction);
ReactionSchema.parse(AlertReaction);
ReactionSchema.parse(ThumbsUpReaction);

MentionSchema.parse(FinanceManagerMention);
MentionSchema.parse(LegalCounselMention);

RecordSubscriptionSchema.parse(ContractOwnerSubscription);
RecordSubscriptionSchema.parse(InvoiceAccountingSubscription);
RecordSubscriptionSchema.parse(QuoteSalesSubscription);

FieldChangeEntrySchema.parse(InvoiceAmountChange);
FieldChangeEntrySchema.parse(ContractStatusChange);
FieldChangeEntrySchema.parse(QuoteDiscountChange);

// --- Aggregate Export ---

export const FinanceFeedConfig = {
  feedItems: [
    ContractApprovalFeedItem,
    InvoiceFieldChangeFeedItem,
    QuoteCommentFeedItem,
    ContractRenewalFeedItem,
    InvoiceEmailFeedItem,
  ],
  reactions: [ApprovalReaction, AlertReaction, ThumbsUpReaction],
  mentions: [FinanceManagerMention, LegalCounselMention],
  subscriptions: [ContractOwnerSubscription, InvoiceAccountingSubscription, QuoteSalesSubscription],
  fieldChanges: [InvoiceAmountChange, ContractStatusChange, QuoteDiscountChange],
};

export default FinanceFeedConfig;
