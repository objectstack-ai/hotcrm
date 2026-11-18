// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { Field } from '@objectstack/spec/data';

/**
 * The order's Source Quote (REQ-0010 rule 1, hotcrm#2558).
 *
 * `crm_sales_order` is the app package's and knows nothing of quotes; this
 * module adds the lookup through `objectExtensions` (ADR-0130 D5), so it comes
 * and goes with the quote module, as the order plan says of every field
 * another package contributes (`docs/architecture/sales-order-plan.md`,
 * *Fields other packages contribute*): disabled, the field leaves the order
 * and an order is entered by hand without it.
 *
 * Written by `quote_accepted_order` alone, which is why it is `readonly`: the
 * quote an order came from is a fact about its history, and it is also the
 * flow's one-order-per-quote check, so a person moving it would let a second
 * order be created for the same quote. `set_null`: deleting the quote keeps the
 * order (#720 keeps the records a settled quote references deletable). Its
 * related list puts the order on the quote's page.
 */
export const SalesOrderQuoteExtensions = [
  {
    extend: 'crm_sales_order',
    fields: {
      crm_quote: Field.lookup('crm_quote', {
        label: 'Source Quote',
        group: 'basic',
        readonly: true,
        deleteBehavior: 'set_null',
        relatedListColumns: ['order_number', 'name', 'status', 'order_date', 'total_price'],
      }),
    },
  },
];
