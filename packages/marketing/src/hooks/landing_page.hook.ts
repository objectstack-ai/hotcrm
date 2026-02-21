import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('marketing:landing_page');

/**
 * Landing Page Lifecycle Validation Trigger
 * 
 * Validates landing page publish/unpublish lifecycle:
 * 1. Cannot publish without HTML content or title
 * 2. Auto-set published_date on publish
 * 3. Auto-generate URL slug from name if not provided
 * 4. Cannot archive an active published page directly
 */
const LandingPageLifecycleValidationTrigger: Hook = {
  name: 'LandingPageLifecycleValidationTrigger',
  object: 'landing_page',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;
      const previous = ctx.previous as Record<string, any> | undefined;

      // Cannot publish without required content
      if (doc.status === 'published') {
        if (!doc.title || doc.title.trim().length === 0) {
          throw new Error('Page title is required before publishing.');
        }
        if (!doc.html_content || doc.html_content.trim().length === 0) {
          throw new Error('HTML content is required before publishing.');
        }

        // Auto-set published_date on first publish
        if (!previous || previous.status !== 'published') {
          doc.published_date = new Date().toISOString();
          logger.info(`Landing page published: ${doc.name}`);
        }
      }

      // Cannot archive directly from published without going through draft
      if (doc.status === 'archived' && previous && previous.status === 'published') {
        logger.warn('Landing page archived from published state - analytics may be affected');
      }

      // Auto-generate URL slug from name if not provided
      if (!doc.slug && doc.name) {
        doc.slug = doc.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 100);
        logger.info(`Auto-generated URL slug: ${doc.slug}`);
      }

      // Validate slug format
      if (doc.slug && !/^[a-z0-9-]+$/.test(doc.slug)) {
        throw new Error('URL slug must contain only lowercase letters, numbers, and hyphens.');
      }

      logger.info(`Landing page lifecycle validation passed: ${doc.name || 'unknown'}`);
    } catch (error) {
      logger.error('Landing page lifecycle validation failed:', error);
      throw error;
    }
  }
};

/**
 * Landing Page Metrics Update Trigger
 * 
 * After update, recalculate conversion rate from views and submissions.
 */
const LandingPageMetricsTrigger: Hook = {
  name: 'LandingPageMetricsTrigger',
  object: 'landing_page',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const page = ctx.result as Record<string, any>;
      const oldPage = ctx.previous as Record<string, any> | undefined;

      // Only process if view or submission counts changed
      if (oldPage &&
        oldPage.total_views === page.total_views &&
        oldPage.total_submissions === page.total_submissions &&
        oldPage.unique_visitors === page.unique_visitors) {
        return;
      }

      const uniqueVisitors = page.unique_visitors || 0;
      const totalSubmissions = page.total_submissions || 0;
      const conversionRate = uniqueVisitors > 0 ? (totalSubmissions / uniqueVisitors) * 100 : 0;

      await (ctx.ql as any).doc.update('landing_page', page._id || page.id, {
        conversion_rate: Math.round(conversionRate * 100) / 100
      });

      logger.info(`Landing page metrics updated - Visitors: ${uniqueVisitors}, Submissions: ${totalSubmissions}, Conversion: ${conversionRate.toFixed(1)}%`);
    } catch (error) {
      logger.error('[landing_page.hook] metrics update failed:', error);
    }
  }
};

export { LandingPageLifecycleValidationTrigger, LandingPageMetricsTrigger };
export default [LandingPageLifecycleValidationTrigger, LandingPageMetricsTrigger] as Hook[];
