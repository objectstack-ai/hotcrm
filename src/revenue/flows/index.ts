// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Revenue flow barrel — the flows whose start node names `crm_quote` or
 * `crm_contract`. See `src/sales/flows/index.ts` for why the registration
 * order is assembled in `objectstack.config.ts` rather than here.
 */
export { QuoteGenerationFlow } from './quote-generation.flow';
export { ContractRenewalFlow } from './contract-renewal.flow';
export { QuoteExpirationFlow } from './quote-expiration.flow';
export { ContractExpirationFlow } from './contract-expiration.flow';
export { BillingHandoffContractActivatedFlow } from './billing-handoff-contract-activated.flow';
