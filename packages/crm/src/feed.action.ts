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
  items: [],
  total: 0,
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
  id: 'fi-001',
  success: true,
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
  id: 'fi-001',
  success: true,
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
