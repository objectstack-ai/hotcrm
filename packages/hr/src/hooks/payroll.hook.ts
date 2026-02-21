import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('hr:payroll');

const VALID_PAY_PERIODS = ['weekly', 'bi_weekly', 'semi_monthly', 'monthly'];

/**
 * Payroll Calculation Validation Trigger
 * 
 * Automatically handles:
 * 1. Validate base_salary >= 0
 * 2. Validate pay_period is a valid value
 * 3. Calculate gross_pay if not provided (from base_salary)
 */
const PayrollCalculationValidationTrigger: Hook = {
 name: 'PayrollCalculationValidationTrigger',
 object: 'payroll',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 try {
 // Validate base_salary >= 0
 if (doc.base_salary !== undefined && doc.base_salary < 0) {
 throw new Error(' base_salary must be greater than or equal to 0');
 }

 // Validate pay_period
 if (doc.pay_period && !VALID_PAY_PERIODS.includes(doc.pay_period)) {
 throw new Error(` Invalid pay_period "${doc.pay_period}". Must be one of: ${VALID_PAY_PERIODS.join(', ')}`);
 }

 // Calculate gross_pay if not provided
 if (doc.base_salary !== undefined && doc.gross_pay === undefined) {
 doc.gross_pay = doc.base_salary;
 logger.info(`Auto-calculated gross_pay: ${doc.gross_pay}`);
 }

 logger.info(`Payroll calculation validation passed`);
 } catch (err) {
 logger.error('Error in PayrollCalculationValidationTrigger:', err);
 throw err;
 }
 }
};

/**
 * Payroll Approval Trigger
 * 
 * Automatically handles:
 * 1. When status changes to 'approved', validate all required fields
 * 2. When status changes to 'processed', set processed_date to now
 */
const PayrollApprovalTrigger: Hook = {
 name: 'PayrollApprovalTrigger',
 object: 'payroll',
 events: ['beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 try {
 if (!ctx.previous || (ctx.previous as Record<string, any>).status === doc.status) {
 return;
 }

 // When status changes to 'approved', validate required fields
 if (doc.status === 'approved') {
 const requiredFields = ['employee', 'pay_period', 'base_salary'];
 const missingFields = requiredFields.filter(field => !doc[field] && doc[field] !== 0);

 if (missingFields.length > 0) {
 throw new Error(` Cannot approve payroll. Missing required fields: ${missingFields.join(', ')}`);
 }

 logger.info(`Payroll approved — all required fields present`);
 }

 // When status changes to 'processed', set processed_date
 if (doc.status === 'processed') {
 doc.processed_date = new Date().toISOString().split('T')[0];
 logger.info(`Payroll processed_date set to ${doc.processed_date}`);
 }

 logger.info(`Payroll status changed to "${doc.status}"`);
 } catch (err) {
 logger.error('Error in PayrollApprovalTrigger:', err);
 throw err;
 }
 }
};

export { PayrollCalculationValidationTrigger, PayrollApprovalTrigger };
export default [PayrollCalculationValidationTrigger, PayrollApprovalTrigger] as Hook[];
