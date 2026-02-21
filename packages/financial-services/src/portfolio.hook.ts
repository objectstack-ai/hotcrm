import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('financial-services:portfolio');

/**
 * Portfolio Drift Detection
 *
 * Detects when allocation drifts from target after update.
 */
const PortfolioDriftDetection: Hook = {
 name: 'PortfolioDriftDetection',
 object: 'portfolio',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const result = ctx.result as Record<string, any>;

 if (result?.allocation) {
 try {
 const allocation = JSON.parse(result.allocation);
 const totalPercent = Object.values(allocation).reduce((sum: number, val: any) => sum + Number(val), 0) as number;
 if (Math.abs(totalPercent - 100) > 5) {
 logger.info(`Drift detected for portfolio ${result._id}: allocation totals ${totalPercent}%`);
 }
 } catch {
 // Allocation is not valid JSON, skip drift detection
 }
 }
 }
};

/**
 * Portfolio Rebalance Trigger
 *
 * Triggers rebalance when drift exceeds threshold before update.
 */
const PortfolioRebalanceTrigger: Hook = {
 name: 'PortfolioRebalanceTrigger',
 object: 'portfolio',
 events: ['beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (doc.allocation) {
 try {
 const allocation = JSON.parse(doc.allocation);
 const totalPercent = Object.values(allocation).reduce((sum: number, val: any) => sum + Number(val), 0) as number;
 if (Math.abs(totalPercent - 100) > 10) {
 logger.info(`Rebalance triggered for portfolio: drift exceeds 10% threshold`);
 doc.rebalance_date = new Date().toISOString().split('T')[0];
 }
 } catch {
 // Allocation is not valid JSON, skip rebalance
 }
 }
 }
};

/**
 * Portfolio Performance Calculation
 *
 * Calculates YTD performance against benchmark after update.
 */
const PortfolioPerformanceCalc: Hook = {
 name: 'PortfolioPerformanceCalc',
 object: 'portfolio',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 const result = ctx.result as Record<string, any>;

 if (result?.total_value && result?.benchmark) {
 logger.info(`📈 Performance update for portfolio ${result._id}: YTD ${result.performance_ytd || 0}% vs benchmark ${result.benchmark}`);
 }
 }
};

export { PortfolioDriftDetection, PortfolioRebalanceTrigger, PortfolioPerformanceCalc };
export default PortfolioDriftDetection;
