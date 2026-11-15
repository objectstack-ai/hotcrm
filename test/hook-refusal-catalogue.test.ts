// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { extractHookBody } from '@objectstack/cli/hook-body';
import type { TranslationBundle } from '@objectstack/spec/system';
import { psaHooks } from '../src/psa';
import { PsaTranslations } from '../src/psa/translations';
import { o2cHooks } from '../src/o2c';
import { O2cTranslations } from '../src/o2c/translations';
import { marketingHooks } from '../src/marketing';
import { MarketingTranslations } from '../src/marketing/translations';

type AnyRec = Record<string, any>;

/**
 * Every hook refusal answers in the caller's language (hotcrm#2496).
 *
 * The platform translates a hook's refusal when the hook declares a `refusals`
 * catalogue (#26170, #33214): the thrown code, and the reason when one code
 * carries several sentences, pick the declared sentence, and the locale packs'
 * `hooks.<hook>.refusals.<CODE>[.reasons.<REASON>].message` replace it in the
 * caller's locale, its `{{ }}` holes filled from the thrown `params`. A hook
 * with no catalogue answers every caller in English, which is what a zh-CN
 * customer read at every HotCRM rule before this.
 *
 * Per package, as each one is done (the card is a family, one PR a package):
 *
 *  - every hook that throws `refuse(…)` declares a catalogue;
 *  - every code it throws is declared, and every literal `reason` it throws
 *    is declared under one of its codes (an undeclared code or reason is
 *    refused at run time, so the sentence would be lost, not just English);
 *  - every declared code and reason has a zh-CN, ja-JP and es-ES sentence,
 *    using only the `params` the entry declares, and the packs name nothing
 *    the catalogue does not declare.
 *
 * English is the declared message itself, so it is not repeated in `en`.
 */

const PACKAGES: Array<{ name: string; hooks: AnyRec[]; bundle: TranslationBundle }> = [
  { name: 'psa', hooks: psaHooks as AnyRec[], bundle: PsaTranslations },
  { name: 'o2c', hooks: o2cHooks as AnyRec[], bundle: O2cTranslations },
  { name: 'marketing', hooks: marketingHooks as AnyRec[], bundle: MarketingTranslations },
];

const LOCALES = ['zh-CN', 'ja-JP', 'es-ES'] as const;

/** `refuse(…, "CODE", NNN)` — the shape the printer emits (as `test/refusal-envelope.test.ts` reads it). */
const CALL = /,\s*"([A-Z][A-Z0-9_]+)",\s*(\d{3})\s*[,)]/g;
/** A literal reason in the lowered body: `reason: "snake_case"`. */
const REASON = /reason:\s*"([a-z][a-z0-9_]*)"/g;
/** A literal code on an error the hook builds itself: `code: "CODE"`. */
const CODE = /\bcode:\s*"([A-Z][A-Z0-9_]+)"/g;
const HOLE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

const lowered = (hook: AnyRec): string => extractHookBody(hook.handler, `hook '${hook.name}'`).source;
const all = (re: RegExp, s: string): string[] => [...s.matchAll(re)].map((m) => m[1]!);
const holes = (s: string): string[] => all(HOLE, s);

describe.each(PACKAGES)('hook refusals of the $name package are catalogued and translated', ({ hooks, bundle }) => {
  const refusing = hooks
    .map((hook) => ({ hook, source: lowered(hook) }))
    // A hook refuses through the `refuse(…)` envelope, or (like
    // `campaign_member_unique`) throws an error carrying a declared `code`.
    .filter(({ hook, source }) => /throw (refuse\(|Object\.assign\(refuse\()/.test(source) || hook.refusals !== undefined);

  it('has hooks that refuse, so the guard is guarding', () => {
    expect(refusing.length).toBeGreaterThan(0);
  });

  it.each(refusing.map(({ hook, source }) => [hook.name as string, hook, source] as const))(
    '%s declares every code and reason it throws',
    (_name, hook, source) => {
      const catalogue = (hook.refusals ?? {}) as AnyRec;
      expect(Object.keys(catalogue).length, 'no refusals catalogue').toBeGreaterThan(0);
      for (const code of new Set([...all(CALL, source), ...all(CODE, source)])) {
        expect(catalogue[code], `throws ${code}, which the catalogue does not declare`).toBeTruthy();
      }
      const reasons = new Set((Object.values(catalogue) as AnyRec[]).flatMap((e) => Object.keys(e.reasons ?? {})));
      for (const reason of new Set(all(REASON, source))) {
        expect(reasons.has(reason), `throws reason ${reason}, which no code declares`).toBe(true);
      }
      for (const [code, entry] of Object.entries(catalogue) as Array<[string, AnyRec]>) {
        const params = new Set<string>(entry.params ?? []);
        for (const sentence of [entry.message, ...(Object.values(entry.reasons ?? {}) as AnyRec[]).map((r) => r.message)]) {
          for (const hole of holes(sentence)) expect(params.has(hole), `${code}: {{${hole}}} is not a declared param`).toBe(true);
        }
      }
    },
  );

  it.each(LOCALES)('every declared sentence has its %s translation, and the pack names nothing undeclared', (locale) => {
    const pack = ((bundle[locale] as AnyRec)?.hooks ?? {}) as AnyRec;
    const problems: string[] = [];
    for (const { hook } of refusing) {
      const catalogue = (hook.refusals ?? {}) as AnyRec;
      const translated = (pack[hook.name]?.refusals ?? {}) as AnyRec;
      for (const [code, entry] of Object.entries(catalogue) as Array<[string, AnyRec]>) {
        const params = new Set<string>(entry.params ?? []);
        const t = translated[code] as AnyRec | undefined;
        const check = (where: string, sentence: unknown) => {
          if (typeof sentence !== 'string' || sentence.trim() === '') { problems.push(`${where}: missing`); return; }
          for (const hole of holes(sentence)) if (!params.has(hole)) problems.push(`${where}: {{${hole}}} is not a declared param`);
        };
        check(`${hook.name}.${code}`, t?.message);
        for (const reason of Object.keys(entry.reasons ?? {})) check(`${hook.name}.${code}.${reason}`, t?.reasons?.[reason]?.message);
        for (const reason of Object.keys(t?.reasons ?? {})) {
          if (!(reason in (entry.reasons ?? {}))) problems.push(`${hook.name}.${code}.${reason}: translated, not declared`);
        }
      }
      for (const code of Object.keys(translated)) if (!(code in catalogue)) problems.push(`${hook.name}.${code}: translated, not declared`);
    }
    for (const name of Object.keys(pack)) {
      if (!refusing.some(({ hook }) => hook.name === name)) problems.push(`${name}: translated, but no hook of this package refuses under that name`);
    }
    expect(problems).toEqual([]);
  });
});
