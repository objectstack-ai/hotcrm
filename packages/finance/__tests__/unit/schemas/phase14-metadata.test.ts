import { describe, it, expect } from 'vitest';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';
import { DashboardHeaderSchema, GlobalFilterSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';
import { BlankPageLayoutSchema, InterfacePageConfigSchema } from '@objectstack/spec/ui';

import {
  ContractApprovalFeedItem, InvoiceFieldChangeFeedItem, QuoteCommentFeedItem,
  ContractRenewalFeedItem, InvoiceEmailFeedItem,
  ApprovalReaction, AlertReaction, ThumbsUpReaction,
  FinanceManagerMention, LegalCounselMention,
  ContractOwnerSubscription, InvoiceAccountingSubscription, QuoteSalesSubscription,
  InvoiceAmountChange, ContractStatusChange, QuoteDiscountChange,
  FinanceFeedConfig
} from '../../../src/finance.feed';

import { RevenueOverviewBlankPage, RevenueOverviewPageConfig } from '../../../src/revenue_overview.blank_page';
import { FinanceDashboardHeader, FinanceGlobalFilters, FinanceWidgetMeasures } from '../../../src/finance.dashboard_enhanced';
import {
  InvoiceViewTabs, ContractViewTabs, PaymentViewTabs,
  FinanceSharingConfig, FinanceAppearanceConfig, FinanceAddRecordConfig, FinanceUserActionsConfig
} from '../../../src/finance.view_enhanced';

describe('Finance Phase 14 Schema Compliance', () => {
  // --- Feed Items ---
  describe('Feed Items', () => {
    const feedItems = [
      { name: 'ContractApprovalFeedItem', value: ContractApprovalFeedItem },
      { name: 'InvoiceFieldChangeFeedItem', value: InvoiceFieldChangeFeedItem },
      { name: 'QuoteCommentFeedItem', value: QuoteCommentFeedItem },
      { name: 'ContractRenewalFeedItem', value: ContractRenewalFeedItem },
      { name: 'InvoiceEmailFeedItem', value: InvoiceEmailFeedItem },
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
      { name: 'ApprovalReaction', value: ApprovalReaction },
      { name: 'AlertReaction', value: AlertReaction },
      { name: 'ThumbsUpReaction', value: ThumbsUpReaction },
    ];

    it.each(reactions)('$name should validate against ReactionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => ReactionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Mentions ---
  describe('Mentions', () => {
    const mentions = [
      { name: 'FinanceManagerMention', value: FinanceManagerMention },
      { name: 'LegalCounselMention', value: LegalCounselMention },
    ];

    it.each(mentions)('$name should validate against MentionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => MentionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Subscriptions ---
  describe('Subscriptions', () => {
    const subscriptions = [
      { name: 'ContractOwnerSubscription', value: ContractOwnerSubscription },
      { name: 'InvoiceAccountingSubscription', value: InvoiceAccountingSubscription },
      { name: 'QuoteSalesSubscription', value: QuoteSalesSubscription },
    ];

    it.each(subscriptions)('$name should validate against RecordSubscriptionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => RecordSubscriptionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Field Changes ---
  describe('Field Changes', () => {
    const changes = [
      { name: 'InvoiceAmountChange', value: InvoiceAmountChange },
      { name: 'ContractStatusChange', value: ContractStatusChange },
      { name: 'QuoteDiscountChange', value: QuoteDiscountChange },
    ];

    it.each(changes)('$name should validate against FieldChangeEntrySchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => FieldChangeEntrySchema.parse(value)).not.toThrow();
    });
  });

  // --- Feed Config Aggregate ---
  describe('FinanceFeedConfig', () => {
    it('should be defined with expected shape', () => {
      expect(FinanceFeedConfig).toBeDefined();
      expect(FinanceFeedConfig).toHaveProperty('feedItems');
      expect(FinanceFeedConfig).toHaveProperty('reactions');
      expect(Array.isArray(FinanceFeedConfig.feedItems)).toBe(true);
      expect(FinanceFeedConfig.feedItems.length).toBe(5);
    });
  });

  // --- Blank Page ---
  describe('RevenueOverviewBlankPage', () => {
    it('should validate against BlankPageLayoutSchema', () => {
      expect(RevenueOverviewBlankPage).toBeDefined();
      expect(() => BlankPageLayoutSchema.parse(RevenueOverviewBlankPage)).not.toThrow();
    });

    it('should have items array', () => {
      expect(Array.isArray(RevenueOverviewBlankPage.items)).toBe(true);
    });
  });

  describe('RevenueOverviewPageConfig', () => {
    it('should validate against InterfacePageConfigSchema', () => {
      expect(RevenueOverviewPageConfig).toBeDefined();
      expect(() => InterfacePageConfigSchema.parse(RevenueOverviewPageConfig)).not.toThrow();
    });
  });

  // --- Dashboard Enhanced ---
  describe('Finance Dashboard Enhanced', () => {
    it('FinanceDashboardHeader should validate against DashboardHeaderSchema', () => {
      expect(FinanceDashboardHeader).toBeDefined();
      expect(() => DashboardHeaderSchema.parse(FinanceDashboardHeader)).not.toThrow();
      expect(FinanceDashboardHeader).toHaveProperty('title');
      expect(FinanceDashboardHeader).toHaveProperty('actions');
    });

    it('FinanceGlobalFilters should all validate against GlobalFilterSchema', () => {
      expect(Array.isArray(FinanceGlobalFilters)).toBe(true);
      FinanceGlobalFilters.forEach(f => {
        expect(() => GlobalFilterSchema.parse(f)).not.toThrow();
      });
    });

    it('FinanceWidgetMeasures should all validate against WidgetMeasureSchema', () => {
      expect(Array.isArray(FinanceWidgetMeasures)).toBe(true);
      FinanceWidgetMeasures.forEach(m => {
        expect(() => WidgetMeasureSchema.parse(m)).not.toThrow();
      });
    });
  });

  // --- View Enhanced ---
  describe('Finance View Enhanced', () => {
    const tabSets = [
      { name: 'InvoiceViewTabs', value: InvoiceViewTabs },
      { name: 'ContractViewTabs', value: ContractViewTabs },
      { name: 'PaymentViewTabs', value: PaymentViewTabs },
    ];

    it.each(tabSets)('$name should validate against ViewTabSchema', ({ value }) => {
      expect(Array.isArray(value)).toBe(true);
      value.forEach(t => {
        expect(() => ViewTabSchema.parse(t)).not.toThrow();
      });
    });

    it('FinanceSharingConfig should validate against SharingConfigSchema', () => {
      expect(() => SharingConfigSchema.parse(FinanceSharingConfig)).not.toThrow();
    });

    it('FinanceAppearanceConfig should validate against AppearanceConfigSchema', () => {
      expect(() => AppearanceConfigSchema.parse(FinanceAppearanceConfig)).not.toThrow();
    });

    it('FinanceAddRecordConfig should validate against AddRecordConfigSchema', () => {
      expect(() => AddRecordConfigSchema.parse(FinanceAddRecordConfig)).not.toThrow();
    });

    it('FinanceUserActionsConfig should validate against UserActionsConfigSchema', () => {
      expect(() => UserActionsConfigSchema.parse(FinanceUserActionsConfig)).not.toThrow();
    });
  });
});
