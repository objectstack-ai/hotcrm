// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { definePicklist } from '@objectstack/spec/data';

/**
 * Polymorphic "Related To" type — `crm_task.related_to_type` and
 * `crm_event.related_to_type`.
 *
 * Both activity objects carry the same five `related_to_*` lookups, and both
 * hooks bubble recency through the same `related_to_type → lookup field` map.
 * One list, referenced by name from both fields, so the vocabulary of the
 * discriminator cannot drift from the set of lookups that back it — a drift
 * that reads as "the bubble silently stopped firing for one object type".
 * (`crm_task` used to carry its own hand-copied five-value list beside the
 * shared constant `crm_event` spread; the reference closes that copy.)
 *
 * Each value is an object name, written out with its `crm_` prefix. Option
 * labels translate once, under `picklists.related_to_type` in each locale pack.
 */
export const RelatedToTypePicklist = definePicklist({
  name: 'related_to_type',
  label: 'Related To Type',
  description: 'Which kind of record an activity is about — shared by tasks and events.',
  options: [
    { label: 'Account',     value: 'crm_account' },
    { label: 'Contact',     value: 'crm_contact' },
    { label: 'Opportunity', value: 'crm_opportunity' },
    { label: 'Lead',        value: 'crm_lead' },
    { label: 'Case',        value: 'crm_case' },
  ],
});
