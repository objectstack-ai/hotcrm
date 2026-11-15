// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { O2C_ACCOUNT_FIGURE_FIELDS } from './_o2c-figures';

/**
 * Service Director — watches the escalations, works none (#2490, ruled A by
 * the maintainer 2026-11-15). The `crm_service_director` position distributes
 * it (`src/sales/sharing/positions.ts`).
 *
 * The position held no set, so a holder carried `crm_user` alone, which grants
 * nothing on `crm_case`: `case_director_sharing` (`src/service/sharing/
 * case.sharing.ts`) shares open critical cases to the position with read, but
 * a share widens rows inside an object grant and there was none to widen, so
 * every case list answered 403.
 *
 *   - `crm_case` — read, ⛔ no View All, `readScope: 'own'` as the agent set
 *     states it: the reach is the director share (critical and not closed),
 *     plus whatever another set the member holds already gives. Not the agent set (#1779 bound it to the
 *     manager pool): that set creates and edits cases, which a director does
 *     not.
 *   - `crm_account`, `crm_contact` — read, every record, as `service_agent`
 *     reads them, so the case page shows the customer behind it. Both are
 *     private / derived, so read without View All would open only the
 *     member's own.
 *   - `crm_invoice`, `crm_payment` — read, child rows: the account's Order to
 *     Cash figures sum them, and a set that reads a roll-up reads its source
 *     (`os lint` `security-rollup-source-unreadable`). Both are
 *     `controlled_by_parent` under the contract, which this set does not read,
 *     so the grant opens no invoice by itself (the same shape as
 *     `service_agent`).
 *   - The record panels read only: attachments, discussion and activity.
 *
 * ⛔ No create, edit, delete, transfer or export anywhere in this set. The
 * `crm_user` floor every member holds is unchanged (#2231: a member may still
 * create and edit their OWN leads, accounts and contacts); this set adds no
 * write to it.
 */
const READ_ALL = { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false } as const;
const READ = { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false } as const;

export const ServiceDirectorProfile = {
  name: 'service_director',
  label: 'Service Director',
  description:
    'Service leadership, read only: reads the escalated cases shared to the service director, with the accounts and contacts behind them.',
  // The Service app, as the service team's own set shows it (#2417).
  // Visibility, not access.
  tabPermissions: { crm_enterprise: 'hidden' as const, crm_marketing: 'hidden' as const, crm_o2c: 'hidden' as const, crm_psa: 'hidden' as const },
  objects: {
    crm_case:     { ...READ, readScope: 'own' as const },
    crm_account:  READ_ALL,
    crm_contact:  READ_ALL,
    crm_invoice:  READ,
    crm_payment:  READ,
    sys_attachment: READ,
    sys_comment:    READ,
    sys_activity:   READ,
  },
  fields: {
    // The account's Order to Cash figures (#2416); this set reads no
    // contracts, so the contract's are not authored here.
    ...O2C_ACCOUNT_FIGURE_FIELDS,
    'crm_case.is_sla_violated':       { readable: true, editable: false },
    'crm_case.resolution_time_hours': { readable: true, editable: false },
    'crm_case.internal_notes':        { readable: true, editable: false },
    'crm_account.health_score':       { readable: true, editable: false },
  },
};
