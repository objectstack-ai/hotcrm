/**
 * Community Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to Community domain changes.
 */

export const CommunityEvents = {
  topicCreated: {
    name: 'community.topic.created',
    type: 'domain' as const,
    description: 'Fired when a new topic is created in the forum',
  },
  replyPosted: {
    name: 'community.reply.posted',
    type: 'domain' as const,
    description: 'Fired when a reply is posted to a topic',
  },
  ideaSubmitted: {
    name: 'community.idea.submitted',
    type: 'domain' as const,
    description: 'Fired when a new idea is submitted for consideration',
  },
  badgeAwarded: {
    name: 'community.badge.awarded',
    type: 'domain' as const,
    description: 'Fired when a badge is awarded to a community member',
  },
};
