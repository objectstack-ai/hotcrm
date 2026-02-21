import { describe, it, expect } from 'vitest';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';
import { DashboardHeaderSchema, GlobalFilterSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';
import { BlankPageLayoutSchema, InterfacePageConfigSchema } from '@objectstack/spec/ui';

import {
  CaseEscalationFeedItem, KnowledgeArticleCommentFeedItem, SlaBreachFeedItem,
  CaseResolutionFeedItem, CaseCallFeedItem,
  ThumbsUpReaction, ClappingReaction, WarningReaction,
  SupportManagerMention, SupportEngineerMention,
  CaseOwnerSubscription, KnowledgeArticleAuthorSubscription, SlaManagerSubscription,
  CasePriorityChange, CaseStatusChange, KnowledgeArticleStatusChange,
  SupportFeedConfig
} from '../../../src/support.feed';

import { ServiceConsoleBlankPage, ServiceConsolePageConfig } from '../../../src/service_console.blank_page';
import { SupportDashboardHeader, SupportGlobalFilters, SupportWidgetMeasures } from '../../../src/support.dashboard_enhanced';
import {
  CaseViewTabs, KnowledgeArticleViewTabs, QueueViewTabs,
  SupportSharingConfig, SupportAppearanceConfig, SupportAddRecordConfig, SupportUserActionsConfig
} from '../../../src/support.view_enhanced';

describe('Support Phase 14 Schema Compliance', () => {
  // --- Feed Items ---
  describe('Feed Items', () => {
    const feedItems = [
      { name: 'CaseEscalationFeedItem', value: CaseEscalationFeedItem },
      { name: 'KnowledgeArticleCommentFeedItem', value: KnowledgeArticleCommentFeedItem },
      { name: 'SlaBreachFeedItem', value: SlaBreachFeedItem },
      { name: 'CaseResolutionFeedItem', value: CaseResolutionFeedItem },
      { name: 'CaseCallFeedItem', value: CaseCallFeedItem },
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
      { name: 'ClappingReaction', value: ClappingReaction },
      { name: 'WarningReaction', value: WarningReaction },
    ];

    it.each(reactions)('$name should validate against ReactionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => ReactionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Mentions ---
  describe('Mentions', () => {
    const mentions = [
      { name: 'SupportManagerMention', value: SupportManagerMention },
      { name: 'SupportEngineerMention', value: SupportEngineerMention },
    ];

    it.each(mentions)('$name should validate against MentionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => MentionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Subscriptions ---
  describe('Subscriptions', () => {
    const subscriptions = [
      { name: 'CaseOwnerSubscription', value: CaseOwnerSubscription },
      { name: 'KnowledgeArticleAuthorSubscription', value: KnowledgeArticleAuthorSubscription },
      { name: 'SlaManagerSubscription', value: SlaManagerSubscription },
    ];

    it.each(subscriptions)('$name should validate against RecordSubscriptionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => RecordSubscriptionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Field Changes ---
  describe('Field Changes', () => {
    const changes = [
      { name: 'CasePriorityChange', value: CasePriorityChange },
      { name: 'CaseStatusChange', value: CaseStatusChange },
      { name: 'KnowledgeArticleStatusChange', value: KnowledgeArticleStatusChange },
    ];

    it.each(changes)('$name should validate against FieldChangeEntrySchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => FieldChangeEntrySchema.parse(value)).not.toThrow();
    });
  });

  // --- Feed Config Aggregate ---
  describe('SupportFeedConfig', () => {
    it('should be defined with expected shape', () => {
      expect(SupportFeedConfig).toBeDefined();
      expect(SupportFeedConfig).toHaveProperty('feedItems');
      expect(SupportFeedConfig).toHaveProperty('reactions');
      expect(Array.isArray(SupportFeedConfig.feedItems)).toBe(true);
      expect(SupportFeedConfig.feedItems.length).toBe(5);
    });
  });

  // --- Blank Page ---
  describe('ServiceConsoleBlankPage', () => {
    it('should validate against BlankPageLayoutSchema', () => {
      expect(ServiceConsoleBlankPage).toBeDefined();
      expect(() => BlankPageLayoutSchema.parse(ServiceConsoleBlankPage)).not.toThrow();
    });

    it('should have items array', () => {
      expect(Array.isArray(ServiceConsoleBlankPage.items)).toBe(true);
    });
  });

  describe('ServiceConsolePageConfig', () => {
    it('should validate against InterfacePageConfigSchema', () => {
      expect(ServiceConsolePageConfig).toBeDefined();
      expect(() => InterfacePageConfigSchema.parse(ServiceConsolePageConfig)).not.toThrow();
    });
  });

  // --- Dashboard Enhanced ---
  describe('Support Dashboard Enhanced', () => {
    it('SupportDashboardHeader should validate against DashboardHeaderSchema', () => {
      expect(SupportDashboardHeader).toBeDefined();
      expect(() => DashboardHeaderSchema.parse(SupportDashboardHeader)).not.toThrow();
      expect(SupportDashboardHeader).toHaveProperty('title');
      expect(SupportDashboardHeader).toHaveProperty('actions');
    });

    it('SupportGlobalFilters should all validate against GlobalFilterSchema', () => {
      expect(Array.isArray(SupportGlobalFilters)).toBe(true);
      SupportGlobalFilters.forEach(f => {
        expect(() => GlobalFilterSchema.parse(f)).not.toThrow();
      });
    });

    it('SupportWidgetMeasures should all validate against WidgetMeasureSchema', () => {
      expect(Array.isArray(SupportWidgetMeasures)).toBe(true);
      SupportWidgetMeasures.forEach(m => {
        expect(() => WidgetMeasureSchema.parse(m)).not.toThrow();
      });
    });
  });

  // --- View Enhanced ---
  describe('Support View Enhanced', () => {
    const tabSets = [
      { name: 'CaseViewTabs', value: CaseViewTabs },
      { name: 'KnowledgeArticleViewTabs', value: KnowledgeArticleViewTabs },
      { name: 'QueueViewTabs', value: QueueViewTabs },
    ];

    it.each(tabSets)('$name should validate against ViewTabSchema', ({ value }) => {
      expect(Array.isArray(value)).toBe(true);
      value.forEach(t => {
        expect(() => ViewTabSchema.parse(t)).not.toThrow();
      });
    });

    it('SupportSharingConfig should validate against SharingConfigSchema', () => {
      expect(() => SharingConfigSchema.parse(SupportSharingConfig)).not.toThrow();
    });

    it('SupportAppearanceConfig should validate against AppearanceConfigSchema', () => {
      expect(() => AppearanceConfigSchema.parse(SupportAppearanceConfig)).not.toThrow();
    });

    it('SupportAddRecordConfig should validate against AddRecordConfigSchema', () => {
      expect(() => AddRecordConfigSchema.parse(SupportAddRecordConfig)).not.toThrow();
    });

    it('SupportUserActionsConfig should validate against UserActionsConfigSchema', () => {
      expect(() => UserActionsConfigSchema.parse(SupportUserActionsConfig)).not.toThrow();
    });
  });
});
