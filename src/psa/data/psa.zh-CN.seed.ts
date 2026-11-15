// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twins of the rate cards and projects (#2316, #2411).
 * How a twin is built: `src/sales/data/_locale.ts`.
 */
import { projects, rateCards } from './psa.seed';
import { zhCNTwin } from '../../sales/data/_locale';
import { zhAccountName, zhOpportunityName } from '../../sales/data/sales.zh-CN.seed';

const RATE_CARDS_ZH: Record<string, Record<string, unknown>> = {
  'Junior Consultant': { name: '初级顾问' },
  'Consultant': { name: '顾问' },
  'Senior Consultant': { name: '高级顾问' },
  'Lead Architect': { name: '首席架构师' },
  'Principal Advisor': { name: '专家顾问' },
  'Internal Delivery': { name: '内部交付' },
};

export const rateCardsZhCN = zhCNTwin(rateCards, {
  words: RATE_CARDS_ZH,
  text: ['name'],
});

const PROJECTS_ZH: Record<string, Record<string, unknown>> = {
  'Stark Medical Pilot Delivery': {
    name: '斯塔克医疗试点交付',
    description: '交付客户已签约的临床运营试点：三个院区、八周，最后做上线评审。',
  },
  'Wayne Operations Module Rollout': {
    name: '韦恩运营模块推广',
    description: '把运营模块推广到客户的四个区域中心，按已批准的工时每月计费。',
  },
  'Vertex Developer Platform Onboarding': {
    name: '维特开发者平台上手服务',
    description: '按季度的包年服务：为客户的平台团队做赋能培训和架构评审。',
  },
  'Vertex Enterprise Rollout Scoping': {
    name: '维特企业级部署售前方案',
    description: '企业级部署的售前方案工作：方案设计、分阶段计划和工作量估算。',
  },
  'Initech Phase 1 Delivery': {
    name: '英科一期交付',
    description: '云迁移一期已交付并验收，等待结项评审。',
  },
  'Delivery Practice Enablement': {
    name: '交付能力建设',
    description: '内部项目：交付手册、模板和新顾问培训。',
  },
};

export const projectsZhCN = zhCNTwin(projects, {
  words: PROJECTS_ZH,
  text: ['name', 'description'],
  refs: { crm_account: zhAccountName, crm_opportunity: zhOpportunityName },
});
