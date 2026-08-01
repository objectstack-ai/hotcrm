// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Guest Portal Profile
 *
 * Permission set applied to anonymous (unauthenticated) visitors who submit
 * the public Web-to-Lead and Web-to-Case forms.
 *
 * IRON-CLAD RULE: guests must NEVER be able to read existing CRM data.
 * The only thing they can do is INSERT a new `crm_lead` or `crm_case` row through
 * the form views whose `sharing.allowAnonymous = true`.
 *
 * Any new object added to the CRM stack is implicitly DENIED for guests —
 * profile permissions are explicit-allow only.
 *
 * That includes every object granted to internal profiles by #488. In
 * particular `crm_knowledge_article` stays denied even though its `audience`
 * field marks some articles public: a customer-facing article surface would be
 * served by a portal view with `sharing.allowAnonymous`, never by widening the
 * guest set to read a CRM object.
 */
export const GuestPortalProfile = {
  name: 'guest_portal',
  label: 'Guest (Public Forms)',
  description:
    'Anonymous visitors submitting public Web-to-Lead / Web-to-Case forms. ' +
    'INSERT-only on lead and case; no read/edit/delete on any object.',
  // No `allowExport` anywhere below, deliberately: this set is bound to the
  // `guest` anchor, and ADR-0090 D9 classes `allowExport` as a high-privilege
  // bit no anchor may confer — the set would stop binding at all, on top of
  // handing anonymous visitors bulk table egress. See `src/profiles/index.ts`.
  objects: {
    crm_lead: {
      allowCreate: true,
      allowRead: false,
      allowEdit: false,
      allowDelete: false,
      viewAllRecords: false,
      modifyAllRecords: false,
    },
    crm_case: {
      allowCreate: true,
      allowRead: false,
      allowEdit: false,
      allowDelete: false,
      viewAllRecords: false,
      modifyAllRecords: false,
    },
  },
};
