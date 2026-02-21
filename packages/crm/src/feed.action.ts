/**
 * Feed API Action Definitions
 *
 * Defines Feed API endpoint configurations for the CRM package.
 * Covers feed CRUD, reactions, and subscriptions using @objectstack/spec/api schemas.
 */

import {
  CreateFeedItemRequestSchema,
  CreateFeedItemResponseSchema,
  UpdateFeedItemRequestSchema,
  UpdateFeedItemResponseSchema,
  DeleteFeedItemRequestSchema,
  DeleteFeedItemResponseSchema,
  GetFeedRequestSchema,
  GetFeedResponseSchema,
  AddReactionRequestSchema,
  AddReactionResponseSchema,
  RemoveReactionRequestSchema,
  RemoveReactionResponseSchema,
  SubscribeRequestSchema,
  SubscribeResponseSchema,
  FeedUnsubscribeRequestSchema,
  UnsubscribeResponseSchema,
  FeedPathParamsSchema,
  FeedItemPathParamsSchema,
  FeedApiContracts,
  FeedApiErrorCode,
} from '@objectstack/spec/api';

// ---------------------------------------------------------------------------
// Path Parameter Validation
// ---------------------------------------------------------------------------

export const feedPath = FeedPathParamsSchema.parse({
  object: 'account',
  recordId: 'rec_example',
});

export const feedItemPath = FeedItemPathParamsSchema.parse({
  object: 'account',
  recordId: 'rec_example',
  feedId: 'fi-001',
});

// ---------------------------------------------------------------------------
// List Feed
// ---------------------------------------------------------------------------

export const listFeedRequest = GetFeedRequestSchema.parse({
  object: 'account',
  recordId: 'rec_example',
});

export const listFeedResponse = GetFeedResponseSchema.parse({
  success: true,
  data: { items: [], total: 0, hasMore: false },
});

// ---------------------------------------------------------------------------
// Create Feed Item
// ---------------------------------------------------------------------------

export const createFeedItemRequest = CreateFeedItemRequestSchema.parse({
  type: 'comment',
  object: 'account',
  recordId: 'rec_example',
  body: 'Initial outreach completed. Decision-maker identified.',
});

export const createFeedItemResponse = CreateFeedItemResponseSchema.parse({
  success: true,
  data: {
    id: 'fi-001',
    type: 'comment',
    object: 'account',
    recordId: 'rec_example',
    body: 'Initial outreach completed. Decision-maker identified.',
    actor: { type: 'user', id: 'u-001', name: 'Sales Rep' },
    visibility: 'public',
    createdAt: '2027-06-01T10:00:00Z',
  },
});

// ---------------------------------------------------------------------------
// Update Feed Item
// ---------------------------------------------------------------------------

export const updateFeedItemRequest = UpdateFeedItemRequestSchema.parse({
  object: 'account',
  recordId: 'rec_example',
  feedId: 'fi-001',
  body: 'Updated: follow-up meeting scheduled for next week.',
});

export const updateFeedItemResponse = UpdateFeedItemResponseSchema.parse({
  success: true,
  data: {
    id: 'fi-001',
    type: 'comment',
    object: 'account',
    recordId: 'rec_example',
    body: 'Updated: follow-up meeting scheduled for next week.',
    actor: { type: 'user', id: 'u-001', name: 'Sales Rep' },
    visibility: 'public',
    createdAt: '2027-06-01T10:00:00Z',
  },
});

// ---------------------------------------------------------------------------
// Delete Feed Item
// ---------------------------------------------------------------------------

export const deleteFeedItemRequest = DeleteFeedItemRequestSchema.parse({
  object: 'account',
  recordId: 'rec_example',
  feedId: 'fi-001',
});

export const deleteFeedItemResponse = DeleteFeedItemResponseSchema.parse({
  success: true,
  data: { feedId: 'fi-001' },
});

// ---------------------------------------------------------------------------
// Add Reaction
// ---------------------------------------------------------------------------

export const addReactionRequest = AddReactionRequestSchema.parse({
  object: 'account',
  recordId: 'rec_example',
  feedId: 'fi-001',
  emoji: '👍',
});

export const addReactionResponse = AddReactionResponseSchema.parse({
  success: true,
  data: { reactions: [{ emoji: '👍', userIds: ['u-001'], count: 1 }] },
});

// ---------------------------------------------------------------------------
// Remove Reaction
// ---------------------------------------------------------------------------

export const removeReactionRequest = RemoveReactionRequestSchema.parse({
  object: 'account',
  recordId: 'rec_example',
  feedId: 'fi-001',
  emoji: '👍',
});

export const removeReactionResponse = RemoveReactionResponseSchema.parse({
  success: true,
  data: { reactions: [] },
});

// ---------------------------------------------------------------------------
// Subscribe
// ---------------------------------------------------------------------------

export const subscribeRequest = SubscribeRequestSchema.parse({
  object: 'account',
  recordId: 'rec_example',
});

export const subscribeResponse = SubscribeResponseSchema.parse({
  success: true,
  data: { object: 'account', recordId: 'rec_example', userId: 'u-001', createdAt: '2027-06-01T10:00:00Z' },
});

// ---------------------------------------------------------------------------
// Unsubscribe
// ---------------------------------------------------------------------------

export const unsubscribeRequest = FeedUnsubscribeRequestSchema.parse({
  object: 'account',
  recordId: 'rec_example',
});

export const unsubscribeResponse = UnsubscribeResponseSchema.parse({
  success: true,
  data: { object: 'account', recordId: 'rec_example', unsubscribed: true },
});

// ---------------------------------------------------------------------------
// Error Codes
// ---------------------------------------------------------------------------

/** Feed API error codes for CRM-specific error handling */
export const feedErrorCodes = {
  itemNotFound: FeedApiErrorCode.parse('feed_item_not_found'),
  permissionDenied: FeedApiErrorCode.parse('feed_permission_denied'),
  notEditable: FeedApiErrorCode.parse('feed_item_not_editable'),
  invalidParent: FeedApiErrorCode.parse('feed_invalid_parent'),
  reactionExists: FeedApiErrorCode.parse('reaction_already_exists'),
  reactionNotFound: FeedApiErrorCode.parse('reaction_not_found'),
  subscriptionExists: FeedApiErrorCode.parse('subscription_already_exists'),
  subscriptionNotFound: FeedApiErrorCode.parse('subscription_not_found'),
  invalidType: FeedApiErrorCode.parse('invalid_feed_type'),
} as const;

// ---------------------------------------------------------------------------
// Contract Reference
// ---------------------------------------------------------------------------

/** Re-export FeedApiContracts for downstream consumers */
export const feedContracts = FeedApiContracts;

// ---------------------------------------------------------------------------
// Aggregate Export
// ---------------------------------------------------------------------------

export const CrmFeedApi = {
  contracts: feedContracts,
  errorCodes: feedErrorCodes,
  examples: {
    listFeed: { request: listFeedRequest, response: listFeedResponse },
    createFeedItem: { request: createFeedItemRequest, response: createFeedItemResponse },
    updateFeedItem: { request: updateFeedItemRequest, response: updateFeedItemResponse },
    deleteFeedItem: { request: deleteFeedItemRequest, response: deleteFeedItemResponse },
    addReaction: { request: addReactionRequest, response: addReactionResponse },
    removeReaction: { request: removeReactionRequest, response: removeReactionResponse },
    subscribe: { request: subscribeRequest, response: subscribeResponse },
    unsubscribe: { request: unsubscribeRequest, response: unsubscribeResponse },
  },
} as const;

export default CrmFeedApi;
