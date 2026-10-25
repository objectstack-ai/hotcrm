// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * CRM User — the package's default permission set (#2231).
 *
 * `isDefault: true` is how a package says "every member gets this" (ADR-0090
 * D5): at install the platform records a `sys_audience_binding_suggestion` for
 * it, the package page offers it, and one acceptance binds it to the
 * `everyone` anchor — every signed-in member, future invitees included. On a
 * managed environment, where an invited colleague is created just in time
 * holding the platform baseline alone, this is what lets them open the Sales
 * app without a per-user assignment (objectstack#25083 ruling Q1 B: no "JIT
 * default set" key; the package's `isDefault` set is the path). Exactly one
 * set in this app carries the flag.
 *
 * WHY NOT `sales_rep`. The anchor refuses View All / Modify All, delete /
 * transfer and bulk export on any object, and platform `systemPermissions`
 * (`describeAnchorForbiddenBits`, `@objectstack/spec/security`). `sales_rep`
 * carries all three classes — export on five objects, View All on the
 * product and campaign catalogues, delete on its own activities — so the
 * acceptance would answer the high-privilege refusal. This set is the anchor-
 * safe floor instead, pinned by `test/default-permission-set.test.ts`.
 *
 * THE SHAPE. Every grant here is a subset of `sales_rep`'s, so a rep gains
 * nothing from holding it too. What it gives everyone else:
 *   - the sales book, OWN scope: create, read and edit their own leads,
 *     accounts, opportunities, tasks and events. Nothing is deleted, nothing
 *     exported, and ownership is assigned, never taken (no `allowTransfer`).
 *   - contacts and meeting attendees, `controlled_by_parent`: create, read
 *     and edit under the accounts and events the member can reach, so an own
 *     account gets its people and an own meeting its guests. No `readScope`
 *     (it would be inert on a parent-derived object).
 *   - the reference catalogues — products, campaigns, knowledge articles —
 *     READ, through their `public_read` OWD and without View All.
 *   - the record Attachments / Discussion / activity panels: read, and post
 *     and edit a comment, as `sales_rep`. The upload and the two deletes
 *     the position sets grant (#2038) are not here: the `everyone` anchor
 *     refuses delete on any object, and an upload for a member who holds no
 *     position is a call about this set of its own.
 *
 * WHAT IT DOES NOT GRANT, deliberately: quotes, contracts, line items and
 * campaign members. Each is `controlled_by_parent`, so a read here would reach
 * every child of every parent the HOLDER can read — and this set is held
 * alongside every persona. `marketing_user` reads every account and deal, and
 * `service_agent` every account, so the same grant that shows a bare member
 * the quotes of their own account would show those personas every quote and
 * contract in the organization. Campaign members hang off campaigns, which are
 * `public_read`, so that read would be every enrollment for every member.
 * Pricing and enrollment stay with the sales and marketing profiles.
 *
 * No `fields` block, deliberately. Field-level security merges MOST
 * PERMISSIVE over the fields a set authors (`getFieldPermissions`,
 * plugin-security), and this set is held by every member alongside their own:
 * a restriction authored here would narrow every persona that leaves the
 * field unauthored — `sales_manager` edits `crm_account.annual_revenue`
 * exactly because no set it holds names that field. Authoring nothing here
 * leaves every other persona's field security as it was.
 */
export const CrmUserProfile = {
  name: 'crm_user',
  label: 'CRM User',
  description:
    'The default set every member of the organization is offered at install: ' +
    'their own leads, accounts, opportunities and activities, and read access ' +
    'to the product, campaign and knowledge catalogues. No delete, no export, ' +
    'no View All, no system permissions.',
  isDefault: true,
  objects: {
    // ─── The sales book, own scope ────────────────────────────────────
    crm_lead:        { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_account:     { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_opportunity: { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_task:        { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_event:       { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },

    // ─── Under those records: `controlled_by_parent`, no readScope ────
    crm_contact:        { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_event_attendee: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },

    // ─── Reference catalogues: `public_read` OWD, so read needs no View All
    crm_product:           { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_campaign:          { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_knowledge_article: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },

    // ─── Record panels, as `sales_rep` minus upload and delete (#2029, #2038)
    sys_attachment: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    sys_comment:    { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    sys_activity:   { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
  },
};
