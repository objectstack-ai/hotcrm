// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, cel } from '@objectstack/spec';

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
    { key: 'contact_info',    label: 'Contact Information',  icon: 'phone' },
    { key: 'mailing_address', label: 'Mailing Address',      icon: 'map-pin', defaultExpanded: false },
    { key: 'additional',      label: 'Additional Info',      icon: 'info', defaultExpanded: false },
    { key: 'preferences',     label: 'Communication Preferences', icon: 'bell-off', defaultExpanded: false },
  ],

  fields: {
    // Name fields
    salutation: Field.select({
      label: 'Salutation',
      group: 'identity',
      options: [
        { label: 'Mr.', value: 'mr' },
        { label: 'Ms.', value: 'ms' },
        { label: 'Mrs.', value: 'mrs' },
        { label: 'Dr.', value: 'dr' },
        { label: 'Prof.', value: 'prof' },
      ]
    }),
    first_name: Field.text({
      label: 'First Name',
      required: true,
      searchable: true,
      group: 'identity',
    }),
    last_name: Field.text({
      label: 'Last Name',
      required: true,
      searchable: true,
      group: 'identity',
    }),

    // Formula field - Full name
    full_name: Field.formula({
      label: 'Full Name',
      expression: F`joinNonEmpty([record.salutation, record.first_name, record.last_name], ' ')`,
      group: 'identity',
    }),

    // Avatar field
    avatar: Field.avatar({
      label: 'Profile Picture',
      group: 'identity',
    }),

    // Relationship: Link to Account (Master-Detail)
    crm_account: Field.masterDetail('crm_account', {
      label: 'Account',
      required: true,
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
        { label: 'HR', value: 'hr' },
        { label: 'Operations', value: 'operations' },
      ]
    }),

    // Relationship fields
    reports_to: Field.lookup('crm_contact', {
      label: 'Reports To',
      description: 'Direct manager/supervisor',
      group: 'account_info',
    }),

    owner: Field.lookup('user', {

      defaultValue: cel`os.user.id`,
      label: 'Contact Owner',
      group: 'account_info',
      trackHistory: true,
    }),

    // Contact Information
    email: Field.email({
      label: 'Email',
      required: true,
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
    birthdate: Field.date({
      label: 'Birthdate',
      group: 'additional',
    }),

    lead_source: Field.select({
      label: 'Lead Source',
      group: 'additional',
      options: [
        { label: 'Web', value: 'web' },
        { label: 'Referral', value: 'referral' },
        { label: 'Event', value: 'event' },
        { label: 'Partner', value: 'partner' },
        { label: 'Advertisement', value: 'advertisement' },
      ]
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
  },
  
  // Enable features
  // Dead object-level enable.* flags removed in @objectstack 12 (ADR-0049);
  // only the live API surface remains. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
  },
  
  // Database indexes for performance
  indexes: [
    { fields: ['crm_account'] },
    { fields: ['email'], unique: true },
    { fields: ['owner'] },
    { fields: ['last_name', 'first_name'] },
  ],
  
  // Display configuration
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`,
  // which names the real field holding the record title (here: the `full_name`
  // formula field already defined above).
  nameField: 'full_name',
  highlightFields: ['full_name', 'email', 'crm_account', 'phone'],
  
  // Validation Rules
  // `email_unique_per_account` (type: 'unique') was removed in 7.6 — the
  // standalone unique-validation type no longer exists (ADR-0032 validation
  // union). Email uniqueness is already enforced (globally, which is stricter
  // than per-account) by the `{ fields: ['email'], unique: true }` index above.

  // Workflow Rules
  // NOTE: object `workflows[]` were removed in @objectstack 7.7. Field-updates
  // moved to this object's *.hook.ts; scheduled status-flips & notifications
  // moved to src/flows/*.flow.ts (see flows/index.ts).
});