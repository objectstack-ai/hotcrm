// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The demo data, once per language market (#2411).
 *
 * Maintainer ruling 2026-11-05 (option A, quoted untranslated): 「hotcrm 的模拟
 * 数据，能不能中文客户安装时安装中文数据」, then 「中文种子的问题都是 p1」. Every
 * seed dataset this app registers is declared for a list of locales on the
 * platform's `Seed.locale` axis (#16595): the English story for every supported
 * locale but Simplified Chinese, and a Simplified Chinese twin of each dataset
 * for `zh-CN`. A load picks one of the two by its locale; this app makes no
 * branch of its own.
 *
 * ## The twin is the English dataset in other words
 *
 * A twin is BUILT from its English dataset by {@link zhCNTwin}, record by
 * record: same count, same order, same statuses, priorities, amounts, flags and
 * relative dates. Only the words are authored, in a table keyed by the English
 * record's natural key, and the natural-key references between datasets are
 * translated through the same tables. So the dashboards, SLA clocks and
 * territory split read the same in both languages, and a record added to the
 * English story without its Chinese words throws at build time instead of
 * shipping a Chinese tenant an English row.
 *
 * ## Why every dataset is scoped, not only the ones with words
 *
 * A tag matches exactly (`zh` is not `zh-CN`), and an unscoped dataset loads for
 * every locale. Rows reference each other by natural key, and a Chinese
 * account's name is a Chinese name: an unscoped English opportunity would point
 * at an account a Chinese load never wrote. So the two stories are disjoint
 * end to end, and `test/seed-locale-twins.test.ts` holds every registered
 * dataset to one of the two lists.
 *
 * ⚠️ Blocked-by objectstack#30281. On 18.3.0 only the boot seed filters by
 * locale (it reads the artifact's `i18n.defaultLocale`, `en` here). Marketplace
 * install, sample-data reseed and package apply load every dataset, so a tenant
 * would receive both stories. The change ships when a pinned release carries
 * #30281 (AGENTS.md rule 2).
 */

type Rec = Record<string, unknown>;

/**
 * The locales the English story is for: every supported locale but `zh-CN`.
 * Written out because there is no "every locale except" spelling; an unlisted
 * locale would get no demo at all. Held to the app's `supportedLocales` by test.
 */
export const SEED_EN_LOCALES: string[] = ['en', 'ja-JP', 'es-ES'];

/** The locale the Simplified Chinese twins are for. */
export const SEED_ZH_CN_LOCALES: string[] = ['zh-CN'];

/** A seed dataset as this app authors it: its records, and whatever else the platform reads. */
export interface SeedLike {
  readonly object?: string;
  readonly records: readonly Rec[];
  readonly locale?: readonly string[];
  readonly [key: string]: unknown;
}

/** How one English dataset becomes its Simplified Chinese twin. */
export interface TwinSpec {
  /** The English record's natural key, which the `words` table is keyed by. */
  readonly key?: (english: Rec) => string;
  /** English natural key → the Chinese values of that record's word fields. */
  readonly words?: Readonly<Record<string, Rec>>;
  /**
   * The fields that carry words. Each one an English record fills must be
   * given in its `words` entry, or the build throws naming the record.
   */
  readonly text?: readonly string[];
  /** Reference columns, each translated from the English natural key it holds. */
  readonly refs?: Readonly<Record<string, (english: string) => string>>;
  /** A last step for a column the three above cannot express. */
  readonly map?: (twin: Rec, english: Rec) => Rec;
}

const label = (english: SeedLike) => String(english.object ?? 'seed');

/**
 * The Simplified Chinese twin of an English dataset: every record copied, its
 * word fields and references replaced, scoped to {@link SEED_ZH_CN_LOCALES}.
 */
export function zhCNTwin<S extends SeedLike>(english: S, spec: TwinSpec): S {
  const records = english.records.map((record, index) => {
    let twin: Rec = { ...record };
    if (spec.words) {
      const key = spec.key ? spec.key(record) : String(record.name);
      const words = spec.words[key];
      if (!words) {
        throw new Error(`Seed error: ${label(english)} record ${JSON.stringify(key)} has no zh-CN words`);
      }
      for (const field of spec.text ?? []) {
        const value = record[field];
        if (value !== undefined && value !== null && value !== '' && words[field] === undefined) {
          throw new Error(`Seed error: ${label(english)} record ${JSON.stringify(key)} has no zh-CN ${field}`);
        }
      }
      twin = { ...twin, ...words };
    } else if (spec.text?.length) {
      throw new Error(`Seed error: ${label(english)} declares word fields but no words (record ${index})`);
    }
    for (const [field, translate] of Object.entries(spec.refs ?? {})) {
      const value = record[field];
      if (typeof value === 'string' && value !== '') twin[field] = translate(value);
    }
    return spec.map ? spec.map(twin, record) : twin;
  });
  return { ...english, locale: SEED_ZH_CN_LOCALES, records } as S;
}

/**
 * A reference translator over a words table: the Chinese value of `field` for
 * the record the English key names. An unknown key throws, so a reference to a
 * record with no twin fails the build rather than resolving to nothing.
 */
export function zhKey(
  what: string,
  words: Readonly<Record<string, Rec>>,
  field: string,
): (english: string) => string {
  return (english) => {
    const value = words[english]?.[field];
    if (typeof value !== 'string' || value === '') {
      throw new Error(`Seed error: no zh-CN ${what} ${field} for ${JSON.stringify(english)}`);
    }
    return value;
  };
}

/** A reference translator over a plain English → Chinese map. */
export function zhLookup(what: string, map: Readonly<Record<string, string>>): (english: string) => string {
  return (english) => {
    const value = map[english];
    if (!value) throw new Error(`Seed error: no zh-CN ${what} for ${JSON.stringify(english)}`);
    return value;
  };
}
