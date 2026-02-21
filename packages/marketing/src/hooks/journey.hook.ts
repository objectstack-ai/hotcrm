import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('marketing:journey');


const VALID_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'completed', 'archived'];

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
 draft: ['scheduled', 'active', 'archived'],
 scheduled: ['active', 'paused', 'archived'],
 active: ['paused', 'completed', 'archived'],
 paused: ['active', 'completed', 'archived'],
 completed: ['archived'],
 archived: [],
};

/**
 * Journey Validation Trigger
 * 
 * Validates journey data on create/update:
 * - start_date must be before end_date
 * - Validate status transitions follow allowed paths
 */
const JourneyValidationTrigger: Hook = {
 name: 'JourneyValidationTrigger',
 object: 'journey',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 const doc = ctx.input.doc as Record<string, any>;

 // Validate start_date < end_date
 if (doc.start_date && doc.end_date) {
 const startDate = new Date(doc.start_date);
 const endDate = new Date(doc.end_date);
 if (startDate >= endDate) {
 throw new Error('Validation Error: Journey start_date must be before end_date.');
 }
 }

 // Validate status transitions
 if (doc.status) {
 if (!VALID_STATUSES.includes(doc.status)) {
 throw new Error(`Validation Error: Invalid journey status "${doc.status}".`);
 }

 const previousStatus = (ctx.input.previousDoc as Record<string, any>)?.status;
 if (previousStatus && previousStatus !== doc.status) {
 const allowed = VALID_STATUS_TRANSITIONS[previousStatus] || [];
 if (!allowed.includes(doc.status)) {
 throw new Error(
 `Validation Error: Cannot transition journey status from "${previousStatus}" to "${doc.status}".`
 );
 }
 }
 }

 logger.info(`🚀 Journey validated: status=${doc.status || 'draft'}`);

 } catch (error) {
 if (error instanceof Error && error.message.startsWith('Validation Error:')) {
 throw error;
 }
 logger.error('Error in JourneyValidationTrigger:', error);
 }
 }
};

/**
 * Journey Metrics Trigger
 * 
 * Updates journey metrics on update:
 * - Calculate conversion_rate = completed_contacts / total_contacts_entered * 100
 */
const JourneyMetricsTrigger: Hook = {
 name: 'JourneyMetricsTrigger',
 object: 'journey',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 const doc = ctx.input.doc as Record<string, any>;

 const totalEntered = doc.total_contacts_entered || 0;
 const completedContacts = doc.completed_contacts || 0;

 if (totalEntered > 0) {
 doc.conversion_rate = Math.round((completedContacts / totalEntered) * 100 * 100) / 100;
 } else {
 doc.conversion_rate = 0;
 }

 logger.info(`Journey metrics updated: conversion_rate=${doc.conversion_rate}%, total_entered=${totalEntered}, completed=${completedContacts}`);

 } catch (error) {
 logger.error('Error in JourneyMetricsTrigger:', error);
 }
 }
};

// Export all hooks
export {
 JourneyValidationTrigger,
 JourneyMetricsTrigger
};

export default JourneyValidationTrigger;
