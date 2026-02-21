import { describe, it, expect } from 'vitest';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';
import { DashboardHeaderSchema, GlobalFilterSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

import {
  ProductLaunchFeedItem, PriceBookUpdateFeedItem, QuoteLineCommentFeedItem,
  ProductDeprecationFeedItem, PriceBookApprovalFeedItem,
  ThumbsUpReaction, MoneyReaction, RocketReaction,
  ProductManagerMention, PricingAnalystMention,
  ProductOwnerSubscription, PriceBookPricingSubscription, QuoteLineSalesSubscription,
  ProductStatusChange, PriceBookEntryPriceChange, QuoteLineDiscountChange,
  ProductsFeedConfig
} from '../../../src/products.feed';

import { ProductsDashboardHeader, ProductsGlobalFilters, ProductsWidgetMeasures } from '../../../src/products.dashboard_enhanced';
import {
  ProductViewTabs, OrderViewTabs, QuoteViewTabs,
  ProductsSharingConfig, ProductsAppearanceConfig, ProductsAddRecordConfig, ProductsUserActionsConfig
} from '../../../src/products.view_enhanced';

describe('Products Phase 14 Schema Compliance', () => {
  // --- Feed Items ---
  describe('Feed Items', () => {
    const feedItems = [
      { name: 'ProductLaunchFeedItem', value: ProductLaunchFeedItem },
      { name: 'PriceBookUpdateFeedItem', value: PriceBookUpdateFeedItem },
      { name: 'QuoteLineCommentFeedItem', value: QuoteLineCommentFeedItem },
      { name: 'ProductDeprecationFeedItem', value: ProductDeprecationFeedItem },
      { name: 'PriceBookApprovalFeedItem', value: PriceBookApprovalFeedItem },
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
    });
  });

  // --- Reactions ---
  describe('Reactions', () => {
    const reactions = [
      { name: 'ThumbsUpReaction', value: ThumbsUpReaction },
      { name: 'MoneyReaction', value: MoneyReaction },
      { name: 'RocketReaction', value: RocketReaction },
    ];

    it.each(reactions)('$name should validate against ReactionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => ReactionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Mentions ---
  describe('Mentions', () => {
    const mentions = [
      { name: 'ProductManagerMention', value: ProductManagerMention },
      { name: 'PricingAnalystMention', value: PricingAnalystMention },
    ];

    it.each(mentions)('$name should validate against MentionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => MentionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Subscriptions ---
  describe('Subscriptions', () => {
    const subscriptions = [
      { name: 'ProductOwnerSubscription', value: ProductOwnerSubscription },
      { name: 'PriceBookPricingSubscription', value: PriceBookPricingSubscription },
      { name: 'QuoteLineSalesSubscription', value: QuoteLineSalesSubscription },
    ];

    it.each(subscriptions)('$name should validate against RecordSubscriptionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => RecordSubscriptionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Field Changes ---
  describe('Field Changes', () => {
    const changes = [
      { name: 'ProductStatusChange', value: ProductStatusChange },
      { name: 'PriceBookEntryPriceChange', value: PriceBookEntryPriceChange },
      { name: 'QuoteLineDiscountChange', value: QuoteLineDiscountChange },
    ];

    it.each(changes)('$name should validate against FieldChangeEntrySchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => FieldChangeEntrySchema.parse(value)).not.toThrow();
    });
  });

  // --- Feed Config Aggregate ---
  describe('ProductsFeedConfig', () => {
    it('should be defined with expected shape', () => {
      expect(ProductsFeedConfig).toBeDefined();
      expect(ProductsFeedConfig).toHaveProperty('feedItems');
      expect(ProductsFeedConfig).toHaveProperty('reactions');
      expect(Array.isArray(ProductsFeedConfig.feedItems)).toBe(true);
      expect(ProductsFeedConfig.feedItems.length).toBe(5);
    });
  });

  // --- Dashboard Enhanced ---
  describe('Products Dashboard Enhanced', () => {
    it('ProductsDashboardHeader should validate against DashboardHeaderSchema', () => {
      expect(ProductsDashboardHeader).toBeDefined();
      expect(() => DashboardHeaderSchema.parse(ProductsDashboardHeader)).not.toThrow();
      expect(ProductsDashboardHeader).toHaveProperty('title');
      expect(ProductsDashboardHeader).toHaveProperty('actions');
    });

    it('ProductsGlobalFilters should all validate against GlobalFilterSchema', () => {
      expect(Array.isArray(ProductsGlobalFilters)).toBe(true);
      ProductsGlobalFilters.forEach(f => {
        expect(() => GlobalFilterSchema.parse(f)).not.toThrow();
      });
    });

    it('ProductsWidgetMeasures should all validate against WidgetMeasureSchema', () => {
      expect(Array.isArray(ProductsWidgetMeasures)).toBe(true);
      ProductsWidgetMeasures.forEach(m => {
        expect(() => WidgetMeasureSchema.parse(m)).not.toThrow();
      });
    });
  });

  // --- View Enhanced ---
  describe('Products View Enhanced', () => {
    const tabSets = [
      { name: 'ProductViewTabs', value: ProductViewTabs },
      { name: 'OrderViewTabs', value: OrderViewTabs },
      { name: 'QuoteViewTabs', value: QuoteViewTabs },
    ];

    it.each(tabSets)('$name should validate against ViewTabSchema', ({ value }) => {
      expect(Array.isArray(value)).toBe(true);
      value.forEach(t => {
        expect(() => ViewTabSchema.parse(t)).not.toThrow();
      });
    });

    it('ProductsSharingConfig should validate against SharingConfigSchema', () => {
      expect(() => SharingConfigSchema.parse(ProductsSharingConfig)).not.toThrow();
    });

    it('ProductsAppearanceConfig should validate against AppearanceConfigSchema', () => {
      expect(() => AppearanceConfigSchema.parse(ProductsAppearanceConfig)).not.toThrow();
    });

    it('ProductsAddRecordConfig should validate against AddRecordConfigSchema', () => {
      expect(() => AddRecordConfigSchema.parse(ProductsAddRecordConfig)).not.toThrow();
    });

    it('ProductsUserActionsConfig should validate against UserActionsConfigSchema', () => {
      expect(() => UserActionsConfigSchema.parse(ProductsUserActionsConfig)).not.toThrow();
    });
  });
});
