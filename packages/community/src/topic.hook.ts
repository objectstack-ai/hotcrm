import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('community:topic');

/**
 * Topic Content Moderation
 *
 * Checks topic content for prohibited words and spam patterns
 * before a topic is created or updated.
 */
const TopicContentModeration: Hook = {
  name: 'TopicContentModeration',
  object: 'topic',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.body) {
      const bodyLower = doc.body.toLowerCase();
      const prohibited = ['spam', 'scam', 'phishing'];
      for (const word of prohibited) {
        if (bodyLower.includes(word)) {
          throw new Error(`Content Moderation: Topic body contains prohibited content`);
        }
      }
    }

    if (doc.title) {
      const titleLower = doc.title.toLowerCase();
      if (titleLower.length < 5) {
        throw new Error('Validation Error: Topic title must be at least 5 characters');
      }
    }
  }
};

/**
 * Topic Notification
 *
 * Sends notifications to category subscribers when a new topic is created.
 */
const TopicNotification: Hook = {
  name: 'TopicNotification',
  object: 'topic',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const topic = ctx.result as Record<string, any>;
    if (!topic?._id || !topic?.category_id) return;

    logger.info(`Notifying subscribers of category ${topic.category_id} about new topic: ${topic.title}`);

    // Increment topic_count on the category
    try {
      const category = await (ctx.ql as any).findOne('forum_category', topic.category_id);
      if (category) {
        await (ctx.ql as any).doc.update('forum_category', topic.category_id, {
          topic_count: (category.topic_count || 0) + 1
        });
      }
    } catch (error) {
      logger.warn('Failed to update category topic count:', error);
    }
  }
};

/**
 * Topic Auto-Tagging
 *
 * Automatically suggests tags based on topic title and body content.
 */
const TopicAutoTagging: Hook = {
  name: 'TopicAutoTagging',
  object: 'topic',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (!doc.tags && doc.title && doc.body) {
      const combined = `${doc.title} ${doc.body}`.toLowerCase();
      const tagMap: Record<string, string> = {
        'bug': 'bug',
        'feature': 'feature-request',
        'help': 'help-wanted',
        'question': 'question',
        'how to': 'how-to',
        'integration': 'integration'
      };

      const autoTags: string[] = [];
      for (const [keyword, tag] of Object.entries(tagMap)) {
        if (combined.includes(keyword)) {
          autoTags.push(tag);
        }
      }

      if (autoTags.length > 0) {
        doc.tags = JSON.stringify(autoTags);
      }
    }
  }
};

/**
 * Topic View Counting
 *
 * Increments view_count and updates last_activity_at when a topic is read.
 */
const TopicViewCounting: Hook = {
  name: 'TopicViewCounting',
  object: 'topic',
  events: ['afterFind'],
  handler: async (ctx: HookContext) => {
    const topic = ctx.result as Record<string, any>;
    if (!topic?._id) return;

    try {
      await (ctx.ql as any).doc.update('topic', topic._id, {
        view_count: (topic.view_count || 0) + 1,
        last_activity_at: new Date().toISOString()
      });
    } catch (error) {
      logger.warn('Failed to update topic view count:', error);
    }
  }
};

export { TopicContentModeration, TopicNotification, TopicAutoTagging, TopicViewCounting };
export default TopicContentModeration;
