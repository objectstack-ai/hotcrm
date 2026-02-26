/**
 * Community Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to Community domain changes.
 */
import { EventTypeDefinitionSchema } from '@objectstack/spec/kernel';

export const CommunityEvents = {
  topicCreated: EventTypeDefinitionSchema.parse({
    name: 'community.topic.created',
    description: 'Fired when a new topic is created in the forum',
  }),
  replyPosted: EventTypeDefinitionSchema.parse({
    name: 'community.reply.posted',
    description: 'Fired when a reply is posted to a topic',
  }),
  ideaSubmitted: EventTypeDefinitionSchema.parse({
    name: 'community.idea.submitted',
    description: 'Fired when a new idea is submitted for consideration',
  }),
  badgeAwarded: EventTypeDefinitionSchema.parse({
    name: 'community.badge.awarded',
    description: 'Fired when a badge is awarded to a community member',
  }),
};
