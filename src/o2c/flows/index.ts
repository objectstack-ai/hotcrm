// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Order to Cash flow barrel — the flow that passes an order's contract, set
 * after the fact, to the order's plan steps, invoices and payments
 * (hotcrm#2724), and the two that keep a confirmed order's payment plan
 * (hotcrm#2806). Registered by the module's own stack (`src/o2c/index.ts`).
 */
export { SalesOrderContractFillFlow } from './sales-order-contract-fill.flow';
export { SalesOrderConfirmedPlanStepFlow } from './sales-order-confirmed-plan-step.flow';
export { SalesOrderAmountPlanStepFlow } from './sales-order-amount-plan-step.flow';
