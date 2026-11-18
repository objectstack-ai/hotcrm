// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The expense module's skills (REQ-0011, hotcrm#2617, F4b).
 *
 * The doctrine for this metadata type is written once, in
 * `src/sales/skills/index.ts`; this file is the expense package's half of
 * the same file-by-file registration.
 */
export { ExpenseFilingSkill } from './expense-filing.skill';
export { ExpenseCheckSkill } from './expense-check.skill';
