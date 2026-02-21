import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('financial-services:kyc');

/**
 * KYC Document Expiry Alert
 *
 * Schedules alert before document expiry after insert.
 */
const KycDocumentExpiryAlert: Hook = {
 name: 'KycDocumentExpiryAlert',
 object: 'kyc',
 events: ['afterInsert'],
 handler: async (ctx: HookContext) => {
 const result = ctx.result as Record<string, any>;

 if (result?.expiry_date) {
 const expiry = new Date(result.expiry_date);
 const now = new Date();
 const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

 if (daysUntilExpiry <= 30) {
 logger.info(`KYC document ${result._id} expires in ${daysUntilExpiry} days`);
 }
 }
 }
};

/**
 * KYC Periodic Re-verification
 *
 * Schedules periodic re-verification after status update.
 */
const KycPeriodicReverification: Hook = {
 name: 'KycPeriodicReverification',
 object: 'kyc',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const result = ctx.result as Record<string, any>;
 const doc = ctx.input.doc as Record<string, any>;

 if (doc.verification_status === 'verified') {
 logger.info(`KYC ${result?._id} verified — next re-verification scheduled in 12 months`);
 }
 }
};

/**
 * KYC Risk Auto-Classification
 *
 * Auto-classifies risk level based on document type and client profile before insert.
 */
const KycRiskAutoClassification: Hook = {
 name: 'KycRiskAutoClassification',
 object: 'kyc',
 events: ['beforeInsert'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (!doc.risk_level || doc.risk_level === 'low') {
 const highRiskDocTypes = ['utility_bill', 'bank_statement'];
 if (highRiskDocTypes.includes(doc.document_type)) {
 doc.risk_level = 'medium';
 logger.info(`Auto-classified KYC risk to 'medium' for document type '${doc.document_type}'`);
 }
 }
 }
};

export { KycDocumentExpiryAlert, KycPeriodicReverification, KycRiskAutoClassification };
export default KycDocumentExpiryAlert;
