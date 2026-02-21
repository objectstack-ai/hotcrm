import { describe, it, expect } from 'vitest';
import { FeedItemSchema, ReactionSchema, MentionSchema, RecordSubscriptionSchema, FieldChangeEntrySchema } from '@objectstack/spec/data';
import { DashboardHeaderSchema, GlobalFilterSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';
import { ViewTabSchema, SharingConfigSchema, AppearanceConfigSchema, AddRecordConfigSchema, UserActionsConfigSchema } from '@objectstack/spec/ui';
import { BlankPageLayoutSchema, InterfacePageConfigSchema } from '@objectstack/spec/ui';

import {
  EmployeeOnboardingFeedItem, JobApplicationCommentFeedItem, PerformanceReviewApprovalFeedItem,
  EmployeePromotionFeedItem, JobApplicationTaskFeedItem,
  CelebrationReaction, ThumbsUpReaction, StarReaction,
  HiringManagerMention, RecruiterMention,
  EmployeeManagerSubscription, JobApplicationRecruiterSubscription, PerformanceReviewDirectorSubscription,
  EmployeeTitleChange, EmployeeDepartmentChange, JobApplicationStageChange,
  HrFeedConfig
} from '../../../src/hr.feed';

import { HrPortalBlankPage, HrPortalPageConfig } from '../../../src/hr_portal.blank_page';
import { HrDashboardHeader, HrGlobalFilters, HrWidgetMeasures } from '../../../src/hr.dashboard_enhanced';
import {
  EmployeeViewTabs, ApplicationViewTabs, TimeOffViewTabs,
  HrSharingConfig, HrAppearanceConfig, HrAddRecordConfig, HrUserActionsConfig
} from '../../../src/hr.view_enhanced';

describe('HR Phase 14 Schema Compliance', () => {
  // --- Feed Items ---
  describe('Feed Items', () => {
    const feedItems = [
      { name: 'EmployeeOnboardingFeedItem', value: EmployeeOnboardingFeedItem },
      { name: 'JobApplicationCommentFeedItem', value: JobApplicationCommentFeedItem },
      { name: 'PerformanceReviewApprovalFeedItem', value: PerformanceReviewApprovalFeedItem },
      { name: 'EmployeePromotionFeedItem', value: EmployeePromotionFeedItem },
      { name: 'JobApplicationTaskFeedItem', value: JobApplicationTaskFeedItem },
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
      { name: 'CelebrationReaction', value: CelebrationReaction },
      { name: 'ThumbsUpReaction', value: ThumbsUpReaction },
      { name: 'StarReaction', value: StarReaction },
    ];

    it.each(reactions)('$name should validate against ReactionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => ReactionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Mentions ---
  describe('Mentions', () => {
    const mentions = [
      { name: 'HiringManagerMention', value: HiringManagerMention },
      { name: 'RecruiterMention', value: RecruiterMention },
    ];

    it.each(mentions)('$name should validate against MentionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => MentionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Subscriptions ---
  describe('Subscriptions', () => {
    const subscriptions = [
      { name: 'EmployeeManagerSubscription', value: EmployeeManagerSubscription },
      { name: 'JobApplicationRecruiterSubscription', value: JobApplicationRecruiterSubscription },
      { name: 'PerformanceReviewDirectorSubscription', value: PerformanceReviewDirectorSubscription },
    ];

    it.each(subscriptions)('$name should validate against RecordSubscriptionSchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => RecordSubscriptionSchema.parse(value)).not.toThrow();
    });
  });

  // --- Field Changes ---
  describe('Field Changes', () => {
    const changes = [
      { name: 'EmployeeTitleChange', value: EmployeeTitleChange },
      { name: 'EmployeeDepartmentChange', value: EmployeeDepartmentChange },
      { name: 'JobApplicationStageChange', value: JobApplicationStageChange },
    ];

    it.each(changes)('$name should validate against FieldChangeEntrySchema', ({ value }) => {
      expect(value).toBeDefined();
      expect(() => FieldChangeEntrySchema.parse(value)).not.toThrow();
    });
  });

  // --- Feed Config Aggregate ---
  describe('HrFeedConfig', () => {
    it('should be defined with expected shape', () => {
      expect(HrFeedConfig).toBeDefined();
      expect(HrFeedConfig).toHaveProperty('feedItems');
      expect(HrFeedConfig).toHaveProperty('reactions');
      expect(Array.isArray(HrFeedConfig.feedItems)).toBe(true);
      expect(HrFeedConfig.feedItems.length).toBe(5);
    });
  });

  // --- Blank Page ---
  describe('HrPortalBlankPage', () => {
    it('should validate against BlankPageLayoutSchema', () => {
      expect(HrPortalBlankPage).toBeDefined();
      expect(() => BlankPageLayoutSchema.parse(HrPortalBlankPage)).not.toThrow();
    });

    it('should have items array', () => {
      expect(Array.isArray(HrPortalBlankPage.items)).toBe(true);
    });
  });

  describe('HrPortalPageConfig', () => {
    it('should validate against InterfacePageConfigSchema', () => {
      expect(HrPortalPageConfig).toBeDefined();
      expect(() => InterfacePageConfigSchema.parse(HrPortalPageConfig)).not.toThrow();
    });
  });

  // --- Dashboard Enhanced ---
  describe('HR Dashboard Enhanced', () => {
    it('HrDashboardHeader should validate against DashboardHeaderSchema', () => {
      expect(HrDashboardHeader).toBeDefined();
      expect(() => DashboardHeaderSchema.parse(HrDashboardHeader)).not.toThrow();
      expect(HrDashboardHeader).toHaveProperty('title');
      expect(HrDashboardHeader).toHaveProperty('actions');
    });

    it('HrGlobalFilters should all validate against GlobalFilterSchema', () => {
      expect(Array.isArray(HrGlobalFilters)).toBe(true);
      HrGlobalFilters.forEach(f => {
        expect(() => GlobalFilterSchema.parse(f)).not.toThrow();
      });
    });

    it('HrWidgetMeasures should all validate against WidgetMeasureSchema', () => {
      expect(Array.isArray(HrWidgetMeasures)).toBe(true);
      HrWidgetMeasures.forEach(m => {
        expect(() => WidgetMeasureSchema.parse(m)).not.toThrow();
      });
    });
  });

  // --- View Enhanced ---
  describe('HR View Enhanced', () => {
    const tabSets = [
      { name: 'EmployeeViewTabs', value: EmployeeViewTabs },
      { name: 'ApplicationViewTabs', value: ApplicationViewTabs },
      { name: 'TimeOffViewTabs', value: TimeOffViewTabs },
    ];

    it.each(tabSets)('$name should validate against ViewTabSchema', ({ value }) => {
      expect(Array.isArray(value)).toBe(true);
      value.forEach(t => {
        expect(() => ViewTabSchema.parse(t)).not.toThrow();
      });
    });

    it('HrSharingConfig should validate against SharingConfigSchema', () => {
      expect(() => SharingConfigSchema.parse(HrSharingConfig)).not.toThrow();
    });

    it('HrAppearanceConfig should validate against AppearanceConfigSchema', () => {
      expect(() => AppearanceConfigSchema.parse(HrAppearanceConfig)).not.toThrow();
    });

    it('HrAddRecordConfig should validate against AddRecordConfigSchema', () => {
      expect(() => AddRecordConfigSchema.parse(HrAddRecordConfig)).not.toThrow();
    });

    it('HrUserActionsConfig should validate against UserActionsConfigSchema', () => {
      expect(() => UserActionsConfigSchema.parse(HrUserActionsConfig)).not.toThrow();
    });
  });
});
