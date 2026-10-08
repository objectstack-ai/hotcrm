// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { definePicklist } from '@objectstack/spec/data';

/**
 * Salutation — `crm_lead.salutation` and `crm_contact.salutation`.
 *
 * One list, referenced by name from both fields (`Field.select({ picklist:
 * 'salutation' })`), so the two vocabularies cannot drift apart (#490): a
 * converted lead's salutation always has a place on the contact it becomes.
 * `prof` was Contact-only before the two lists were unified.
 *
 * Option labels translate once, under `picklists.salutation` in each locale
 * pack (`src/sales/translations/<locale>/app.ts`); every referencing field
 * inherits them.
 */
export const SalutationPicklist = definePicklist({
  name: 'salutation',
  label: 'Salutation',
  description: 'How a person is addressed — shared by leads and contacts.',
  options: [
    { label: 'Mr.', value: 'mr' },
    { label: 'Ms.', value: 'ms' },
    { label: 'Mrs.', value: 'mrs' },
    { label: 'Dr.', value: 'dr' },
    { label: 'Prof.', value: 'prof' },
  ],
});
