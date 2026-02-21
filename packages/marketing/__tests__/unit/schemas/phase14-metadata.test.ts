import { describe, it, expect } from 'vitest';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';
import { DashboardHeaderSchema, GlobalFilterSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';

import {
  CampaignLaunchFeedItem, LeadScoringFeedItem, JourneyCommentFeedItem,
  CampaignEmailFeedItem, LeadConversionFeedItem,
  RocketReaction, TargetReaction, FireReaction,
  MarketingManagerMention, MarketingOpsMention,
  CampaignOwnerSubscription, LeadNurtureSubscription, JourneyDesignerSubscription,
  LeadScoreChange, CampaignStatusChange, JourneyCadenceChange,
  MarketingFeedConfig
} from '../../../src/marketing.feed';

import { MarketingDashboardHeader, MarketingGlobalFilters, MarketingWidgetMeasures } from '../../../src/marketing.dashboard_enhanced';
import {
  CampaignViewTabs, LeadViewTabs, EmailTemplateViewTabs,
  MarketingSharingConfig, MarketingAppearanceConfig, MarketingAddRecordConfig, MarketingUserActionsConfig
} from '../../../src/marketing.view_enhanced';

describe('Marketing Phase 14 Schema Compliance', () => {
  // --- Feed Items ---
  describe('Feed Items', () => {
    const feedItems = [
      { name: 'CampaignLaunchFeedItem', value: CampaignLaunchFeedItem },
      { name: 'LeadScoringFeedItem', value: LeadScoringFeedItem },
      { name: 'JourneyCommentFeedItem', value: JourneyCommentFeedItem },
      { name: 'CampaignEmailFeedItem', value: CampaignEmailFeedItem },
      { name: 'LeadConversionFeedItem', value: LeadConversionFeedItem },
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
      { name: 'RocketReaction', value: RocketReaction },
      { name: 'TargetReaction', value: TargetReaction },
      { name: 'FireReaction', value: FireReaction },
    ];

    it.each(reactions)('$name should validate against ReactionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => ReactionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Mentions ---
  describe('Mentions', () => {
    const mentions = [
      { name: 'MarketingManagerMention', value: MarketingManagerMention },
      { name: 'MarketingOpsMention', value: MarketingOpsMention },
    ];

    it.each(mentions)('$name should validate against MentionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => MentionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Subscriptions ---
  describe('Subscriptions', () => {
    const subscriptions = [
      { name: 'CampaignOwnerSubscription', value: CampaignOwnerSubscription },
      { name: 'LeadNurtureSubscription', value: LeadNurtureSubscription },
      { name: 'JourneyDesignerSubscription', value: JourneyDesignerSubscription },
    ];

    it.each(subscriptions)('$name should validate against RecordSubscriptionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => RecordSubscriptionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Field Changes ---
  describe('Field Changes', () => {
    const changes = [
      { name: 'LeadScoreChange', value: LeadScoreChange },
      { name: 'CampaignStatusChange', value: CampaignStatusChange },
      { name: 'JourneyCadenceChange', value: JourneyCadenceChange },
    ];

    it.each(changes)('$name should validate against FieldChangeEntrySchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => FieldChangeEntrySchema.parse(value)).not.toThrow();
    });
  });

  // --- Feed Config Aggregate ---
  describe('MarketingFeedConfig', () => {
    it('should be defined with expected shape', () => {
      expect(MarketingFeedConfig).toBeDefined();
      expect(MarketingFeedConfig).toHaveProperty('feedItems');
      expect(MarketingFeedConfig).toHaveProperty('reactions');
      expect(Array.isArray(MarketingFeedConfig.feedItems)).toBe(true);
      expect(MarketingFeedConfig.feedItems.length).toBe(5);
    });
  });

  // --- Dashboard Enhanced ---
  describe('Marketing Dashboard Enhanced', () => {
    it('MarketingDashboardHeader should validate against DashboardHeaderSchema', () => {
      expect(MarketingDashboardHeader).toBeDefined();
      expect(() => DashboardHeaderSchema.parse(MarketingDashboardHeader)).not.toThrow();
      expect(MarketingDashboardHeader).toHaveProperty('showTitle');
      expect(MarketingDashboardHeader).toHaveProperty('actions');
    });

    it('MarketingGlobalFilters should all validate against GlobalFilterSchema', () => {
      expect(Array.isArray(MarketingGlobalFilters)).toBe(true);
      MarketingGlobalFilters.forEach(f => {
        expect(() => GlobalFilterSchema.parse(f)).not.toThrow();
      });
    });

    it('MarketingWidgetMeasures should all validate against WidgetMeasureSchema', () => {
      expect(Array.isArray(MarketingWidgetMeasures)).toBe(true);
      MarketingWidgetMeasures.forEach(m => {
        expect(() => WidgetMeasureSchema.parse(m)).not.toThrow();
      });
    });
  });

  // --- View Enhanced ---
  describe('Marketing View Enhanced', () => {
    const tabSets = [
      { name: 'CampaignViewTabs', value: CampaignViewTabs },
      { name: 'LeadViewTabs', value: LeadViewTabs },
      { name: 'EmailTemplateViewTabs', value: EmailTemplateViewTabs },
    ];

    it.each(tabSets)('$name should validate against ViewTabSchema', ({ value }) => {
      expect(Array.isArray(value)).toBe(true);
      value.forEach(t => {
        expect(() => ViewTabSchema.parse(t)).not.toThrow();
      });
    });

    it('MarketingSharingConfig should validate against SharingConfigSchema', () => {
      expect(() => SharingConfigSchema.parse(MarketingSharingConfig)).not.toThrow();
    });

    it('MarketingAppearanceConfig should validate against AppearanceConfigSchema', () => {
      expect(() => AppearanceConfigSchema.parse(MarketingAppearanceConfig)).not.toThrow();
    });

    it('MarketingAddRecordConfig should validate against AddRecordConfigSchema', () => {
      expect(() => AddRecordConfigSchema.parse(MarketingAddRecordConfig)).not.toThrow();
    });

    it('MarketingUserActionsConfig should validate against UserActionsConfigSchema', () => {
      expect(() => UserActionsConfigSchema.parse(MarketingUserActionsConfig)).not.toThrow();
    });
  });
});
