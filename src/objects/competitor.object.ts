// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';

/**
 * Competitor Object
 *
 * Competitive-intelligence catalog: who we compete against, what they sell,
 * and how we stack up. Opportunities reference these records through the
 * multi-value `crm_competitors` lookup, replacing the former hard-coded
 * "Competitor A/B/C" multiselect.
 */
export const Competitor = ObjectSchema.create({
  name: 'crm_competitor',
  label: 'Competitor',
  pluralLabel: 'Competitors',
  icon: 'swords',
  description: 'Competitors we encounter in deals, with battlecard notes',

  // Competitive intel is a shared catalog — org-visible, owner-edited,
  // same posture as the campaign catalog (ADR-0090 D1/D7).
  sharingModel: 'public_read',
  highlightFields: ['name', 'threat_level', 'main_products', 'website'],

  fieldGroups: [
    { key: 'basic', label: 'Basic Information', icon: 'building' },
    { key: 'battlecard', label: 'Battlecard', icon: 'swords' },
  ],

  fields: {
    name: Field.text({
      label: 'Competitor Name',
      required: true,
      searchable: true,
      maxLength: 255,
      group: 'basic',
    }),

    website: Field.url({
      label: 'Website',
      group: 'basic',
    }),

    main_products: Field.textarea({
      label: 'Main Products',
      description: 'Flagship products / services we run into',
      group: 'basic',
    }),

    threat_level: Field.select({
      label: 'Threat Level',
      required: true,
      defaultValue: 'medium',
      trackHistory: true,
      group: 'basic',
      options: [
        { label: 'Low', value: 'low', color: '#00AA00' },
        { label: 'Medium', value: 'medium', color: '#FFA500', default: true },
        { label: 'High', value: 'high', color: '#FF0000' },
      ],
    }),

    our_advantages: Field.markdown({
      label: 'Our Advantages',
      description: 'Where we win against this competitor',
      group: 'battlecard',
    }),

    our_disadvantages: Field.markdown({
      label: 'Our Disadvantages',
      description: 'Where they beat us — objections to prepare for',
      group: 'battlecard',
    }),

    notes: Field.markdown({
      label: 'Notes',
      group: 'battlecard',
    }),

    owner: Field.lookup('sys_user', {
      defaultValue: cel`os.user.id`,
      label: 'Intel Owner',
      group: 'basic',
    }),

    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true,
      group: 'basic',
    }),
  },

  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['threat_level'] },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
