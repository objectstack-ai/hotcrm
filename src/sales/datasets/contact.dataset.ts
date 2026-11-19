// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/** Contact analytics dataset (ADR-0021). */
export const ContactDataset = defineDataset({
  name: 'contact_metrics',
  label: 'Contact Metrics',
  description: 'Semantic layer for contact counts',
  object: 'crm_contact',
  dimensions: [],
  measures: [{
    name: 'contact_count',
    label: 'Contacts',
    description: 'How many contact records there are, the people at customer and partner companies; leads are counted separately and are not included.',
    synonyms: ['number of contacts', 'people', '联系人数'],
    aggregate: 'count',
  }],
});
