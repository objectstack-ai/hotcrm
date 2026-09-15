// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F } from '@objectstack/spec';
import { SALUTATION_OPTIONS, LEAD_SOURCE_OPTIONS } from './_picklists';

export const Contact = ObjectSchema.create({
  name: 'crm_contact',
  label: 'Contact',
  pluralLabel: 'Contacts',
  icon: 'user',
  description: 'People associated with accounts',

  // ADR-0090 D1/D7: OWD is an authored decision. Master-detail child of crm_account — inherits the account's sharing.
  sharingModel: 'controlled_by_parent',
  
  fieldGroups: [
    { key: 'identity',        label: 'Identity',             icon: 'user' },
    { key: 'account_info',    label: 'Account & Role',       icon: 'briefcase' },
    { key: 'buying_centre',   label: 'Buying Centre',        icon: 'users' },
    { key: 'contact_info',    label: 'Contact Information',  icon: 'phone' },
    { key: 'mailing_address', label: 'Mailing Address',      icon: 'map-pin', collapse: 'collapsed' },
    { key: 'additional',      label: 'Additional Info',      icon: 'info', collapse: 'collapsed' },
    { key: 'preferences',     label: 'Communication Preferences', icon: 'bell-off', collapse: 'collapsed' },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Contact Owner',
      group: 'account_info',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // Name fields
    salutation: Field.select({
      label: 'Salutation',
      group: 'identity',
      // Canonical set shared with Lead (#490) — see _picklists.ts.
      options: [...SALUTATION_OPTIONS],
    }),
    first_name: Field.text({
      label: 'First Name',
      required: true,
      storage: { notNull: true },
      searchable: true,
      group: 'identity',
    }),
    last_name: Field.text({
      label: 'Last Name',
      required: true,
      storage: { notNull: true },
      searchable: true,
      group: 'identity',
    }),

    // Formula field - Full name
    // `salutation` is a picklist, so the formula sees the raw VALUE (`ms`, `dr`),
    // not the label — names rendered as "ms Emily Davis" in lists and details
    // (#461). The formula language has no proper-case or option-label lookup, and
    // hardcoding "Ms." would defeat translation, so the name is built from the
    // name fields alone; salutation stays its own (translated) field.
    full_name: Field.formula({
      label: 'Full Name',
      expression: F`joinNonEmpty([record.first_name, record.last_name], ' ')`,
      group: 'identity',
    }),

    // Avatar field. `accept` / `maxSize` are server-enforced from
    // @objectstack 17 — see the note on `crm_product.image`.
    avatar: Field.avatar({
      label: 'Profile Picture',
      group: 'identity',
      accept: ['image/png', 'image/jpeg', 'image/webp'],
      maxSize: 2 * 1024 * 1024,
    }),

    // Relationship: Link to Account (Master-Detail)
    crm_account: Field.masterDetail('crm_account', {
      label: 'Account',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',  // Delete contacts when account is deleted
      group: 'account_info',
    }),

    // Professional Information
    title: Field.text({
      label: 'Job Title',
      group: 'account_info',
    }),

    department: Field.select({
      label: 'Department',
      group: 'account_info',
      options: [
        { label: 'Executive', value: 'executive' },
        { label: 'Sales', value: 'sales' },
        { label: 'Marketing', value: 'marketing' },
        { label: 'Engineering', value: 'engineering' },
        { label: 'Support', value: 'support' },
        { label: 'Finance', value: 'finance' },
        { label: 'Human Resources', value: 'hr' },
        { label: 'Operations', value: 'operations' },
      ]
    }),

    // ── Buying centre (REQ-0004) ─────────────────────────────────────────
    //
    // The three attributes that turn an account's contact list from a
    // DIRECTORY into a MAP: what this person does in the purchase decision,
    // where they stand on us, and how strong our relationship with them is.
    // `title` above is the employer's job title and `is_primary` below is a
    // one-bit answer to "who do we call" — neither of them is this fact.
    //
    // ⛔ Read by people and by reporting, never by a gate. No hook, no flow
    // and no validation is authored against any of the three, none is
    // `required`, and none carries an option `default`: a contact with all
    // three blank saves exactly as it did before this group existed
    // (REQ-0004 acceptance 4). They are sales intelligence, and AGENTS.md
    // metadata semantics rule 8 is what keeps a machine signal from refusing
    // a write.
    // ⚠️ `buying_function`, not `buying_role` — and 'Buying Function', not
    // 'Buying Role'. `security-role-word` (an author-time rule, ADR-0090 D3)
    // refuses the word `role` on BOTH, measured on this branch as two
    // successive `pnpm validate` exit-1 runs: first the field name, then the
    // label, because "admins must meet ONE vocabulary" and `role` is the
    // platform's security vocabulary (permission_set / position /
    // business_unit). Its own remedy prescribes the replacement used here —
    // "a domain word (e.g. 'function', 'duty')".
    //
    // The rule's surface is the ENGLISH one it can read: it matches
    // `/\brole(s)?\b/i` over object/field/action/permission-set/position/app
    // declarations and does not reach the locale packs. So the three
    // non-English packs keep the natural business term for this concept in
    // their own language (zh-CN 采购角色, es-ES Rol de Compra, ja-JP 購買役割)
    // — same fact, each written the way its reader says it.
    buying_function: Field.select({
      label: 'Buying Function',
      group: 'buying_centre',
      // SINGLE-valued, and REQ-0004 left that call to the implementing PR.
      // `multiple: true` would cost the field the property acceptance 2 asks
      // for: `GroupingConfigSchema` (`@objectstack/spec/ui`, the installed
      // pin) answers a grouped list with ONE server-side aggregate query, and
      // its `GroupingFieldSchema.field` says the group header "carries its
      // raw stored value" — so a multi-valued column groups by the
      // COMBINATION. `decision_maker` + `user` would become a group of its
      // own instead of feeding both, which is the opposite of reading an
      // account as a map. A person who is genuinely two things is recorded as
      // the role that governs THIS decision; the second one is already
      // legible from `title` / `department`.
      //
      // The six are the generic buying-centre slots every industry reads the
      // same way — ⛔ deliberately not one company's role model.
      options: [
        { label: 'Decision Maker',      value: 'decision_maker' },
        { label: 'Economic Buyer',      value: 'economic_buyer' },
        { label: 'Technical Evaluator', value: 'technical_evaluator' },
        { label: 'User',                value: 'user' },
        { label: 'Influencer',          value: 'influencer' },
        { label: 'Gatekeeper',          value: 'gatekeeper' },
      ]
    }),

    attitude: Field.select({
      label: 'Attitude to Us',
      group: 'buying_centre',
      // ORDERED, most to least favourable — declaration order IS the order a
      // picklist and a grouped list present, so the ladder is authored rather
      // than described. A blank means nobody has formed a view yet, which is
      // a different fact from `neutral`.
      options: [
        { label: 'Champion',   value: 'champion' },
        { label: 'Supportive', value: 'supportive' },
        { label: 'Neutral',    value: 'neutral' },
        { label: 'Skeptical',  value: 'skeptical' },
        { label: 'Blocker',    value: 'blocker' },
      ]
    }),

    relationship_strength: Field.select({
      label: 'Relationship Strength',
      group: 'buying_centre',
      // ORDERED, weakest to strongest. ⛔ Not a free-text score, and ⛔ not
      // derived from `last_contacted_date` below: recency is machine-written
      // and measures something else — a weekly call with someone who will not
      // take our side is not a strong relationship. A blank means unassessed;
      // `distant` is an assessment that came back weak.
      options: [
        { label: 'Distant',              value: 'distant' },
        { label: 'Acquaintance',         value: 'acquaintance' },
        { label: 'Working Relationship', value: 'working' },
        { label: 'Strong',               value: 'strong' },
        { label: 'Trusted Advisor',      value: 'trusted_advisor' },
      ]
    }),

    // No `reports_to`. The org chart was declared and never built: no page
    // rendered the tree the contact docs promised, no skill read the chain when
    // summarising an account, and no flow escalated along it. Sharing derives
    // from the master `crm_account`, never from this lookup.

    // Contact Information
    email: Field.email({
      label: 'Email',
      required: true,
      storage: { notNull: true },
      unique: true,
      group: 'contact_info',
    }),

    phone: Field.text({
      label: 'Phone',
      format: 'phone',
      group: 'contact_info',
    }),

    mobile: Field.text({
      label: 'Mobile',
      format: 'phone',
      group: 'contact_info',
    }),

    // Mailing Address
    mailing_street: Field.textarea({ label: 'Mailing Street', group: 'mailing_address' }),
    mailing_city: Field.text({ label: 'Mailing City', group: 'mailing_address' }),
    mailing_state: Field.text({ label: 'Mailing State/Province', group: 'mailing_address' }),
    mailing_postal_code: Field.text({ label: 'Mailing Postal Code', group: 'mailing_address' }),
    mailing_country: Field.text({ label: 'Mailing Country', group: 'mailing_address' }),

    // Additional Information
    //
    // No `birthdate`. Nothing greeted, segmented or reported on it, and an
    // importable date of birth with no consumer is personal data held for no
    // stated purpose — the one field on this object where "declared but inert"
    // also carries a data-protection cost.

    lead_source: Field.select({
      label: 'Lead Source',
      group: 'additional',
      // Canonical set shared with Lead + Opportunity (#490) — a converted
      // lead's source must remain representable on the contact.
      options: [...LEAD_SOURCE_OPTIONS],
    }),

    description: Field.markdown({
      label: 'Description',
      group: 'additional',
    }),

    // Flags
    is_primary: Field.boolean({
      label: 'Primary Contact',
      defaultValue: false,
      description: 'Is this the main contact for the account?',
      group: 'preferences',
    }),

    do_not_call: Field.boolean({
      label: 'Do Not Call',
      defaultValue: false,
      group: 'preferences',
    }),

    email_opt_out: Field.boolean({
      label: 'Email Opt Out',
      defaultValue: false,
      group: 'preferences',
    }),

    // Interaction recency for the PERSON (#592). `crm_account` carries
    // `last_activity_date` for the company and `crm_lead` carries
    // `last_contacted_date` for a prospect; the contact — the record a rep
    // actually calls and emails — had neither, so "when did anyone last speak
    // to our champion?" was unanswerable.
    //
    // Written by the activity bubble in `event.hook.ts` / `task.hook.ts` and by
    // `send_email`. Deliberately NOT `readonly`: a readonly field is stripped
    // from every non-system write whose caller supplied the key (#2948), which
    // is exactly how the account and lead columns above ended up permanently
    // null. It is kept off the form sections instead.
    last_contacted_date: Field.datetime({
      label: 'Last Contacted',
      group: 'additional',
    }),
  },
  
  // Enable features
  // API surface. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    // #602 — signed NDAs, business cards, meeting notes attach to the person.
    // See the canonical capability note in `src/objects/index.ts`.
    files: true,
  },
  
  // Database indexes for performance
  //
  // NOTE: no `{ fields: ['email'], unique: true }` here. Email uniqueness is
  // declared on the field itself (`unique: true`), which since framework #3696
  // materializes as the tenant composite `(organization_id, email)` — unique
  // WITHIN an organization, which is what a multi-tenant CRM wants (two orgs
  // may each know john@acme.com). A declared single-column index is taken
  // verbatim, i.e. platform-wide, so declaring both left the global index
  // enforcing the old behaviour and the per-tenant constraint unreachable
  // (framework#3991 `unique/double-declaration`).
  indexes: [
    { fields: ['crm_account'] },
    { fields: ['owner_id'] },
    { fields: ['last_name', 'first_name'] },
  ],
  
  // Display configuration. ADR-0079 `nameField` names the real field holding
  // the record title — here the `full_name` formula field defined above.
  nameField: 'full_name',
  // Explicit search targets (ADR-0061). REQUIRED because nameField is a
  // FORMULA (display_title/full_name): without this, $search auto-defaults to
  // the formula field, which isn't a real column, so the lookup picker + global
  // search silently return zero. These are real, indexed columns.
  searchableFields: ['first_name', 'last_name', 'email'],
  highlightFields: ['full_name', 'email', 'crm_account', 'phone'],
  
  // ⚠️ No standalone `type: 'unique'` validation exists on this platform
  // (ADR-0032 validation union). Email uniqueness is enforced by the
  // field-level `unique: true` above, scoped per organization.

  // ⚠️ No `workflows[]` here, and none is possible: object `workflows[]` were
  // removed from the platform. Field updates live in this object's `*.hook.ts`;
  // scheduled status flips and notifications live in `src/flows/*.flow.ts`.
});