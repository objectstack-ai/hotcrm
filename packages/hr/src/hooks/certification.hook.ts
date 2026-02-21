import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('hr:certification');

/**
 * Certification Expiration Validation Trigger
 * 
 * Validates certification data before insert/update:
 * 1. Expiry date must be after issue date
 * 2. Auto-set status based on expiry date
 * 3. Auto-set next_renewal_date if renewal_required
 */
const CertificationExpirationValidationTrigger: Hook = {
  name: 'CertificationExpirationValidationTrigger',
  object: 'certification',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;
    try {
      // Validate expiry_date is after issue_date
      if (doc.expiry_date && doc.issue_date) {
        const issueDate = new Date(doc.issue_date);
        const expiryDate = new Date(doc.expiry_date);

        if (expiryDate <= issueDate) {
          throw new Error(' Expiry date must be after issue date');
        }

        // Auto-update status based on expiry date
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (expiryDate < now) {
          doc.status = 'expired';
          doc.is_active = false;
          logger.info(`⏰ Certification "${doc.title}" has expired`);
        } else if (expiryDate < thirtyDaysFromNow) {
          doc.status = 'expiring_soon';
          logger.info(`Certification "${doc.title}" is expiring within 30 days`);
        }
      }

      // Auto-set next_renewal_date if renewal_required and expiry_date is set
      if (doc.renewal_required && doc.expiry_date && !doc.next_renewal_date) {
        const expiryDate = new Date(doc.expiry_date);
        // Set renewal date 30 days before expiry
        const renewalDate = new Date(expiryDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        doc.next_renewal_date = renewalDate.toISOString().split('T')[0];
        logger.info(`Auto-set renewal date: ${doc.next_renewal_date}`);
      }

      logger.info(`Certification validation passed: ${doc.title || 'unknown'}`);
    } catch (err) {
      logger.error('Error in CertificationExpirationValidationTrigger:', err);
      throw err;
    }
  }
};

/**
 * Certification Renewal Reminder Trigger
 * 
 * After update, check if certification status changed and log renewal reminders.
 * When a certification expires, mark it inactive on the employee record.
 */
const CertificationRenewalReminderTrigger: Hook = {
  name: 'CertificationRenewalReminderTrigger',
  object: 'certification',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const cert = ctx.result as Record<string, any>;
      const oldCert = ctx.previous as Record<string, any> | undefined;

      // Only process if status changed
      if (!oldCert || oldCert.status === cert.status) {
        return;
      }

      logger.info(`Certification status changed: ${oldCert.status} → ${cert.status} for "${cert.title}"`);

      // If certification expired, log a renewal reminder
      if (cert.status === 'expired' && cert.renewal_required) {
        logger.info(`Renewal reminder: Certification "${cert.title}" for employee ${cert.employee_id} has expired and requires renewal`);
      }

      // If certification is expiring soon, log a warning
      if (cert.status === 'expiring_soon') {
        logger.info(`Expiring soon: Certification "${cert.title}" for employee ${cert.employee_id} - renewal due by ${cert.next_renewal_date || cert.expiry_date}`);
      }

      logger.info(`Certification renewal check complete`);
    } catch (err) {
      logger.error('Error in CertificationRenewalReminderTrigger:', err);
    }
  }
};

export { CertificationExpirationValidationTrigger, CertificationRenewalReminderTrigger };
export default [CertificationExpirationValidationTrigger, CertificationRenewalReminderTrigger] as Hook[];
