// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Sales (the app package) picklists barrel.
 *
 * A picklist is a shared option list: one `*.picklist.ts` per list, and every
 * select field that offers it REFERENCES it by name — `Field.select({
 * picklist: 'industry' })` — instead of carrying a copy (objectstack#18164,
 * hotcrm#2000). The platform resolves the reference when it serves the object,
 * judges every write against the resolved set, and translates the list once
 * under `picklists.<name>` in each locale pack.
 *
 * A list lives in the lowest package all its fields depend on, which for these
 * four is sales: every field that references them is a sales object's. A list
 * only ONE field offers is not a picklist at all — it stays inline on that
 * field, where the reader of the object finds it.
 *
 * Registration is explicit, file by file, like every other metadata type: a
 * `*.picklist.ts` that is not re-exported here is registered by nothing, and a
 * field referencing it is refused by `pnpm validate` by name. The names are
 * plain snake_case with no `crm_` prefix — the prefix is the object naming
 * rule (`defineStack` enforces it on `objects` only), and a picklist, like a
 * flow or a dashboard, is not an object.
 */

export { IndustryPicklist } from './industry.picklist';
export { LeadSourcePicklist } from './lead_source.picklist';
export { RelatedToTypePicklist } from './related_to_type.picklist';
export { SalutationPicklist } from './salutation.picklist';
