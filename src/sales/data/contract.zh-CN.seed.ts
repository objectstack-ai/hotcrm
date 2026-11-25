// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twins of the contracts and the forecast snapshots
 * (#2411). How a twin is built: `./_locale.ts`.
 *
 * A contract's seed identity is its `description`, so the Chinese description
 * is the twin's key. `signed_by` is the signer's name as typed on the contract:
 * the Chinese contact's full name, family name first. A forecast snapshot keeps
 * its `seed_key`; only one of the two stories loads into an organization.
 */
import { contracts } from './contract.seed';
import { forecasts } from './forecast.seed';
import { zhCNTwin, zhKey, zhLookup } from './_locale';
import { zhAccountName, zhContactEmail, zhContactName, zhOpportunityName } from './sales.zh-CN.seed';

const CONTRACTS_ZH: Record<string, Record<string, unknown>> = {
  'Annual platform subscription with premium support tier.': { name: '艾克美平台订阅', description: '平台年度订阅，含高级支持服务。' },
  'Multi-year enterprise license with custom SLA.': { name: '韦恩企业级许可协议', description: '多年期企业级许可，含定制 SLA。' },
  'Initial service agreement, pending renewal discussion.': { name: '英泰科技服务协议', description: '首份服务协议，待续约洽谈。' },
  'Healthcare partnership agreement, currently under legal review.': { name: '斯塔克医疗合作协议', description: '医疗合作协议，目前在法务审核中。' },
};

/** A contract's Chinese seed identity, from its English one: what an O2C row's `crm_contract` names (#2529). */
export const zhContractDescription = zhKey('contract', CONTRACTS_ZH, 'description');

const SIGNERS: Record<string, string> = {
  'John Smith': 'john.smith@acme.example.com',
  'Michael Chen': 'mchen@initech.example.com',
};

export const contractsZhCN = zhCNTwin(contracts, {
  key: (r) => String(r.description),
  words: CONTRACTS_ZH,
  text: ['name', 'description'],
  refs: {
    crm_account: zhAccountName,
    crm_contact: zhContactEmail,
    crm_opportunity: zhOpportunityName,
    signed_by: (name) => zhContactName(zhLookup('contract signer', SIGNERS)(name)),
  },
  // The signed-copy sample keeps its bytes and takes a Chinese file name (#2317).
  map: (twin) => (twin.signed_copy && typeof twin.signed_copy === 'object'
    ? { ...twin, signed_copy: { ...twin.signed_copy, name: `${String(twin.crm_account)} - 已签合同（样例）.pdf` } }
    : twin),
});

const FORECASTS_ZH: Record<string, Record<string, unknown>> = {
  demo_month_current: { notes: '管道覆盖充足，预计本周有两笔承诺类商机成交。' },
  demo_quarter_minus_1: { notes: '季度收官，完成配额的 106%。' },
  demo_quarter_minus_2: { notes: '季度收官，完成配额的 92%：两笔企业级商机滑到了下个季度。' },
  demo_quarter_minus_3: { notes: '季度收官，完成配额的 109%，主要靠企业客户续约这一批。' },
  demo_quarter_minus_4: { notes: '新区域划分后的第一个季度，完成配额的 95%。' },
  demo_month_minus_1: { notes: '月度收官，完成配额的 105%；新业务偏弱的一个月由增购补上了。' },
  demo_month_minus_2: { notes: '月度收官，完成配额的 90%：中端市场整体进入夏季淡季。' },
};

export const forecastsZhCN = zhCNTwin(forecasts, {
  key: (r) => String(r.seed_key),
  words: FORECASTS_ZH,
  text: ['notes'],
});
