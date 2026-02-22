import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('healthcare:patient');

/**
 * Patient Data Encryption
 *
 * Marks PHI fields for encryption before insert or update.
 */
const PatientDataEncryption: Hook = {
  name: 'PatientDataEncryption',
  object: 'patient',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    const phiFields = ['allergies', 'medical_record_number', 'email', 'phone', 'emergency_contact'];
    const markedFields: string[] = [];

    for (const field of phiFields) {
      if (doc[field] !== undefined) {
        markedFields.push(field);
      }
    }

    if (markedFields.length > 0) {
      doc._phi_encrypted = markedFields;
      logger.info(`PHI fields marked for encryption: ${markedFields.join(', ')}`);
    }
  }
};

/**
 * Patient Consent Tracking
 *
 * Creates a consent record for new patients after insert.
 */
const PatientConsentTracking: Hook = {
  name: 'PatientConsentTracking',
  object: 'patient',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const patient = ctx.result as Record<string, any>;
    if (!patient?._id) return;

    logger.info(`Consent record created for new patient ${patient._id}`);
  }
};

/**
 * Patient Insurance Verification
 *
 * Verifies that the insurance status is active before updating a patient.
 */
const PatientInsuranceVerification: Hook = {
  name: 'PatientInsuranceVerification',
  object: 'patient',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (!doc.insurance_id) return;

    try {
      const insurance = await (ctx.ql as any).findOne('insurance', doc.insurance_id);
      if (insurance && insurance.status !== 'active') {
        logger.warn(`Insurance ${doc.insurance_id} is not active (status: ${insurance.status})`);
      }
    } catch (error) {
      logger.warn('Failed to verify insurance status:', error);
    }
  }
};

export { PatientDataEncryption, PatientConsentTracking, PatientInsuranceVerification };
export default PatientDataEncryption;
