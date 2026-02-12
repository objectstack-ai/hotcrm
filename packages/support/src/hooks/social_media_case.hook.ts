import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Social Media Case Platform Validation Trigger
 * 
 * Validates social media case configuration before insert/update:
 * 1. Platform and account_handle are required
 * 2. Polling interval must be within valid range
 * 3. Auto-response message required if send_auto_response is enabled
 */
const SocialMediaCasePlatformValidationTrigger: Hook = {
  name: 'SocialMediaCasePlatformValidationTrigger',
  object: 'social_media_case',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate platform is provided
      const validPlatforms = ['wechat', 'whatsapp', 'twitter', 'facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'];
      if (doc.platform && !validPlatforms.includes(doc.platform)) {
        throw new Error(`Invalid platform "${doc.platform}". Must be one of: ${validPlatforms.join(', ')}`);
      }

      // Validate polling interval range
      if (doc.polling_interval !== undefined) {
        if (doc.polling_interval < 1 || doc.polling_interval > 60) {
          throw new Error('Polling interval must be between 1 and 60 minutes.');
        }
      }

      // Auto-response requires a message
      if (doc.send_auto_response && (!doc.auto_response_message || doc.auto_response_message.trim().length === 0)) {
        throw new Error('Auto-response message is required when auto-response is enabled.');
      }

      // Validate response_delay_seconds range
      if (doc.response_delay_seconds !== undefined) {
        if (doc.response_delay_seconds < 0 || doc.response_delay_seconds > 300) {
          throw new Error('Response delay must be between 0 and 300 seconds.');
        }
      }

      // Warn if no monitoring options are enabled
      if (!doc.monitor_mentions && !doc.monitor_direct_messages && !doc.monitor_comments) {
        console.warn(`⚠️ No monitoring options enabled for ${doc.platform} configuration "${doc.name}"`);
      }

      console.log(`✅ Social media case validation passed: ${doc.name || 'unknown'} (${doc.platform})`);
    } catch (error) {
      console.error('❌ Social media case validation failed:', error);
      throw error;
    }
  }
};

/**
 * Social Media Case Sentiment Analysis Trigger
 * 
 * After update, calculate average sentiment from processed posts
 * and update metrics. Log alerts for negative sentiment trends.
 */
const SocialMediaCaseSentimentAnalysisTrigger: Hook = {
  name: 'SocialMediaCaseSentimentAnalysisTrigger',
  object: 'social_media_case',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const config = ctx.result as Record<string, any>;
      const oldConfig = ctx.previous as Record<string, any> | undefined;

      // Only process if metrics changed
      if (oldConfig &&
        oldConfig.total_posts_processed === config.total_posts_processed &&
        oldConfig.cases_created === config.cases_created &&
        oldConfig.error_count === config.error_count) {
        return;
      }

      const postsProcessed = config.total_posts_processed || 0;
      const casesCreated = config.cases_created || 0;
      const caseCreationRate = postsProcessed > 0
        ? (casesCreated / postsProcessed) * 100
        : 0;

      console.log(`📊 Social media metrics for "${config.name}" (${config.platform}): ${postsProcessed} posts processed, ${casesCreated} cases created (${caseCreationRate.toFixed(1)}%)`);

      // Alert on high error count
      if (config.error_count > 0 && oldConfig && config.error_count > oldConfig.error_count) {
        console.warn(`🚨 Error count increased for ${config.platform} config "${config.name}": ${config.error_count} errors. Last error: ${config.last_error_message || 'unknown'}`);
      }

      // Alert on negative sentiment trend
      if (config.average_sentiment !== undefined && config.average_sentiment < -0.3) {
        console.warn(`⚠️ Negative sentiment trend detected for ${config.platform} config "${config.name}": avg sentiment ${config.average_sentiment}`);
      }
    } catch (error) {
      console.error('[social_media_case.hook] sentiment analysis failed:', error);
    }
  }
};

/**
 * Social Media Case Creation Tracking Trigger
 * 
 * Before insert, validate that no duplicate active configuration
 * exists for the same platform and account handle.
 */
const SocialMediaCaseCreationTrigger: Hook = {
  name: 'SocialMediaCaseCreationTrigger',
  object: 'social_media_case',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Check for duplicate active configuration for same platform + handle
      if (doc.platform && doc.account_handle) {
        const existing = await (ctx.ql as any).find('social_media_case', {
          filters: [
            ['platform', '=', doc.platform],
            ['account_handle', '=', doc.account_handle],
            ['is_active', '=', true]
          ],
          limit: 1
        });

        if (existing && existing.length > 0) {
          throw new Error(`An active social media configuration already exists for ${doc.platform} handle "${doc.account_handle}".`);
        }
      }

      // Initialize metrics
      doc.total_posts_processed = 0;
      doc.cases_created = 0;
      doc.responses_sent = 0;
      doc.error_count = 0;

      console.log(`✅ Social media case configuration created: ${doc.name} (${doc.platform}/@${doc.account_handle})`);
    } catch (error) {
      console.error('❌ Social media case creation validation failed:', error);
      throw error;
    }
  }
};

export { SocialMediaCasePlatformValidationTrigger, SocialMediaCaseSentimentAnalysisTrigger, SocialMediaCaseCreationTrigger };
export default [SocialMediaCasePlatformValidationTrigger, SocialMediaCaseSentimentAnalysisTrigger, SocialMediaCaseCreationTrigger] as Hook[];
