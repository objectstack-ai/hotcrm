// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineBook } from '@objectstack/spec';
import { SystemAdminProfile } from '../profiles/system-admin.profile';

/**
 * The Admin Manual (#2327) — who sees whose records, and where every automated
 * threshold lives. Opened from *Help*, and only by an administrator.
 *
 * ## The audience is the administrator's permission set
 *
 * `{ permissionSet }` is enforced at the REST read layer (ADR-0046 §6.7): a
 * member without the set gets 403 from `/meta/book/crm_admin_manual/tree` and
 * from `/meta/doc/crm_admin_*`, and the `type: 'doc'` entry in *Help* is not
 * served to them. One set per audience, so this names the community
 * composition's admin set, `system_admin`. The SaaS composition registers
 * `tenant_admin` INSTEAD of it, and swaps this audience the same way it swaps
 * the set (`objectstack.composition.ts`): a book gated on a set the install
 * does not register is readable by nobody, the administrator included —
 * measured on 18.2.0 with `tenant_admin` under the community composition
 * (403 for the dev admin, and a `security-book-audience-unknown-set` warning
 * from `objectstack build`).
 *
 * Only `crm_admin_*` pages are claimed here, and no other book claims them, so
 * their effective audience is this one alone (§6.7 union).
 */
export const CrmAdminManual = defineBook({
  name: 'crm_admin_manual',
  label: 'HotCRM Admin Manual',
  description: 'Access, sharing and every automated threshold — for administrators.',
  icon: 'shield-check',
  order: 2,
  audience: { permissionSet: SystemAdminProfile.name },
  groups: [
    { key: 'admin', label: 'Administration', order: 1, include: 'crm_admin_*' },
  ],
});
