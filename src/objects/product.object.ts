// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';

/**
 * Product Object
 * Represents products/services offered by the company
 */
export const Product = ObjectSchema.create({
  name: 'crm_product',
  label: 'Product',
  pluralLabel: 'Products',
  icon: 'box',
  description: 'Products and services offered by the company',

  // ADR-0090 D1/D7: OWD is an authored decision. Product catalog is org-visible; only owners edit.
  sharingModel: 'public_read',
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`,
  // which names a real field. The former template composed two local fields, so
  // a `display_title` formula field reproduces it for the record title.
  nameField: 'display_title',
  // Explicit search targets (ADR-0061). REQUIRED because nameField is a
  // FORMULA (display_title/full_name): without this, $search auto-defaults to
  // the formula field, which isn't a real column, so the lookup picker + global
  // search silently return zero. These are real, indexed columns.
  searchableFields: ['name', 'product_code', 'sku'],
  highlightFields: ['product_code', 'name', 'category', 'is_active'],

  fieldGroups: [
    { key: 'basic',    label: 'Product Information', icon: 'info' },
    { key: 'pricing',  label: 'Pricing',             icon: 'dollar-sign' },
    { key: 'metadata', label: 'Resources',           icon: 'link', defaultExpanded: false },
  ],

  fields: {
    // AutoNumber field - Unique product identifier
    product_code: Field.autonumber({
      label: 'Product Code',
      group: 'basic',
      format: 'PRD-{0000}',
    }),
    
    // Basic Information
    name: Field.text({
      label: 'Product Name',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 255,
    }),

    // ADR-0079 record title (was titleFormat '{product_code} - {name}').
    display_title: Field.formula({
      label: 'Display Title',
      group: 'basic',
      expression: F`record.product_code + " - " + record.name`,
    }),

    description: Field.markdown({
      label: 'Description',
      group: 'basic',
    }),

    // Categorization
    category: Field.select({
      label: 'Category',
      group: 'basic',
      options: [
        { label: 'Software', value: 'software', default: true },
        { label: 'Hardware', value: 'hardware' },
        { label: 'Service', value: 'service' },
        { label: 'Subscription', value: 'subscription' },
        { label: 'Support', value: 'support' },
      ]
    }),
    
    family: Field.select({
      label: 'Product Family',
      group: 'basic',
      options: [
        { label: 'Enterprise Solutions', value: 'enterprise' },
        { label: 'SMB Solutions', value: 'smb' },
        { label: 'Professional Services', value: 'services' },
        { label: 'Cloud Services', value: 'cloud' },
      ]
    }),
    
    // Pricing
    list_price: Field.currency({ 
      label: 'List Price',
      group: 'pricing',
      scale: 2,
      min: 0,
      required: true,
      storage: { notNull: true },
    }),
    
    cost: Field.currency({ 
      label: 'Cost',
      group: 'pricing',
      scale: 2,
      min: 0,
    }),
    
    // SKU
    //
    // `quantity_on_hand` / `reorder_point` were removed with the rest of the
    // inventory surface: nothing in this app decremented stock, and the "Low
    // Stock" view they fed compared against a hardcoded 10 rather than the
    // reorder point beside it. HotCRM sells from a catalog; warehouse state
    // belongs to the system of record that owns it.
    sku: Field.text({
      label: 'SKU',
      group: 'basic',
      maxLength: 50,
      unique: true,
    }),
    
    // Status
    is_active: Field.boolean({
      label: 'Active',
      group: 'basic',
      defaultValue: true,
      trackHistory: true,
    }),
    
    // Relationships
    product_manager: Field.lookup('sys_user', {
      label: 'Product Manager',
      group: 'basic',
    }),
    
    // Images and Assets
    // `accept` / `maxSize` are declarable AND server-enforced from
    // @objectstack 17 (ADR-0104 D3 wave 2). Before that the upload widget read
    // them but `FieldSchema` dropped them at parse, so the constraint existed
    // only in the browser and any direct API caller walked past it.
    image: Field.image({
      label: 'Product Image',
      group: 'metadata',
      accept: ['image/png', 'image/jpeg', 'image/webp'],
      maxSize: 5 * 1024 * 1024,
    }),

    datasheet: Field.file({
      label: 'Datasheet',
      group: 'metadata',
      accept: ['application/pdf'],
      maxSize: 20 * 1024 * 1024,
    }),

    // Tax & billing
    tax_rate: Field.percent({
      label: 'Default Tax Rate %',
      group: 'pricing',
      scale: 2,
      min: 0,
      max: 100,
      defaultValue: 0,
    }),

    // `billing_type` and `unit_of_measure` were removed with the tax flag: both
    // were seeded on all 13 catalog products and read by nothing — no quote
    // total, no revenue-recognition report and no line-item behaviour ever
    // consulted either. A picklist that only ever renders itself is a
    // maintenance obligation (four locales, an import column, every future
    // migration) charged against a capability that does not exist.
  },
  
  // Database indexes
  //
  // No `{ fields: ['sku'], unique: true }` here: the field-level `unique: true`
  // already builds the tenant composite `(organization_id, sku)` since
  // framework #3696. Declaring the single-column index too made the
  // platform-wide constraint win and left the per-tenant one unreachable
  // (framework#3991) — an SKU is unique inside a catalogue, and two
  // organizations may legitimately both stock "ABC-123".
  indexes: [
    { fields: ['name'] },
    { fields: ['category'] },
    { fields: ['is_active'] },
  ],
  
  // Enable advanced features
  // API surface. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
  
  // Validation Rules
  //
  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'price_positive',
      type: 'script',
      severity: 'error',
      message: 'List Price must be positive',
      // Two distinct guards, both required. `has(...)` answers "is the key
      // there at all" — on update the merged record is `{...previous, ...data}`
      // and a driver that stores only written columns hands back no key, which
      // aborts the whole predicate (#630). `!= null` then answers "does it hold
      // a value" — strict CEL cannot compare dyn<null> < int, the hazard
      // written up on `account.object.ts`. `list_price` is `required`, but the
      // rule also runs on partial updates that omit it.
      condition: P`has(record.list_price) && record.list_price != null && record.list_price < 0`,
    },
    {
      name: 'cost_less_than_price',
      type: 'script',
      severity: 'warning',
      message: 'Cost should be less than List Price',
      // Both operands need both guards: `cost` is optional and absent on every
      // seeded product, so this warning has never once evaluated.
      condition: P`has(record.cost) && record.cost != null && has(record.list_price) && record.list_price != null && record.cost >= record.list_price`,
    },
  ],
});
