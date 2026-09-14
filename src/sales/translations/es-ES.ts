// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

import { appSurface } from './es-ES/app';
import { customer } from './es-ES/objects.customer';
import { pipeline } from './es-ES/objects.pipeline';
import { commerce } from './es-ES/objects.commerce';
import { service } from './es-ES/objects.service';
import { activity } from './es-ES/objects.activity';
import { marketing } from './es-ES/objects.marketing';

/**
 * Español (es-ES) — CRM App Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 *
 * This bundle was one file and it had reached 88.6% of the 100KB source cap
 * `pnpm hygiene` enforces, growing ~1.2KB a day. It is now assembled from
 * `./<locale>/`, on an axis measured rather than guessed:
 *
 *   - every namespace that is NOT `objects` — `apps`, `messages`,
 *     `dashboards`, `datasets`, `pages`, and any namespace `TranslationData`
 *     gains later — lives in `app.ts`. Measured: those namespaces together
 *     are under a quarter of the bundle, and the schema bounds how many can
 *     ever arrive, so one file holds them with room left;
 *   - `objects` is 69-78% of every bundle, so it is partitioned again, one
 *     file per CRM domain family — `customer`, `pipeline`, `commerce`,
 *     `service`, `activity`, `marketing` — and a DETAIL object follows its
 *     master: line items follow their quote or opportunity,
 *     `crm_event_attendee` follows `crm_event`, `crm_campaign_member`
 *     follows `crm_campaign`, `crm_article_feedback` follows
 *     `crm_knowledge_article`.
 *
 * A namespace axis ALONE was measured and rejected: it leaves `objects` at
 * 65.7KB, 3.9KB under the advisory band, which `objects` growth crosses in
 * about nine days. The family axis puts the largest part at 24.2% of the cap.
 *
 * ⚠️ A new object translation belongs in the file for ITS family. Do not add
 * it to whichever file is already open — that is how one file re-grows past
 * the band, which is what split this bundle in the first place.
 *
 * ⚠️ A value used by more than one family lives in `<locale>/_shared.ts`. A
 * value used by exactly one family lives in that family's file.
 *
 * ⚠️ The key order below is LOAD-BEARING, not cosmetic. `objectstack build`
 * serialises this object into `dist/objectstack.json` in insertion order and
 * never sorts it, so listing the rows here — rather than spreading the family
 * files — is what keeps the built artifact byte-identical across the split.
 * The order is this bundle's own historical accretion order and differs
 * between locales; reordering it rewrites the artifact.
 */
export const esES: TranslationData = {
  objects: {
    crm_account: customer.crm_account,
    crm_contact: customer.crm_contact,
    crm_knowledge_article: service.crm_knowledge_article,
    crm_forecast: pipeline.crm_forecast,
    crm_lead: pipeline.crm_lead,
    crm_opportunity: pipeline.crm_opportunity,
    crm_case: service.crm_case,
    crm_contract: commerce.crm_contract,
    crm_product: commerce.crm_product,
    crm_quote: commerce.crm_quote,
    crm_task: activity.crm_task,
    crm_campaign: marketing.crm_campaign,
    crm_event: activity.crm_event,
    crm_event_attendee: activity.crm_event_attendee,
    crm_article_feedback: service.crm_article_feedback,
    crm_campaign_member: marketing.crm_campaign_member,
    crm_opportunity_line_item: pipeline.crm_opportunity_line_item,
    crm_quote_line_item: commerce.crm_quote_line_item,
  },
  ...appSurface,
};
