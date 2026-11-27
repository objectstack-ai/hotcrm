// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Order to Cash figures on the contract and the account (#2416), as field
 * rows: every set that reads the contract or the account reads them, and none
 * edits them — they are computed (`src/o2c/extensions/`).
 *
 * The 2026-11-05 ruling on #2315 puts their access in the app package's sets
 * (reps read, finance reads; ⛔ no `readable: false` rows): a tenant that does
 * not use the module disables the package, and the fields are then served to
 * nobody (objectstack#30304, 18.4.0). Ruling C on hotcrm#2557 (comment
 * 6999611419) overrides the "no `readable: false` rows" wording for the
 * account's three: `crm_user`, the default set every member holds, hides
 * them, so the account's totals take a business role.
 *
 * Authored, not left silent, so each persona set says the figures are its to
 * read — and since ruling C an account row here is what opens the account's
 * totals to a set that holds no View All on the account (a field the default
 * set names `readable: false` is read only by a set that votes for it).
 * A set holding Modify All on the account reads every account field whatever
 * its rows say, so `sales_manager` names the contract's alone (`os lint`
 * reports an account row there as inert). `marketing_user` and
 * `service_agent` read no contracts, so they name the account's alone (an FLS
 * row on an object the set cannot read is an orphan,
 * `test/authorization-coverage.test.ts`). `project_member` names neither:
 * the 2026-11-15 ruling (hotcrm#2481) hides the account's totals from
 * consultants with `readable: false` rows of its own.
 */
const READ = { readable: true } as const;

// Unpaid and Uninvoiced replace the Receivable Balance (the 2026-11-26
// ruling, hotcrm#2806): each set reads the two exactly where it read the
// balance, so nobody gains or loses a figure's audience. The account's four
// `*_on_orders` / `*_on_contracts` are the hidden halves its two figures are
// summed from (`src/o2c/extensions/contract-account.extension.ts`), held to
// the same audience so an API read cannot rebuild a figure a set does not see.
export const O2C_CONTRACT_FIGURE_FIELDS = {
  'crm_contract.planned_amount':     READ,
  'crm_contract.invoiced_amount':    READ,
  'crm_contract.received_amount':    READ,
  'crm_contract.unpaid_amount':      READ,
  'crm_contract.uninvoiced_amount':  READ,
};

// Each half sums orders or contracts, which a set reading the account's
// totals may not read (`service_director`, `service_agent`,
// `marketing_user`): the totals are what it reads, never the rows, as for
// invoices and payments (Irene, 2026-11-17 05:08Z 「保持现在的范围」).
const HALF = {
  ...READ,
  rollupSourceUnreadableReason: 'The account\'s Unpaid and Uninvoiced are summed from these halves; a set that reads the totals reads them whether or not it reads the orders and contracts (hotcrm#2806).',
} as const;

export const O2C_ACCOUNT_FIGURE_FIELDS = {
  'crm_account.invoiced_amount':         READ,
  'crm_account.received_amount':         READ,
  'crm_account.unpaid_amount':           READ,
  'crm_account.uninvoiced_amount':       READ,
  'crm_account.unpaid_on_orders':        HALF,
  'crm_account.unpaid_on_contracts':     HALF,
  'crm_account.uninvoiced_on_orders':    HALF,
  'crm_account.uninvoiced_on_contracts': HALF,
};

/**
 * The account's figures for a set that reads them over invoice and payment
 * rows it may not read. Since hotcrm#2557 those rows hang off the account, and
 * Irene ruled 2026-11-17 05:08Z 「保持现在的范围」: service and marketing read
 * the account's totals only. `os lint` reports a roll-up over an unreadable
 * child as `security-rollup-source-unreadable`; each row here is the same
 * `readable: true` row as above plus the reason the lint quotes in its place
 * (`rollupSourceUnreadableReason`, @objectstack 18.6.0). The runtime does not
 * read the reason, so the field merge is what the plain rows give.
 */
export const o2cAccountFiguresOverUnreadRows = (reason: string) =>
  Object.fromEntries(
    Object.entries(O2C_ACCOUNT_FIGURE_FIELDS).map(([field, row]) => [field, 'rollupSourceUnreadableReason' in row ? row : { ...READ, rollupSourceUnreadableReason: reason }]),
  );

/** Both, for the sets that read the contract and the account (see above for the others). */
export const O2C_FIGURE_FIELDS = { ...O2C_CONTRACT_FIGURE_FIELDS, ...O2C_ACCOUNT_FIGURE_FIELDS };
