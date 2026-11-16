// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { packFor, type AnyRec } from './helpers/composed-stack';

/**
 * One zh-CN word per sales concept (#2521, #2523).
 *
 * Convert is 转化: the button 转化线索, the status and field 已转化 (#801,
 * #844, #846). Two files under `src/` still said 转换: the lead-conversion
 * notification templates (「线索已转换」 right after the 「转化线索」 click)
 * and the lead page's duplicate banners, one of which quoted the button as
 * 「转换线索」, a name it does not have.
 *
 * Lost is 丢单, win rate is 赢率, a closed deal is 已结单: the object, the
 * hooks and the dashboard widgets used them, while the `opportunity_metrics`
 * dataset labels (the column headers inside those same widgets) said 失单,
 * 赢单率 and 已定局, and the `win_loss` section said 输单. A reader met each
 * pair a few centimetres apart.
 *
 * Bare 转换 is rejected only under `src/`, which has no state-transition copy
 * today; the docs keep 转换 for state transitions (see
 * `docs-conversion-rate-spelling.test.ts`). The win/loss words are rejected
 * in the zh-CN sources (packs, seeds, templates, pages) and in every Simplified
 * docs page. The positive half pins the dataset labels, so a deleted label
 * cannot pass for a correct one.
 */

const files = (dir: string, keep: (p: string) => boolean): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p, keep));
    else if (keep(p)) out.push(p);
  }
  return out;
};
const hits = (paths: string[], words: string[]): string[] =>
  paths.flatMap((p) => readFileSync(p, 'utf8').split('\n').flatMap((line, i) =>
    words.filter((w) => line.includes(w)).map((w) => `${relative(REPO_ROOT, p)}:${i + 1} ${w}`)));

const SRC = join(REPO_ROOT, 'src');
const srcTs = files(SRC, (p) => p.endsWith('.ts'));
const RETIRED_WIN_LOSS = ['失单', '输单', '赢单率', '已定局'];

describe('zh-CN sales terms (#2521, #2523)', () => {
  it('convert is 转化 everywhere under src/', () => {
    expect(hits(srcTs, ['转换'])).toEqual([]);
  });

  it('the zh-CN sources say 丢单 / 赢率 / 已结单, never 失单 / 输单 / 赢单率 / 已定局', () => {
    expect(hits(srcTs, RETIRED_WIN_LOSS)).toEqual([]);
    const hans = files(join(REPO_ROOT, 'content/docs'), (p) => p.endsWith('.zh-Hans.mdx'));
    expect(hits(hans, RETIRED_WIN_LOSS)).toEqual([]);
  });

  it('the win/loss dataset labels and the win/loss section use the widget words', () => {
    const zh = packFor('zh-CN') as AnyRec;
    const metrics = zh?.datasets?.opportunity_metrics;
    expect({
      loss_reason: metrics?.dimensions?.loss_reason?.label,
      decided_count: metrics?.measures?.decided_count?.label,
      lost_amount: metrics?.measures?.lost_amount?.label,
      lost_count: metrics?.measures?.lost_count?.label,
      win_rate: metrics?.measures?.win_rate?.label,
    }).toEqual({ loss_reason: '丢单原因', decided_count: '已结单商机', lost_amount: '丢单金额', lost_count: '丢单数', win_rate: '赢率' });
    expect(zh?.objects?.crm_opportunity?._sections?.win_loss?.label).toBe('赢单/丢单');
  });
});
