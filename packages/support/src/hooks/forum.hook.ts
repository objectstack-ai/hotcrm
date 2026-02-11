import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Forum Topic Validation Hook
 * 
 * Validates title length, auto-generates url_slug from title,
 * and sets default values on insert.
 */
const ForumTopicValidationTrigger: Hook = {
  name: 'ForumTopicValidationTrigger',
  object: 'forum_topic',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    try {
      // Validate title
      if (!doc.title || typeof doc.title !== 'string' || doc.title.trim().length < 5) {
        throw new Error('Forum topic title is required and must be at least 5 characters.');
      }

      // Auto-generate url_slug from title
      doc.url_slug = doc.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      // Set defaults on insert
      if (ctx.input.event === 'beforeInsert') {
        if (!doc.status) {
          doc.status = 'open';
        }
        doc.post_count = 0;
        doc.view_count = 0;
        doc.like_count = 0;
      }

      console.log(`✅ Forum topic validated: "${doc.title}" (slug: ${doc.url_slug})`);
    } catch (err) {
      console.error('❌ Error in ForumTopicValidationTrigger:', err);
      throw err;
    }
  }
};

/**
 * Forum Topic Moderation Hook
 * 
 * Flags topics for moderation when the author is not an agent or admin.
 */
const ForumTopicModerationTrigger: Hook = {
  name: 'ForumTopicModerationTrigger',
  object: 'forum_topic',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    try {
      if (doc.author_type !== 'agent' && doc.author_type !== 'admin') {
        doc.requires_moderation = true;
        console.log(`🔍 Forum topic "${doc.title}" by ${doc.author_type || 'unknown'} added to moderation queue.`);
      }
    } catch (err) {
      console.error('❌ Error in ForumTopicModerationTrigger:', err);
    }
  }
};

/**
 * Forum Post Creation Hook
 * 
 * After a post is created, updates the parent topic's post_count,
 * last_post_date, and last_post_by_id.
 */
const ForumPostCreationTrigger: Hook = {
  name: 'ForumPostCreationTrigger',
  object: 'forum_post',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    try {
      if (!doc.topic_id) {
        console.warn('⚠️ Forum post created without topic_id. Skipping topic update.');
        return;
      }

      const topics = await (ctx.ql as any).find('forum_topic', {
        filters: [['_id', '=', doc.topic_id]]
      });

      if (!topics || topics.length === 0) {
        console.warn(`⚠️ Parent topic ${doc.topic_id} not found.`);
        return;
      }

      const topic = topics[0];
      await (ctx.ql as any).update('forum_topic', topic._id, {
        post_count: (topic.post_count || 0) + 1,
        last_post_date: new Date().toISOString(),
        last_post_by_id: doc.author_id
      });

      console.log(`✅ Updated topic ${doc.topic_id}: post_count=${(topic.post_count || 0) + 1}`);
    } catch (err) {
      console.error('❌ Error in ForumPostCreationTrigger:', err);
    }
  }
};

/**
 * Forum Post Moderation Hook
 * 
 * Flags posts for moderation when the author is not an agent or admin.
 * Warns about low-quality content when content is too short.
 */
const ForumPostModerationTrigger: Hook = {
  name: 'ForumPostModerationTrigger',
  object: 'forum_post',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    try {
      if (doc.author_type !== 'agent' && doc.author_type !== 'admin') {
        doc.requires_moderation = true;
        console.log(`🔍 Forum post by ${doc.author_type || 'unknown'} added to moderation queue.`);
      }

      if (doc.content && doc.content.length < 10) {
        console.warn(`⚠️ Low-quality content detected: post content is only ${doc.content.length} characters.`);
      }
    } catch (err) {
      console.error('❌ Error in ForumPostModerationTrigger:', err);
    }
  }
};

export { ForumTopicValidationTrigger, ForumTopicModerationTrigger, ForumPostCreationTrigger, ForumPostModerationTrigger };
export default [ForumTopicValidationTrigger, ForumTopicModerationTrigger, ForumPostCreationTrigger, ForumPostModerationTrigger] as Hook[];
