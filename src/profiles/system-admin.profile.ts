// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * System Administrator Profile
 *
 * The admin set must cover EVERY business object this app ships. Permission
 * sets are explicit-allow only (see `guest-portal.profile.ts`), so an object
 * missing from this map is permission-denied for admins too: the object-level
 * CRUD gate rejects the call before OWD, sharing or `view_all_data` is ever
 * consulted. `test/authorization-coverage.test.ts` pins that coverage so a new
 * object cannot ship without landing here.
 */
export const SystemAdminProfile = {
  name: 'system_admin',
  label: 'System Administrator',
  objects: {
    // `allowExport` on the five objects with an export surface — see the
    // canonical note in `src/profiles/index.ts`. It is authored even here:
    // 17.0 gates export on the explicit bit, and `modifyAllRecords` does not
    // stand in for it, so without these an admin cannot export either.
    crm_lead:        { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true, allowExport: true },
    crm_account:     { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true, allowExport: true },
    crm_contact:     { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true, allowExport: true },
    crm_opportunity: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true, allowExport: true },
    crm_quote:       { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    crm_contract:    { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    crm_product:     { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    crm_campaign:    { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    crm_case:        { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true, allowExport: true },
    crm_task:        { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    crm_event:       { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    crm_event_attendee: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    // The objects below shipped with navigation, views, hooks and seed data
    // but no grant in ANY permission set (#488): "Knowledge" and "Forecasts"
    // were permission-denied nav items for every user, admins included.
    crm_forecast:              { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    crm_knowledge_article:     { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    // Detail rows. Their RECORD-level access derives from the master
    // (ADR-0055 `controlled_by_parent`), but object-level CRUD is a separate
    // gate that is never derived — it has to be granted explicitly here.
    crm_opportunity_line_item: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    crm_quote_line_item:       { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
    crm_campaign_member:       { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true },
  },
  systemPermissions: [
    'view_setup', 'manage_users', 'customize_application',
    'view_all_data', 'modify_all_data', 'manage_profiles',
    'manage_roles', 'manage_sharing',
  ],
};
