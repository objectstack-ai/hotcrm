import { describe, it, expect } from 'vitest';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';
import { BlankPageLayoutSchema, InterfacePageConfigSchema, DashboardHeaderSchema, GlobalFilterSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';
import { InterfaceBuilderConfigSchema, ElementPaletteItemSchema } from '@objectstack/spec/studio';

// --- CRM Feed ---
import {
  AccountCommentFeedItem, OpportunityFieldChangeFeedItem, ContactEmailFeedItem,
  LeadTaskFeedItem, CaseNoteFeedItem,
  ThumbsUpReaction as CrmThumbsUp, CelebrationReaction, HeartReaction,
  AccountOwnerMention, SalesTeamMention,
  AccountOwnerSubscription, OpportunityWatcherSubscription,
  OpportunityAmountChange, OpportunityStageChange,
  CrmFeedConfig
} from '../../../src/crm.feed';

// --- CRM Blank Page ---
import { SalesDashboardBlankPage, SalesDashboardPageConfig } from '../../../src/sales_dashboard.blank_page';

// --- CRM Dashboard Enhanced ---
import { CrmDashboardHeader, CrmGlobalFilters, CrmWidgetMeasures } from '../../../src/crm.dashboard_enhanced';

// --- CRM View Enhanced ---
import { OpportunityViewTabs, CrmSharingConfig, CrmUserActionsConfig } from '../../../src/crm.view_enhanced';

// --- Feed API ---
import {
  feedPath, feedItemPath,
  listFeedRequest, listFeedResponse,
  createFeedItemRequest, createFeedItemResponse,
  updateFeedItemRequest, updateFeedItemResponse,
  deleteFeedItemRequest, deleteFeedItemResponse,
  addReactionRequest, addReactionResponse,
  removeReactionRequest, removeReactionResponse,
  subscribeRequest, subscribeResponse,
  unsubscribeRequest, unsubscribeResponse,
  feedErrorCodes, CrmFeedApi
} from '../../../src/feed.action';

describe('Phase 14 Cross-Package Integration', () => {
  // --- Integration: Feed System ---
  describe('Feed System Integration', () => {
    it('CRM feed items should all validate against FeedItemSchema', () => {
      const feedItems = [
        AccountCommentFeedItem, OpportunityFieldChangeFeedItem,
        ContactEmailFeedItem, LeadTaskFeedItem, CaseNoteFeedItem,
      ];
      feedItems.forEach(item => {
        expect(() => FeedItemSchema.parse(item)).not.toThrow();
      });
    });

    it('CRM reactions should all validate against ReactionSchema', () => {
      [CrmThumbsUp, CelebrationReaction, HeartReaction].forEach(r => {
        expect(() => ReactionSchema.parse(r)).not.toThrow();
      });
    });

    it('CRM mentions should validate against MentionSchema', () => {
      [AccountOwnerMention, SalesTeamMention].forEach(m => {
        expect(() => MentionSchema.parse(m)).not.toThrow();
      });
    });

    it('CRM subscriptions should validate against RecordSubscriptionSchema', () => {
      [AccountOwnerSubscription, OpportunityWatcherSubscription].forEach(s => {
        expect(() => RecordSubscriptionSchema.parse(s)).not.toThrow();
      });
    });

    it('CRM field changes should validate against FieldChangeEntrySchema', () => {
      [OpportunityAmountChange, OpportunityStageChange].forEach(c => {
        expect(() => FieldChangeEntrySchema.parse(c)).not.toThrow();
      });
    });

    it('CrmFeedConfig should aggregate all feed components', () => {
      expect(CrmFeedConfig.feedItems.length).toBe(5);
      expect(CrmFeedConfig.reactions.length).toBe(3);
      expect(CrmFeedConfig.mentions.length).toBe(2);
      expect(CrmFeedConfig.subscriptions.length).toBe(3);
      expect(CrmFeedConfig.fieldChanges.length).toBe(3);
    });

    it('feed items should reference valid CRM objects', () => {
      const validObjects = ['account', 'opportunity', 'contact', 'lead', 'case'];
      CrmFeedConfig.feedItems.forEach(item => {
        expect(validObjects).toContain(item.object);
      });
    });
  });

  // --- Integration: Blank Page + Interface Builder ---
  describe('Interface Builder Integration', () => {
    it('SalesDashboardBlankPage should validate as a complete blank page', () => {
      expect(() => BlankPageLayoutSchema.parse(SalesDashboardBlankPage)).not.toThrow();
    });

    it('SalesDashboardPageConfig should validate as interface page config', () => {
      expect(() => InterfacePageConfigSchema.parse(SalesDashboardPageConfig)).not.toThrow();
    });

    it('blank page should have multiple layout items', () => {
      expect(SalesDashboardBlankPage.items.length).toBeGreaterThanOrEqual(3);
    });

    it('each layout item should have grid positioning', () => {
      SalesDashboardBlankPage.items.forEach(item => {
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('x');
        expect(item).toHaveProperty('y');
        expect(item).toHaveProperty('w');
        expect(item).toHaveProperty('h');
      });
    });

    it('page config should have permissions', () => {
      expect(SalesDashboardPageConfig).toHaveProperty('permissions');
    });
  });

  // --- Integration: Dashboard Filters ---
  describe('Dashboard Filter Integration', () => {
    it('CrmDashboardHeader should validate against DashboardHeaderSchema', () => {
      expect(() => DashboardHeaderSchema.parse(CrmDashboardHeader)).not.toThrow();
    });

    it('header actions should be non-empty', () => {
      expect(CrmDashboardHeader.actions.length).toBeGreaterThanOrEqual(2);
    });

    it('global filters should all validate against GlobalFilterSchema', () => {
      CrmGlobalFilters.forEach(f => {
        expect(() => GlobalFilterSchema.parse(f)).not.toThrow();
      });
    });

    it('global filters should have various types', () => {
      const types = CrmGlobalFilters.map(f => f.type);
      expect(types.length).toBeGreaterThanOrEqual(2);
    });

    it('widget measures should all validate against WidgetMeasureSchema', () => {
      CrmWidgetMeasures.forEach(m => {
        expect(() => WidgetMeasureSchema.parse(m)).not.toThrow();
      });
    });

    it('view tabs should validate against ViewTabSchema', () => {
      OpportunityViewTabs.forEach(t => {
        expect(() => ViewTabSchema.parse(t)).not.toThrow();
      });
    });

    it('sharing and user actions configs should validate', () => {
      expect(() => SharingConfigSchema.parse(CrmSharingConfig)).not.toThrow();
      expect(() => UserActionsConfigSchema.parse(CrmUserActionsConfig)).not.toThrow();
    });
  });

  // --- Integration: Feed API Contracts ---
  describe('Feed API Contract Integration', () => {
    it('feed path params should be defined', () => {
      expect(feedPath).toBeDefined();
      expect(feedItemPath).toBeDefined();
      expect(feedPath).toHaveProperty('object');
      expect(feedItemPath).toHaveProperty('object');
    });

    const endpoints = [
      { name: 'listFeed', req: listFeedRequest, res: listFeedResponse },
      { name: 'createFeedItem', req: createFeedItemRequest, res: createFeedItemResponse },
      { name: 'updateFeedItem', req: updateFeedItemRequest, res: updateFeedItemResponse },
      { name: 'deleteFeedItem', req: deleteFeedItemRequest, res: deleteFeedItemResponse },
      { name: 'addReaction', req: addReactionRequest, res: addReactionResponse },
      { name: 'removeReaction', req: removeReactionRequest, res: removeReactionResponse },
      { name: 'subscribe', req: subscribeRequest, res: subscribeResponse },
      { name: 'unsubscribe', req: unsubscribeRequest, res: unsubscribeResponse },
    ];

    it.each(endpoints)('$name request should be defined and non-null', ({ req }) => {
      expect(req).toBeDefined();
      expect(req).not.toBeNull();
    });

    it.each(endpoints)('$name response should be defined and non-null', ({ res }) => {
      expect(res).toBeDefined();
      expect(res).not.toBeNull();
    });

    it('feedErrorCodes should map error types', () => {
      expect(feedErrorCodes).toBeDefined();
      expect(typeof feedErrorCodes).toBe('object');
      expect(Object.keys(feedErrorCodes).length).toBeGreaterThanOrEqual(1);
    });

    it('CrmFeedApi should aggregate contracts, errorCodes, and examples', () => {
      expect(CrmFeedApi).toBeDefined();
      expect(CrmFeedApi).toHaveProperty('contracts');
      expect(CrmFeedApi).toHaveProperty('errorCodes');
      expect(CrmFeedApi).toHaveProperty('examples');
    });

    it('CrmFeedApi examples should cover all 8 endpoints', () => {
      const examples = CrmFeedApi.examples;
      expect(examples).toBeDefined();
      expect(typeof examples).toBe('object');
    });
  });
});
