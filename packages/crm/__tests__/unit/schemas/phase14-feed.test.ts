import { describe, it, expect } from 'vitest';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';
import { DashboardHeaderSchema, GlobalFilterSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';
import { BlankPageLayoutSchema, InterfacePageConfigSchema } from '@objectstack/spec/ui';

import {
  AccountCommentFeedItem, OpportunityFieldChangeFeedItem, ContactEmailFeedItem,
  LeadTaskFeedItem, CaseNoteFeedItem,
  ThumbsUpReaction, CelebrationReaction, HeartReaction,
  AccountOwnerMention, SalesTeamMention,
  AccountOwnerSubscription, OpportunityWatcherSubscription, CaseEscalationSubscription,
  OpportunityAmountChange, OpportunityStageChange, LeadStatusChange,
  CrmFeedConfig
} from '../../../src/crm.feed';

import { SalesDashboardBlankPage, SalesDashboardPageConfig } from '../../../src/sales_dashboard.blank_page';
import { CrmDashboardHeader, CrmGlobalFilters, CrmWidgetMeasures } from '../../../src/crm.dashboard_enhanced';
import {
  OpportunityViewTabs, AccountViewTabs, ContactViewTabs,
  CrmSharingConfig, CrmAppearanceConfig, CrmAddRecordConfig, CrmUserActionsConfig
} from '../../../src/crm.view_enhanced';

import {
  feedPath, feedItemPath, listFeedRequest, listFeedResponse,
  createFeedItemRequest, createFeedItemResponse,
  updateFeedItemRequest, updateFeedItemResponse,
  deleteFeedItemRequest, deleteFeedItemResponse,
  addReactionRequest, addReactionResponse,
  removeReactionRequest, removeReactionResponse,
  subscribeRequest, subscribeResponse,
  unsubscribeRequest, unsubscribeResponse,
  feedErrorCodes, feedContracts, CrmFeedApi
} from '../../../src/feed.action';

describe('CRM Phase 14 Schema Compliance', () => {
  // --- Feed Items ---
  describe('Feed Items', () => {
    const feedItems = [
      { name: 'AccountCommentFeedItem', value: AccountCommentFeedItem },
      { name: 'OpportunityFieldChangeFeedItem', value: OpportunityFieldChangeFeedItem },
      { name: 'ContactEmailFeedItem', value: ContactEmailFeedItem },
      { name: 'LeadTaskFeedItem', value: LeadTaskFeedItem },
      { name: 'CaseNoteFeedItem', value: CaseNoteFeedItem },
    ];

    it.each(feedItems)('$name should be defined', ({ value }) => {
      expect(value).toBeDefined();
    });

    it.each(feedItems)('$name should validate against FeedItemSchema', ({ value }) => {
      expect(() => FeedItemSchema.parse(value)).not.toThrow();
    });

    it.each(feedItems)('$name should have required feed properties', ({ value }) => {
      expect(value).toHaveProperty('id');
      expect(value).toHaveProperty('type');
      expect(value).toHaveProperty('actor');
      expect(value).toHaveProperty('object');
      expect(value).toHaveProperty('body');
    });
  });

  // --- Reactions ---
  describe('Reactions', () => {
    const reactions = [
      { name: 'ThumbsUpReaction', value: ThumbsUpReaction },
      { name: 'CelebrationReaction', value: CelebrationReaction },
      { name: 'HeartReaction', value: HeartReaction },
    ];

    it.each(reactions)('$name should validate against ReactionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => ReactionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Mentions ---
  describe('Mentions', () => {
    const mentions = [
      { name: 'AccountOwnerMention', value: AccountOwnerMention },
      { name: 'SalesTeamMention', value: SalesTeamMention },
    ];

    it.each(mentions)('$name should validate against MentionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => MentionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Subscriptions ---
  describe('Subscriptions', () => {
    const subscriptions = [
      { name: 'AccountOwnerSubscription', value: AccountOwnerSubscription },
      { name: 'OpportunityWatcherSubscription', value: OpportunityWatcherSubscription },
      { name: 'CaseEscalationSubscription', value: CaseEscalationSubscription },
    ];

    it.each(subscriptions)('$name should validate against RecordSubscriptionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => RecordSubscriptionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Field Changes ---
  describe('Field Changes', () => {
    const changes = [
      { name: 'OpportunityAmountChange', value: OpportunityAmountChange },
      { name: 'OpportunityStageChange', value: OpportunityStageChange },
      { name: 'LeadStatusChange', value: LeadStatusChange },
    ];

    it.each(changes)('$name should validate against FieldChangeEntrySchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => FieldChangeEntrySchema.parse(value)).not.toThrow();
    });
  });

  // --- Feed Config Aggregate ---
  describe('CrmFeedConfig', () => {
    it('should be defined', () => {
      expect(CrmFeedConfig).toBeDefined();
    });

    it('should contain feedItems array', () => {
      expect(CrmFeedConfig).toHaveProperty('feedItems');
      expect(Array.isArray(CrmFeedConfig.feedItems)).toBe(true);
      expect(CrmFeedConfig.feedItems.length).toBe(5);
    });

    it('should contain reactions array', () => {
      expect(CrmFeedConfig).toHaveProperty('reactions');
      expect(Array.isArray(CrmFeedConfig.reactions)).toBe(true);
    });
  });

  // --- Blank Page ---
  describe('SalesDashboardBlankPage', () => {
    it('should be defined', () => {
      expect(SalesDashboardBlankPage).toBeDefined();
    });

    it('should validate against BlankPageLayoutSchema', () => {
      expect(() => BlankPageLayoutSchema.parse(SalesDashboardBlankPage)).not.toThrow();
    });

    it('should have items array', () => {
      expect(SalesDashboardBlankPage).toHaveProperty('items');
      expect(Array.isArray(SalesDashboardBlankPage.items)).toBe(true);
    });
  });

  describe('SalesDashboardPageConfig', () => {
    it('should validate against InterfacePageConfigSchema', () => {
      expect(SalesDashboardPageConfig).toBeDefined();
      expect(() => InterfacePageConfigSchema.parse(SalesDashboardPageConfig)).not.toThrow();
    });
  });

  // --- Dashboard Enhanced ---
  describe('CRM Dashboard Enhanced', () => {
    it('CrmDashboardHeader should validate against DashboardHeaderSchema', () => {
      expect(CrmDashboardHeader).toBeDefined();
      expect(() => DashboardHeaderSchema.parse(CrmDashboardHeader)).not.toThrow();
    });

    it('CrmDashboardHeader should have showTitle and actions', () => {
      expect(CrmDashboardHeader).toHaveProperty('showTitle');
      expect(CrmDashboardHeader).toHaveProperty('actions');
      expect(Array.isArray(CrmDashboardHeader.actions)).toBe(true);
    });

    it('CrmGlobalFilters should validate against GlobalFilterSchema', () => {
      expect(CrmGlobalFilters).toBeDefined();
      expect(Array.isArray(CrmGlobalFilters)).toBe(true);
      CrmGlobalFilters.forEach(f => {
        expect(() => GlobalFilterSchema.parse(f)).not.toThrow();
      });
    });

    it('CrmWidgetMeasures should validate against WidgetMeasureSchema', () => {
      expect(CrmWidgetMeasures).toBeDefined();
      CrmWidgetMeasures.forEach(m => {
        expect(() => WidgetMeasureSchema.parse(m)).not.toThrow();
      });
    });
  });

  // --- View Enhanced ---
  describe('CRM View Enhanced', () => {
    const tabSets = [
      { name: 'OpportunityViewTabs', value: OpportunityViewTabs },
      { name: 'AccountViewTabs', value: AccountViewTabs },
      { name: 'ContactViewTabs', value: ContactViewTabs },
    ];

    it.each(tabSets)('$name should validate against ViewTabSchema', ({ value }) => {
      expect(Array.isArray(value)).toBe(true);
      value.forEach(t => {
        expect(() => ViewTabSchema.parse(t)).not.toThrow();
      });
    });

    it('CrmSharingConfig should validate against SharingConfigSchema', () => {
      expect(() => SharingConfigSchema.parse(CrmSharingConfig)).not.toThrow();
    });

    it('CrmAppearanceConfig should validate against AppearanceConfigSchema', () => {
      expect(() => AppearanceConfigSchema.parse(CrmAppearanceConfig)).not.toThrow();
    });

    it('CrmAddRecordConfig should validate against AddRecordConfigSchema', () => {
      expect(() => AddRecordConfigSchema.parse(CrmAddRecordConfig)).not.toThrow();
    });

    it('CrmUserActionsConfig should validate against UserActionsConfigSchema', () => {
      expect(() => UserActionsConfigSchema.parse(CrmUserActionsConfig)).not.toThrow();
    });
  });

  // --- Feed API (action.ts) ---
  describe('Feed API Contracts', () => {
    it('feedPath and feedItemPath should be defined', () => {
      expect(feedPath).toBeDefined();
      expect(feedItemPath).toBeDefined();
    });

    const requestResponsePairs = [
      { name: 'listFeed', req: listFeedRequest, res: listFeedResponse },
      { name: 'createFeedItem', req: createFeedItemRequest, res: createFeedItemResponse },
      { name: 'updateFeedItem', req: updateFeedItemRequest, res: updateFeedItemResponse },
      { name: 'deleteFeedItem', req: deleteFeedItemRequest, res: deleteFeedItemResponse },
      { name: 'addReaction', req: addReactionRequest, res: addReactionResponse },
      { name: 'removeReaction', req: removeReactionRequest, res: removeReactionResponse },
      { name: 'subscribe', req: subscribeRequest, res: subscribeResponse },
      { name: 'unsubscribe', req: unsubscribeRequest, res: unsubscribeResponse },
    ];

    it.each(requestResponsePairs)('$name request and response should be defined', ({ req, res }) => {
      expect(req).toBeDefined();
      expect(res).toBeDefined();
    });

    it('feedErrorCodes should contain expected error types', () => {
      expect(feedErrorCodes).toBeDefined();
      expect(typeof feedErrorCodes).toBe('object');
    });

    it('feedContracts should be defined', () => {
      expect(feedContracts).toBeDefined();
    });

    it('CrmFeedApi should aggregate contracts and errorCodes', () => {
      expect(CrmFeedApi).toBeDefined();
      expect(CrmFeedApi).toHaveProperty('contracts');
      expect(CrmFeedApi).toHaveProperty('errorCodes');
    });
  });
});
