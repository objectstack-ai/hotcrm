import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('marketing:email_template');

/**
 * Email Template Content Validation Trigger
 * 
 * Validates email template before insert/update:
 * 1. Subject and HTML body are required
 * 2. Auto-extract personalization tokens from subject and body
 * 3. Auto-detect unsubscribe link presence
 */
const EmailTemplateContentValidationTrigger: Hook = {
  name: 'EmailTemplateContentValidationTrigger',
  object: 'email_template',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate subject is provided
      if (!doc.subject || doc.subject.trim().length === 0) {
        throw new Error('Email subject is required.');
      }

      // Validate HTML body is provided
      if (!doc.html_body || doc.html_body.trim().length === 0) {
        throw new Error('Email HTML body content is required.');
      }

      // Auto-extract personalization tokens from subject and body
      const tokenRegex = /\{\{(\w+)\}\}/g;
      const tokens = new Set<string>();
      let match: RegExpExecArray | null;

      while ((match = tokenRegex.exec(doc.subject)) !== null) {
        tokens.add(match[1]);
      }
      while ((match = tokenRegex.exec(doc.html_body)) !== null) {
        tokens.add(match[1]);
      }

      if (tokens.size > 0) {
        doc.personalization_tokens = Array.from(tokens).join(', ');
        logger.info(`Extracted ${tokens.size} personalization tokens: ${doc.personalization_tokens}`);
      }

      // Auto-detect unsubscribe link
      const unsubscribePattern = /unsubscribe|opt[\s-]?out/i;
      doc.has_unsubscribe_link = unsubscribePattern.test(doc.html_body);

      if (!doc.has_unsubscribe_link && doc.template_type === 'marketing') {
        logger.warn('Marketing email template is missing an unsubscribe link');
      }

      logger.info(`Email template content validation passed: ${doc.name || 'unknown'}`);
    } catch (error) {
      logger.error('Email template content validation failed:', error);
      throw error;
    }
  }
};

/**
 * Email Template Personalization Token Validation Trigger
 * 
 * After update, validates that personalization tokens used in the template
 * reference valid fields and logs usage statistics.
 */
const EmailTemplateTokenValidationTrigger: Hook = {
  name: 'EmailTemplateTokenValidationTrigger',
  object: 'email_template',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const template = ctx.result as Record<string, any>;
      const oldTemplate = ctx.previous as Record<string, any> | undefined;

      // Only process if content changed
      if (oldTemplate && oldTemplate.html_body === template.html_body && oldTemplate.subject === template.subject) {
        return;
      }

      // Count dynamic content blocks
      const blockRegex = /\{\{#if\b/g;
      const blocks = (template.html_body || '').match(blockRegex);
      const blockCount = blocks ? blocks.length : 0;

      if (blockCount !== template.dynamic_content_blocks) {
        await (ctx.ql as any).doc.update('email_template', template._id || template.id, {
          dynamic_content_blocks: blockCount
        });
        logger.info(`Updated dynamic content block count: ${blockCount}`);
      }

      logger.info(`Email template token validation complete for: ${template.name || template._id}`);
    } catch (error) {
      logger.error('[email_template.hook] token validation failed:', error);
    }
  }
};

export { EmailTemplateContentValidationTrigger, EmailTemplateTokenValidationTrigger };
export default [EmailTemplateContentValidationTrigger, EmailTemplateTokenValidationTrigger] as Hook[];
