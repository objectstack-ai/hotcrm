// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { matchDatasetTerms } from '@objectstack/service-analytics';
import stack from './helpers/composed-stack';

/**
 * The words a person asks in find the governed metric they mean (#2593).
 *
 * A question reaches a dataset member only by equality: the platform's dataset
 * tools (`list_datasets` with `terms`, ADR-0149 D1/D3) compare each word, after
 * one normalization, with every member's name, label and declared synonyms,
 * and a word that equals exactly one measure is answered by that measure. A
 * word that equals nothing falls back to raw rows with no governed definition.
 *
 * So the vocabulary is a business fact of this app, and this file pins it in
 * the user's words, not as a copy of the synonym lists: each word below is run
 * through the platform's own matcher, `matchDatasetTerms`, the function behind
 * `list_datasets`' `matches`, over every dataset the composed artifact ships.
 *
 *  - ONE_METRIC: words with exactly one right metric must hit that member and
 *    nothing else, in any dataset.
 *  - NO_METRIC: words that honestly fit several numbers, or none, must hit no
 *    member at all, so the agent asks which one is meant (offering each
 *    candidate's description) instead of picking one. `revenue` and `收入` fit
 *    won deals, an account's Annual Revenue and a project's Planned Revenue;
 *    `SLA` fits five SLA figures; `sales` / `销售额` fit won and open amounts;
 *    `销售漏斗` fits the forecast's Pipeline and the deals' Total Amount; and no
 *    measure counts open cases, so `open cases` / `未结工单` have none to hit.
 *
 * Labels are matched as authored (English). Under a zh-CN caller the platform
 * matches the pack label instead, which is why the Chinese words here are
 * synonyms rather than relying on a translated label.
 */

type AnyRec = Record<string, any>;
const DATASETS = ((stack as AnyRec).datasets ?? []) as AnyRec[];

const hitsFor = (word: string): string[] =>
  DATASETS.flatMap((d) =>
    matchDatasetTerms([word], { dimensions: d.dimensions ?? [], measures: d.measures ?? [] }).map((m) => `${d.name}.${m.member}`),
  );

const ONE_METRIC: Record<string, string> = {
  // Sales: deals, revenue, quota.
  商机数: 'opportunity_metrics.measures.opp_count',
  deals: 'opportunity_metrics.measures.opp_count',
  opportunities: 'opportunity_metrics.measures.opp_count',
  赢单金额: 'opportunity_metrics.measures.won_amount',
  bookings: 'opportunity_metrics.measures.won_amount',
  赢单收入: 'opportunity_metrics.measures.won_amount',
  赢单率: 'opportunity_metrics.measures.win_rate',
  'win rate': 'opportunity_metrics.measures.win_rate',
  客单价: 'opportunity_metrics.measures.avg_amount',
  'average deal size': 'opportunity_metrics.measures.avg_amount',
  销售目标: 'forecast_metrics.measures.quota_sum',
  quota: 'forecast_metrics.measures.quota_sum',
  'quota attainment': 'forecast_metrics.measures.attainment',
  pipeline: 'forecast_metrics.measures.pipeline_sum',
  客户数: 'account_metrics.measures.account_count',
  customers: 'account_metrics.measures.account_count',
  线索数: 'lead_metrics.measures.lead_count',
  leads: 'lead_metrics.measures.lead_count',
  // Service.
  工单数: 'case_metrics.measures.case_count',
  平均解决时长: 'case_metrics.measures.avg_resolution',
  // Project delivery.
  工时: 'time_utilization.measures.total_hours',
  hours: 'time_utilization.measures.total_hours',
  毛利: 'project_financials.measures.gross_margin_sum',
  项目数: 'project_financials.measures.project_count',
};

const NO_METRIC = ['revenue', '收入', 'SLA', 'sales', '销售额', '销售漏斗', 'open cases', '未结工单'];

describe('dataset vocabulary: a word in the user\'s language finds the governed metric (#2593)', () => {
  it('reads the datasets the artifact ships', () => {
    expect(DATASETS.map((d) => d.name)).toEqual(expect.arrayContaining(['opportunity_metrics', 'case_metrics', 'project_financials']));
  });

  it.each(Object.entries(ONE_METRIC))('「%s」 matches exactly %s', (word, member) => {
    expect(hitsFor(word)).toEqual([member]);
  });

  it.each(NO_METRIC)('「%s」 matches no member, so the agent asks which number is meant', (word) => {
    expect(hitsFor(word)).toEqual([]);
  });
});
