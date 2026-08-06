// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * "Conversion rate" is spelled 转化率 / 轉化率 on every Chinese page (#905).
 *
 * ## Why this needed a guard rather than a one-time sweep
 *
 * #801 / #825 / #829 established the convert verb face: the locale pack is the
 * contract, `convert_lead.label` is 转化线索 and `is_converted` is 已转化, so the
 * docs say 转化. #844 then swept 转换 -> 转化 across the Chinese pages — but its
 * "not part of this issue" list excluded the analytics *conversion rate* phrase,
 * reasoning that a metric name is not the convert verb.
 *
 * Measured on the baseline, that reason did not hold, and #905 is the bill:
 *
 *   - No Simplified page anywhere spelled it 转换率. Both Simplified twins
 *     already read 转化率, so the exclusion protected no metric spelling — it
 *     just left the Traditional side behind.
 *   - The phrase has no locale-pack entry to be a metric name against. It
 *     appears nowhere under `src/`; it is prose each page translates for itself.
 *     The nearest anchors the pack does give both follow 转化 —
 *     `crm_forecast.num_converted_leads.label` is 已转化线索数 and the dashboard's
 *     `open_leads.title` is 未转化线索.
 *   - So each Traditional page contradicted itself: `analytics/cubes.zh-Hant`
 *     said 轉化數量 at one bullet and 轉換率 sixteen lines later;
 *     `analytics/reports.zh-Hant` said 轉換率 in one table row and 轉化 in
 *     another — both halves already fixed by #844.
 *
 * Nothing caught it, because a phrase in an `.mdx` paragraph is prose: `os
 * validate` and `pnpm lint` walk authored metadata and never open
 * `content/docs`, and no locale-pack key exists for a docs test to derive the
 * expected spelling from. The check therefore has to live where the claim lives.
 *
 * ## The boundary: 转换率, never bare 转换
 *
 * This guard rejects exactly the three-character compound 转换率 / 轉換率. Bare
 * 转换 / 轉換 is deliberately untouched and MUST stay reachable: it names the
 * state-machine mechanism (state transition) on
 * `content/docs/administration/state-machines`, type coercion in the import
 * guides, and contract activation on `content/docs/revenue/contracts` — a
 * different word that happens to share a spelling with the retired convert
 * translation. #844 drew that line; this test does not move it, and widening
 * the pattern to bare 转换 would turn every one of those pages red.
 *
 * ## Why the negative assertion is not alone
 *
 * A pure "nobody spells it 转换率" assertion stays green if the sentence is
 * simply deleted — passing because nothing is produced, not because the wording
 * is right. {@link CARRIERS} pins the other direction: the pages that carry the
 * metric must still carry it, in both scripts. Delete the line and this file
 * goes red just as loudly as mis-spelling it does.
 */

const DOCS_ROOT = join(REPO_ROOT, 'content/docs');

/** The rejected spelling, both scripts. */
const REJECTED = ['转换率', '轉換率'];

/**
 * Pages that carry the conversion-rate metric, and the spelling each must use.
 *
 * Authored, not derived — there is no locale-pack key to derive it from, which
 * is the whole reason this file exists. A new page that states the metric
 * belongs here; the negative sweep below already covers it against the wrong
 * spelling either way.
 */
const CARRIERS: { page: string; 'zh-Hans': string; 'zh-Hant': string }[] = [
  { page: 'analytics/cubes', 'zh-Hans': '转化率', 'zh-Hant': '轉化率' },
  { page: 'analytics/reports', 'zh-Hans': '转化率', 'zh-Hant': '轉化率' },
];

/** Every Chinese docs page, in either script. */
const chineseDocs = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.zh-Han[st]\.mdx$/.test(entry.name)) out.push(full);
    }
  };
  walk(DOCS_ROOT);
  return out.sort();
};

describe('conversion rate reads 转化率 on every Chinese docs page (#905)', () => {
  const pages = chineseDocs();

  // Same spirit as `source-hygiene-scan-surface.test.ts`: a sweep that walks an
  // empty tree passes without checking anything. If the docs move, fail here
  // rather than silently reporting success over nothing.
  it('has Chinese docs pages to check', () => {
    expect(pages.length).toBeGreaterThan(50);
  });

  it('no Chinese page spells it 转换率 / 轉換率', () => {
    const offenders: string[] = [];
    for (const file of pages) {
      const text = readFileSync(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        for (const bad of REJECTED) {
          if (line.includes(bad)) {
            offenders.push(`${relative(REPO_ROOT, file)}:${i + 1} — ${bad}`);
          }
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it.each(CARRIERS)('$page still states the metric in both scripts', (carrier) => {
    for (const locale of ['zh-Hans', 'zh-Hant'] as const) {
      const file = join(DOCS_ROOT, `${carrier.page}.${locale}.mdx`);
      expect(readFileSync(file, 'utf8')).toContain(carrier[locale]);
    }
  });
});
