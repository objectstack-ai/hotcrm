// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Sales email-template barrel.
 *
 * An email template lives with the object its `notify` node is authored
 * against (AGENTS.md layout rule 3), so the packages that own notifying flows
 * each carry their own directory. `_bundle.ts` is the shared source the other
 * two read along their edge into sales.
 */
export { SalesEmailTemplates } from './crm.email-template';
