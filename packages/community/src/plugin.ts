/**
 * @hotcrm/community - Community Plugin Definition
 *
 * This plugin provides community engagement functionality including:
 * - Customer Forums & Categories
 * - Topic & Reply Management
 * - Idea Management & Voting
 * - User Groups & Access Control
 * - Community Events & RSVPs
 * - Badge & Gamification System
 * - AI-Powered Moderation & Analytics
 *
 * Dependencies: @hotcrm/core, @hotcrm/support
 */

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import all Community objects
import { Community } from './community.object.js';
import { ForumCategory } from './forum_category.object.js';
import { Topic } from './topic.object.js';
import { Reply } from './reply.object.js';
import { Idea } from './idea.object.js';
import { UserGroup } from './user_group.object.js';
import { CommunityEvent } from './community_event.object.js';
import { Badge } from './badge.object.js';

// Import hooks
import { TopicContentModeration, TopicNotification, TopicAutoTagging, TopicViewCounting } from './topic.hook.js';
import { ReplyAnswerAcceptance, ReplyUpvoteTracking, ReplyAuthorReputation, ReplySpamDetection } from './reply.hook.js';
import { IdeaVoteAggregation, IdeaStatusTransition, IdeaNotification } from './idea.hook.js';
import { GroupMembershipValidation, GroupAutoAssignment, GroupAccessEnforcement } from './user_group.hook.js';
import { EventRSVPManagement, EventCapacityEnforcement, EventReminderScheduling } from './community_event.hook.js';
import { BadgeAutoAward, BadgePointsCalculation } from './badge.hook.js';
import { CommunityConfigValidation, CommunityFeatureToggle, CommunityDomainVerification } from './community.hook.js';

// Import actions
import CommunityAIAction from './community_ai.action.js';
import CommunityAnalyticsAction from './community_analytics.action.js';

/**
 * Community Plugin Definition
 *
 * Exports all community-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const CommunityPlugin = {
  name: 'community',
  label: 'Community Cloud',
  version: '1.0.0',
  description: 'Community engagement - Forums, Ideas, Events, Gamification, and AI-Powered Moderation',

  // Plugin dependencies
  dependencies: ['core', 'support'],

  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },

  // Business objects provided by this plugin
  objects: {
    community: Community,
    forum_category: ForumCategory,
    topic: Topic,
    reply: Reply,
    idea: Idea,
    user_group: UserGroup,
    community_event: CommunityEvent,
    badge: Badge,
  },

  // Actions provided by this plugin
  actions: {
    community_ai: CommunityAIAction,
    community_analytics: CommunityAnalyticsAction,
  },

  // Triggers/Hooks
  triggers: {
    topic_content_moderation: TopicContentModeration,
    topic_notification: TopicNotification,
    topic_auto_tagging: TopicAutoTagging,
    topic_view_counting: TopicViewCounting,
    reply_answer_acceptance: ReplyAnswerAcceptance,
    reply_upvote_tracking: ReplyUpvoteTracking,
    reply_author_reputation: ReplyAuthorReputation,
    reply_spam_detection: ReplySpamDetection,
    idea_vote_aggregation: IdeaVoteAggregation,
    idea_status_transition: IdeaStatusTransition,
    idea_notification: IdeaNotification,
    group_membership_validation: GroupMembershipValidation,
    group_auto_assignment: GroupAutoAssignment,
    group_access_enforcement: GroupAccessEnforcement,
    event_rsvp_management: EventRSVPManagement,
    event_capacity_enforcement: EventCapacityEnforcement,
    event_reminder_scheduling: EventReminderScheduling,
    badge_auto_award: BadgeAutoAward,
    badge_points_calculation: BadgePointsCalculation,
    community_config_validation: CommunityConfigValidation,
    community_feature_toggle: CommunityFeatureToggle,
    community_domain_verification: CommunityDomainVerification,
  },

  // Apps provided by this plugin
  apps: [
    {
      name: 'community',
      label: 'Community Cloud',
      navigation: [
        {
          id: 'forums',
          type: 'group',
          label: 'Forums',
          children: [
            { id: 'forum_category', label: 'Forum Category', type: 'object', objectName: 'forum_category' },
            { id: 'topic', label: 'Topic', type: 'object', objectName: 'topic' },
            { id: 'reply', label: 'Reply', type: 'object', objectName: 'reply' },
          ]
        },
        {
          id: 'ideas',
          type: 'group',
          label: 'Ideas',
          children: [
            { id: 'idea', label: 'Idea', type: 'object', objectName: 'idea' },
            { id: 'user_group', label: 'User Group', type: 'object', objectName: 'user_group' },
          ]
        },
        {
          id: 'configuration',
          type: 'group',
          label: 'Configuration',
          children: [
            { id: 'community', label: 'Community', type: 'object', objectName: 'community' },
            { id: 'community_event', label: 'Event', type: 'object', objectName: 'community_event' },
            { id: 'badge', label: 'Badge', type: 'object', objectName: 'badge' },
          ]
        },
        {
          id: 'views_and_dashboards',
          type: 'group',
          label: 'Views & Dashboards',
          children: [
            { id: 'community_dashboard', label: 'Community Dashboard', type: 'dashboard', dashboardName: 'community_dashboard' },
          ]
        }
      ]
    }
  ]
};

/** Spec-validated plugin metadata */
export const CommunityPluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'community',
  label: 'Community Cloud',
  version: '1.0.0',
  description: 'Community engagement - Forums, Ideas, Events, Gamification, and AI-Powered Moderation',
});

export default CommunityPlugin;
