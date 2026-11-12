// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import {
  CrmSeedData, CrmSeedDataZhCN, SaasTenantSeedData, seedDataFor, appStack,
} from '../objectstack.composition';
import { SEED_EN_LOCALES, SEED_ZH_CN_LOCALES } from '../src/sales/data/index';
import artifact from '../objectstack.config';
import { bootOptions } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The demo, once per language market (#2411).
 *
 * Maintainer ruling 2026-11-05, option A: a Chinese tenant gets Chinese demo
 * data. Every English seed dataset is declared for `SEED_EN_LOCALES`, and each
 * has a Simplified Chinese twin declared for `zh-CN`, built from it record by
 * record (`src/sales/data/_locale.ts`). The platform's `Seed.locale` filter
 * gives a load one of the two stories.
 *
 * Pinned here, without a boot: each twin is its English dataset in other words
 * (same count, codes, numbers, flags and dates), its words are Chinese, and
 * every registered dataset is scoped to exactly one of the two lists. Then the
 * selection is MEASURED on the one path that filters on the 18.3.0 pin, the
 * boot seed, which reads the artifact's `i18n.defaultLocale`: a zh-CN boot
 * seeds the Chinese story whole, and an `en` boot the English one. The install
 * paths wait on objectstack#30281.
 */

const pairs = (CrmSeedData as Rec[]).map((english, i) => [english, (CrmSeedDataZhCN as Rec[])[i]!] as const);

const CJK = /[一-鿿]/;
/** Three Latin words in a row reads as an English phrase; a product or protocol name (Okta, SAML, CSV) does not. */
const ENGLISH_PHRASE = /[A-Za-z][A-Za-z'’-]*(?:[ ,]+[A-Za-z][A-Za-z'’-]*){2,}/;
/** A picklist code, status or key: these never change between the two stories. */
const CODE = /^[a-z0-9_]+$/;

/** The columns a person reads as words. Each must be Chinese in a twin. */
const WORD_FIELDS = [
  'name', 'subject', 'title', 'description', 'summary', 'body', 'outcome_notes', 'notes', 'next_step',
  'loss_details', 'resolution', 'escalation_reason', 'company', 'internal_notes', 'first_name', 'last_name',
];

/** Brand and product names a Chinese description keeps in Latin script. */
const KEPT_NAMES = ['ObjectStack', 'Co-Pilot', 'SaaSCon 2026'];

describe('every zh-CN twin is its English dataset in other words', () => {
  it('one twin per English dataset, same object, mode, identity and record count', () => {
    expect(CrmSeedDataZhCN).toHaveLength(CrmSeedData.length);
    for (const [en, zh] of pairs) {
      expect(zh.object).toBe(en.object);
      expect(zh.mode).toBe(en.mode);
      expect(zh.externalId).toEqual(en.externalId);
      expect(zh.records, String(en.object)).toHaveLength(en.records.length);
    }
  });

  it('every code, number, flag and date is the English record\'s', () => {
    for (const [en, zh] of pairs) {
      for (const [i, english] of (en.records as Rec[]).entries()) {
        const twin = (zh.records as Rec[])[i]!;
        const where = `${String(en.object)}[${i}]`;
        expect(Object.keys(twin).sort(), where).toEqual(Object.keys(english).sort());
        for (const [key, value] of Object.entries(english)) {
          if (typeof value === 'string' && !CODE.test(value)) continue; // words and natural keys
          if (key === 'language') {
            // A knowledge article says which language it is written in.
            expect(twin[key], `${where}.${key}`).toBe('zh_cn');
            continue;
          }
          if (key === 'billing_address') {
            // The street and city are said in Chinese; what the territory rules read is kept.
            const { street: _s, city: _c, ...kept } = value as Rec;
            const { street: _zs, city: _zc, ...zhKept } = twin[key] as Rec;
            expect(zhKept, `${where}.${key}`).toEqual(kept);
            continue;
          }
          expect(twin[key], `${where}.${key}`).toEqual(value);
        }
      }
    }
  });

  it('every word a person reads is Chinese, with no English phrase left in it', () => {
    for (const [, zh] of pairs) {
      for (const [i, twin] of (zh.records as Rec[]).entries()) {
        for (const field of WORD_FIELDS) {
          const value = twin[field];
          if (typeof value !== 'string' || value === '') continue;
          const where = `${String(zh.object)}[${i}].${field}: ${value.slice(0, 60)}`;
          expect(value, where).toMatch(CJK);
          const stripped = KEPT_NAMES.reduce((text, name) => text.split(name).join(''), value);
          expect(stripped, where).not.toMatch(ENGLISH_PHRASE);
        }
      }
    }
  });

  it('no Chinese natural key reuses an English one, except the SKU-keyed catalogue and the coded forecast keys', () => {
    for (const [en, zh] of pairs) {
      if (typeof en.externalId !== 'string' || en.externalId === 'seed_key') continue;
      const field = en.externalId as string;
      const english = new Set((en.records as Rec[]).map((r) => r[field]));
      const chinese = (zh.records as Rec[]).map((r) => r[field]);
      expect(new Set(chinese).size, `${String(en.object)} keys are unique`).toBe(chinese.length);
      expect(chinese.filter((k) => english.has(k)), String(en.object)).toEqual([]);
    }
  });
});

describe('every registered dataset belongs to exactly one language market', () => {
  it('the two locale lists cover the app\'s supported locales, each exactly once', () => {
    const supported = [...(appStack as Rec).i18n.supportedLocales].sort();
    expect([...SEED_EN_LOCALES, ...SEED_ZH_CN_LOCALES].sort()).toEqual(supported);
  });

  it('the default composition registers every English dataset and its twin, each scoped', () => {
    const registered = Object.values(seedDataFor('default')).flat() as Rec[];
    expect(registered).toHaveLength(CrmSeedData.length * 2);
    for (const family of CrmSeedData as Rec[]) {
      expect(family.locale, String(family.object)).toEqual(SEED_EN_LOCALES);
      expect(registered.includes(family)).toBe(true);
    }
    for (const family of CrmSeedDataZhCN as Rec[]) {
      expect(family.locale, String(family.object)).toEqual(SEED_ZH_CN_LOCALES);
      expect(registered.includes(family)).toBe(true);
    }
  });

  it('the SaaS shape registers the catalogue in both languages, each scoped', () => {
    const locales = (SaasTenantSeedData as Rec[]).map((family) => family.locale);
    expect(locales).toEqual([
      SEED_EN_LOCALES, SEED_EN_LOCALES, SEED_EN_LOCALES,
      SEED_ZH_CN_LOCALES, SEED_ZH_CN_LOCALES, SEED_ZH_CN_LOCALES,
    ]);
  });
});

/** The shipped artifact, booting in `locale` — the seed path that filters on 18.3.0. */
const artifactIn = (locale: string): Rec => {
  const a = artifact as unknown as Rec;
  return { ...a, i18n: { ...a.i18n, defaultLocale: locale } };
};

/** Records a story seeds per object, summed over its datasets. */
const expectedCounts = (story: Rec[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const family of story) {
    const object = String(family.object);
    counts.set(object, (counts.get(object) ?? 0) + (family.records as Rec[]).length);
  }
  return counts;
};

/** Every column of a story's rows that names another of its rows, and must resolve. */
const LOOKUPS: Array<[object: string, field: string]> = [
  ['crm_contact', 'crm_account'],
  ['crm_opportunity', 'crm_account'],
  ['crm_opportunity_line_item', 'crm_opportunity'],
  ['crm_opportunity_line_item', 'crm_product'],
  ['crm_price_book_entry', 'crm_product'],
  ['crm_case', 'crm_account'],
  ['crm_event_attendee', 'crm_event'],
  ['crm_campaign_member', 'crm_campaign'],
  ['crm_contract', 'crm_account'],
  ['crm_quote', 'crm_account'],
  ['crm_quote_line_item', 'crm_quote'],
  ['crm_quote_line_item', 'crm_product'],
];

describe.each([
  { locale: 'zh-CN', story: CrmSeedDataZhCN as Rec[], other: CrmSeedData as Rec[], chinese: true },
  { locale: 'en', story: CrmSeedData as Rec[], other: CrmSeedDataZhCN as Rec[], chinese: false },
])('a boot in $locale seeds that story whole, and nothing of the other', ({ locale, story, other, chinese }) => {
  const inLanguage = (text: string) => CJK.test(text) === chinese;

  let stack: VerifyStack | undefined;

  beforeAll(async () => {
    stack = await bootStack(artifactIn(locale) as typeof artifact, bootOptions());
  }, 300_000);

  afterAll(async () => {
    await stack?.stop();
  });

  it('every object holds exactly that story\'s rows', async () => {
    for (const [object, count] of expectedCounts(story)) {
      // sys_activity also holds the audit trail the boot itself writes; its
      // seeded pointers are counted by their source below.
      if (object === 'sys_activity') continue;
      const rows = await stack!.rows(object);
      expect(rows.length, `${object} in a ${locale} boot`).toBe(count);
    }
    const pointers = await stack!.rows('sys_activity', { source_object: 'crm_event' });
    expect(pointers.length).toBe(expectedCounts(story).get('sys_activity'));
  });

  it('the names are that language\'s, and none is the other story\'s', async () => {
    for (const object of ['crm_account', 'crm_opportunity', 'crm_product', 'crm_campaign', 'crm_price_book']) {
      const names = (await stack!.rows(object)).map((r) => String(r.name));
      for (const name of names) expect(inLanguage(name), `${object} ${name}`).toBe(true);
      const otherNames = new Set(other.filter((f) => f.object === object).flatMap((f) => (f.records as Rec[]).map((r) => r.name)));
      expect(names.filter((n) => otherNames.has(n)), object).toEqual([]);
    }
    for (const subject of (await stack!.rows('crm_case')).map((r) => String(r.subject))) {
      expect(inLanguage(subject), `crm_case ${subject}`).toBe(true);
    }
  });

  it('every natural-key reference resolved to a row of the same story', async () => {
    for (const [object, field] of LOOKUPS) {
      const rows = await stack!.rows(object);
      const unresolved = rows.filter((r) => r[field] === null || r[field] === undefined || r[field] === '');
      expect(unresolved.length, `${object}.${field} unresolved in a ${locale} boot`).toBe(0);
    }
  });
});
