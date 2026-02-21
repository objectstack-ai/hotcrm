import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('financial-services:wealth_account');

/**
 * Wealth Account Risk Assessment
 *
 * Validates that risk_profile matches investment_strategy before insert/update.
 */
const WealthAccountRiskAssessment: Hook = {
 name: 'WealthAccountRiskAssessment',
 object: 'wealth_account',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 const strategyRiskMap: Record<string, string[]> = {
 preservation: ['conservative'],
 income: ['conservative', 'moderate'],
 balanced: ['moderate', 'aggressive'],
 growth: ['aggressive', 'very_aggressive']
 };

 if (doc.investment_strategy && doc.risk_profile) {
 const allowed = strategyRiskMap[doc.investment_strategy];
 if (allowed && !allowed.includes(doc.risk_profile)) {
 logger.warn(`Risk profile '${doc.risk_profile}' may not align with '${doc.investment_strategy}' strategy`);
 }
 }
 }
};

/**
 * Wealth Account Suitability Check
 *
 * Ensures changes align with the client risk profile before update.
 */
const WealthAccountSuitabilityCheck: Hook = {
 name: 'WealthAccountSuitabilityCheck',
 object: 'wealth_account',
 events: ['beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (doc.investment_strategy && !doc.risk_profile) {
 try {
 const existing = await (ctx.ql as any).findOne('wealth_account', doc._id);
 if (existing?.risk_profile === 'conservative' && doc.investment_strategy === 'growth') {
 logger.warn(`Suitability concern: changing conservative account to growth strategy`);
 }
 } catch (error) {
 logger.warn('Failed to perform suitability check:', error);
 }
 }
 }
};

/**
 * Wealth Account Balance Alert
 *
 * Alerts when account balance drops below threshold after update.
 */
const WealthAccountBalanceAlert: Hook = {
 name: 'WealthAccountBalanceAlert',
 object: 'wealth_account',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const result = ctx.result as Record<string, any>;
 const doc = ctx.input.doc as Record<string, any>;

 const BALANCE_THRESHOLD = 10000;

 if (doc.balance !== undefined && doc.balance < BALANCE_THRESHOLD) {
 logger.info(`Balance alert for account ${result?._id}: balance $${doc.balance} below threshold $${BALANCE_THRESHOLD}`);
 }
 }
};

export { WealthAccountRiskAssessment, WealthAccountSuitabilityCheck, WealthAccountBalanceAlert };
export default WealthAccountRiskAssessment;
