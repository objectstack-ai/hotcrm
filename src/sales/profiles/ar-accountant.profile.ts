// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Accounts Receivable — finance's set for the Order to Cash module (#2315,
 * `docs/architecture/order-to-cash-module-plan.md`, *Permissions and sharing*).
 * The `crm_ar_accountant` position distributes it (`src/sales/sharing/positions.ts`).
 *
 * It lives in the APP package although every grant beyond the reads is on a
 * module object: permission sets stay whole here (ADR-0130 addendum,
 * 2026-09-02), and the app stack resolves the module's objects through
 * `artifactObjects`. A tenant that disables the module keeps the set; its
 * module rows then name objects the tenant does not serve.
 *
 * What finance does here is write the figures sales reads: invoices and
 * payments, by entry on the record page or by the module's import mappings.
 *
 *   - `crm_invoice`, `crm_payment` — full grants with Modify All: finance
 *     books every customer's invoices and receipts. ⛔ No transfer: the rows
 *     are not owned by anyone who could lose them. ⚠️ Both are
 *     `controlled_by_parent` under the contract, and on 18.3.0 the platform
 *     refuses a child write without EDIT on the master — Modify All on the
 *     child does not lift it (measured, the plan's *Phase 1a readings*). So
 *     until that is settled finance's writes answer 403; the set is authored
 *     as ruled, not bent around the gap by an edit grant on the contract.
 *   - `crm_billing_milestone` — read: the plan is sales'. Finance links an
 *     invoice or payment to a step, which is a write on the invoice or the
 *     payment, never on the step.
 *   - `crm_contract`, `crm_account` — read, every record: the contract is the
 *     invoice's master and the account is stamped on it, so finance must see
 *     every one it may invoice. ⛔ No edit on either.
 *
 * The record Attachments and Discussion panels take the same shape as in every
 * other set (`src/sales/objects/index.ts`, `enable.files` and `enable.feeds`).
 */
export const ArAccountantProfile = {
  name: 'ar_accountant',
  label: 'Accounts Receivable',
  description:
    'Finance: enters and imports the invoices and payments of every contract, and reads the contracts, accounts and collection plans behind them.',
  // Which HotCRM apps the holder's launcher offers (#2417): the Order to Cash
  // group sits in the Sales app, beside the contracts the invoices hang off,
  // so finance works there alone. Visibility, not access, as on `sales_rep`.
  tabPermissions: { crm_service: 'hidden' as const, crm_marketing: 'hidden' as const },
  objects: {
    crm_invoice:           { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true, modifyAllRecords: true },
    crm_payment:           { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true, modifyAllRecords: true },
    crm_billing_milestone: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_contract:          { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_account:           { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    sys_attachment:        { allowCreate: true,  allowRead: true, allowEdit: false, allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    sys_comment:           { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    sys_activity:          { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
  },
};
