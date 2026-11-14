// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Order to Cash import mappings — finance's way in (REQ-0007). The doctrine is
 * the app's (`src/sales/mappings/index.ts`); these two live with the objects
 * they write (AGENTS.md, layout rule 3) and leave with the module.
 */

export { InvoiceImportMapping } from './invoice_import.mapping';
export { PaymentImportMapping } from './payment_import.mapping';
