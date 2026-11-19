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
/**
 * Seed identities keep their old words. `opportunities` seeds with
 * `mode: 'ignore'` and `externalId: 'name'` (`sales.seed.ts`), so a deal name
 * is the row's identity: renaming one makes the next seed pass on a database
 * that already holds the old name insert a second, duplicate deal. These are
 * record data, not UI vocabulary, and stay as they landed (seat review on the
 * #2521/#2523 PR). Only an exact `name: '<identity>',` line is exempt.
 */
const SEED_IDENTITIES = new Set([
  '艾克美增购模块（输单）',
  '斯塔克医疗扩容（输单）',
  '环球工业产线扩展（输单）',
  '北风能源现场服务试点（输单）',
  '顶点物流合规报表（输单）',
]);
const isSeedIdentity = (line: string): boolean => {
  const m = /^\s*name: '([^']+)',\s*$/.exec(line);
  return m !== null && SEED_IDENTITIES.has(m[1]);
};
/**
 * A retired UI word can still be a word people TYPE. A dataset member's
 * `synonyms` are match input for the AI's dataset lookup (ADR-0149 D1): they
 * are compared with the words of a question and never drawn on a screen. So
 * 赢单率, the word the #2593 card quotes a person asking for, stays among
 * `win_rate`'s synonyms while every label and every page says 赢率. Only a
 * one-line `synonyms: [...]` in a `*.dataset.ts` file is exempt, and only for
 * the words listed here; the comment beside that line says the same.
 */
const TYPED_SYNONYMS = new Set(['赢单率']);
const isTypedSynonym = (path: string, line: string, word: string): boolean =>
  TYPED_SYNONYMS.has(word) && /[/\\]datasets[/\\][^/\\]+\.dataset\.ts$/.test(path) && /^\s*synonyms: \[.*\],\s*$/.test(line);
const hits = (paths: string[], words: string[]): string[] =>
  paths.flatMap((p) => readFileSync(p, 'utf8').split('\n').flatMap((line, i) =>
    isSeedIdentity(line) ? [] :
    words.filter((w) => line.includes(w) && !isTypedSynonym(p, line, w)).map((w) => `${relative(REPO_ROOT, p)}:${i + 1} ${w}`)));

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

  it('every exempt seed identity is still a zh-CN deal name (the allow list cannot go stale)', () => {
    const seed = readFileSync(join(SRC, 'sales/data/sales.zh-CN.seed.ts'), 'utf8');
    for (const name of SEED_IDENTITIES) expect(seed).toContain(`name: '${name}',`);
  });

  it('every exempt typed word is still a synonym of the win rate (the allow list cannot go stale)', () => {
    const dataset = readFileSync(join(SRC, 'sales/datasets/opportunity.dataset.ts'), 'utf8');
    const synonymLines = dataset.split('\n').filter((l) => /^\s*synonyms: \[.*\],\s*$/.test(l));
    for (const word of TYPED_SYNONYMS) expect(synonymLines.some((l) => l.includes(`'${word}'`))).toBe(true);
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
