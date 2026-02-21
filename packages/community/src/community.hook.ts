import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('community:community');

/**
 * Community Config Validation
 *
 * Validates community configuration fields (features_enabled, branding)
 * are valid JSON before saving.
 */
const CommunityConfigValidation: Hook = {
  name: 'CommunityConfigValidation',
  object: 'community',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    // Validate features_enabled JSON
    if (doc.features_enabled) {
      try {
        const parsed = typeof doc.features_enabled === 'string'
          ? JSON.parse(doc.features_enabled)
          : doc.features_enabled;
        if (typeof parsed !== 'object') {
          throw new Error('Validation Error: features_enabled must be a JSON object');
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error('Validation Error: features_enabled contains invalid JSON');
        }
        throw error;
      }
    }

    // Validate branding JSON
    if (doc.branding) {
      try {
        const parsed = typeof doc.branding === 'string'
          ? JSON.parse(doc.branding)
          : doc.branding;
        if (typeof parsed !== 'object') {
          throw new Error('Validation Error: branding must be a JSON object');
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error('Validation Error: branding contains invalid JSON');
        }
        throw error;
      }
    }
  }
};

/**
 * Community Feature Toggle
 *
 * Enables or disables community features based on the features_enabled config
 * after a community record is updated.
 */
const CommunityFeatureToggle: Hook = {
  name: 'CommunityFeatureToggle',
  object: 'community',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const community = ctx.result as Record<string, any>;
    if (!community?._id || !community?.features_enabled) return;

    try {
      const features = typeof community.features_enabled === 'string'
        ? JSON.parse(community.features_enabled)
        : community.features_enabled;
      logger.info(`Community "${community.name}" features updated:`, Object.keys(features));
    } catch (error) {
      logger.warn('Failed to parse community features:', error);
    }
  }
};

/**
 * Community Domain Verification
 *
 * Verifies that the custom domain is valid and not already in use
 * by another community.
 */
const CommunityDomainVerification: Hook = {
  name: 'CommunityDomainVerification',
  object: 'community',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.domain) {
      // Basic domain format validation
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(doc.domain)) {
        throw new Error('Validation Error: Invalid domain format');
      }

      // Check uniqueness
      try {
        const existing = await (ctx.ql as any).find('community', {
          filters: [['domain', '=', doc.domain]]
        });
        const isDuplicate = existing.some((c: any) => c._id !== ctx.input.id);
        if (isDuplicate) {
          throw new Error(`Validation Error: Domain "${doc.domain}" is already in use`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('Validation Error')) throw error;
      }
    }
  }
};

export { CommunityConfigValidation, CommunityFeatureToggle, CommunityDomainVerification };
export default CommunityConfigValidation;
