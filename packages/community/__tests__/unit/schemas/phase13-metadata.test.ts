import { describe, it, expect } from 'vitest';
import { PageSchema, FormViewSchema, ReportSchema, ChartConfigSchema } from '@objectstack/spec/ui';
import { StudioPluginManifestSchema } from '@objectstack/spec/studio';
import { CommunityHomePage } from '../../../src/community_home.page';
import { ModerationQueuePage } from '../../../src/moderation_queue.page';
import { TopicForm } from '../../../src/topic.form';
import { EventForm } from '../../../src/event.form';
import { EngagementMetricsReport } from '../../../src/engagement_metrics.report';
import { ContentQualityReport } from '../../../src/content_quality.report';
import { PostActivityChart } from '../../../src/post_activity.chart';
import { UserGrowthChart } from '../../../src/user_growth.chart';
import { CommunityModeratorAgent } from '../../../src/community_moderator.agent';
import { ValidatedIdeaLifecycleStateMachine } from '../../../src/idea_lifecycle.statemachine';
import { CommunityStudioPlugin, CommunityStudioManifest } from '../../../src/community.studio';

describe('Community Phase 13 Metadata Compliance', () => {
  describe('Pages', () => {
    it('CommunityHomePage validates against PageSchema', () => {
      expect(CommunityHomePage).toBeDefined();
      expect(() => PageSchema.parse(CommunityHomePage)).not.toThrow();
    });
    it('ModerationQueuePage validates against PageSchema', () => {
      expect(ModerationQueuePage).toBeDefined();
      expect(() => PageSchema.parse(ModerationQueuePage)).not.toThrow();
    });
  });

  describe('Forms', () => {
    it('TopicForm validates against FormViewSchema', () => {
      expect(TopicForm).toBeDefined();
      expect(() => FormViewSchema.parse(TopicForm)).not.toThrow();
    });
    it('EventForm validates against FormViewSchema', () => {
      expect(EventForm).toBeDefined();
      expect(() => FormViewSchema.parse(EventForm)).not.toThrow();
    });
  });

  describe('Reports', () => {
    it('EngagementMetricsReport validates against ReportSchema', () => {
      expect(EngagementMetricsReport).toBeDefined();
      expect(() => ReportSchema.parse(EngagementMetricsReport)).not.toThrow();
    });
    it('ContentQualityReport validates against ReportSchema', () => {
      expect(ContentQualityReport).toBeDefined();
      expect(() => ReportSchema.parse(ContentQualityReport)).not.toThrow();
    });
  });

  describe('Charts', () => {
    it('PostActivityChart validates against ChartConfigSchema', () => {
      expect(PostActivityChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(PostActivityChart)).not.toThrow();
    });
    it('UserGrowthChart validates against ChartConfigSchema', () => {
      expect(UserGrowthChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(UserGrowthChart)).not.toThrow();
    });
  });

  describe('Agent', () => {
    it('CommunityModeratorAgent is defined with tools', () => {
      expect(CommunityModeratorAgent).toBeDefined();
      expect(CommunityModeratorAgent.name).toBe('community_moderator');
      expect(CommunityModeratorAgent.tools.length).toBeGreaterThan(0);
    });
  });

  describe('State Machine', () => {
    it('ValidatedIdeaLifecycleStateMachine is defined', () => {
      expect(ValidatedIdeaLifecycleStateMachine).toBeDefined();
      expect(ValidatedIdeaLifecycleStateMachine.id).toBeTruthy();
    });
  });

  describe('Studio', () => {
    it('CommunityStudioPlugin is defined', () => {
      expect(CommunityStudioPlugin).toBeDefined();
      expect(CommunityStudioPlugin.id).toBeTruthy();
    });
    it('CommunityStudioManifest validates against StudioPluginManifestSchema', () => {
      expect(CommunityStudioManifest).toBeDefined();
      expect(() => StudioPluginManifestSchema.parse(CommunityStudioManifest)).not.toThrow();
    });
  });
});
