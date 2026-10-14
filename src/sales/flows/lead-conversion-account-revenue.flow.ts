// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * The lead's annual revenue, copied onto the account a conversion just
 * created: the one elevated write in Convert Lead (#2016).
 *
 * ## Why this flow exists
 *
 * `lead_conversion` copies the lead's `annual_revenue` onto the NEW account it
 * creates: the lead field documents itself as exactly that value, and the
 * account's list views, roll-ups, `account_metrics` and the executive
 * dashboard read it. The `sales_rep` permission set makes
 * `crm_account.annual_revenue` read-only (`editable: false`), which is
 * published policy for admins. A screen flow runs as its caller, so a rep's
 * conversion into a new account was refused at `create_account` with
 * "Field write denied … [annual_revenue]", and nothing was converted.
 *
 * The maintainer's ruling (D, then B) keeps the lock and moves the write into
 * a dedicated `runAs: 'system'` flow called through a `subflow` node, which is
 * AGENTS.md house rule 9 ("Elevate as little as possible"). It waited for the
 * platform: through 17.7.0 any signed-in member could start a `runAs: 'system'`
 * autolaunched flow directly. Since 18.0.0-next.0 every door that starts a
 * flow by name (the trigger route, a `type: 'flow'` action, a declared
 * endpoint) refuses a non-system caller this flow, admin included, with
 * `PERMISSION_DENIED` / 403 (objectstack#22310, #22407). A parent's `subflow`
 * node is the only way in. `test/flow-conversion.test.ts` pins the refusal.
 *
 * ## Why it copies one column and does not create the account
 *
 * The account is created by the converting user's own write in
 * `lead_conversion` (`create_account`), so the object gate and every other
 * field permission still apply to it. This flow writes the one column that
 * user may not edit, onto the account that write just created. Same shape as
 * `case_escalation_stamp`: the user does the work, a system callee writes the
 * protected column afterwards.
 *
 * Creating the whole account here was measured first and refused: the system
 * context skips the object gate as well as the field lock. A marketing user or
 * a service agent (both may read leads; neither may create accounts) then
 * created an account through Convert Lead and the run failed one node later at
 * `create_contact`, leaving that account behind. Today their conversion into a
 * new company stops at `create_account` with nothing written, and it still
 * does.
 *
 * ## ⛔ What this flow deliberately does NOT do
 *
 * It reads nothing, so it scans nothing (house rule 10 governs elevated scans
 * and roll-ups). It updates one row by the id its caller hands it, and the
 * caller hands it the id of the account it created in the same run. A system
 * run keeps the trigger user's organization, and that account was born in the
 * converting user's organization by their own write.
 *
 * Elevation is not anonymity: the platform carries the converting user
 * through a system run, so the update is attributed to them (`updated_by`).
 */
export const LeadConversionAccountRevenueFlow: Flow = {
  name: 'lead_conversion_account_revenue',
  label: 'Copy Lead Revenue to New Account',
  description:
    "Write the converted lead's annual revenue onto the account lead_conversion just created, using the system context. Called by lead_conversion through a subflow node.",
  type: 'autolaunched',
  status: 'active',

  // ⭐ THE POINT OF THIS FILE: one `update_record`, one column.
  runAs: 'system',

  variables: [
    // Both supplied by `lead_conversion`'s `copy_account_revenue` node.
    // ⛔ `accountId` is only ever the account the caller created in the same
    // run. Handing this flow any other account would let a caller overwrite
    // revenue it may not edit.
    { name: 'accountId', type: 'text', isInput: true, isOutput: false },
    { name: 'annualRevenue', type: 'number', isInput: true, isOutput: false },
  ],

  nodes: [
    // `config: {}`: an autolaunched callee is handed its params by the
    // `subflow` executor and loads no trigger record of its own. Same shape as
    // `case_escalation_stamp` and the two campaign-member callees.
    { id: 'start', type: 'start', label: 'Start', config: {} },
    {
      id: 'copy_revenue', type: 'update_record', label: 'Copy Annual Revenue',
      config: {
        objectName: 'crm_account',
        filter: { id: cel`accountId` },
        // ⛔ Do not add fields here. Every column in this node is written with
        // the elevated context; anything the converting user may write belongs
        // in `lead_conversion`'s `create_account`.
        fields: { annual_revenue: cel`annualRevenue` },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'copy_revenue', type: 'default' },
    { id: 'e2', source: 'copy_revenue', target: 'end', type: 'default' },
  ],
};
