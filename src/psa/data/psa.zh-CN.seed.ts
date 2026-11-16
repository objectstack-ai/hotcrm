// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twins of the rate cards, projects and project tasks
 * (#2316, #2411, #2545).
 * How a twin is built: `src/sales/data/_locale.ts`.
 */
import { projects, projectTasks, rateCards } from './psa.seed';
import { zhCNTwin, zhKey } from '../../sales/data/_locale';
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

const zhProjectName = zhKey('project', PROJECTS_ZH, 'name');

const PROJECT_TASKS_ZH: Record<string, Record<string, unknown>> = {
  'Stark pilot: discovery workshops': { name: '斯塔克试点：调研工作坊' },
  'Stark pilot: site configuration': { name: '斯塔克试点：院区配置' },
  'Stark pilot: configure site one': { name: '斯塔克试点：配置第一院区' },
  'Stark pilot: configure site two': { name: '斯塔克试点：配置第二院区' },
  'Stark pilot: configure site three': { name: '斯塔克试点：配置第三院区' },
  'Stark pilot: staff training': { name: '斯塔克试点：员工培训' },
  'Stark pilot: go-live review': { name: '斯塔克试点：上线评审' },
  'Wayne rollout: solution blueprint': { name: '韦恩推广：方案蓝图' },
  'Wayne rollout: hub deployments': { name: '韦恩推广：区域中心部署' },
  'Wayne rollout: north hub': { name: '韦恩推广：北区中心' },
  'Wayne rollout: south hub': { name: '韦恩推广：南区中心' },
  'Wayne rollout: east hub': { name: '韦恩推广：东区中心' },
  'Wayne rollout: west hub': { name: '韦恩推广：西区中心' },
  'Wayne rollout: handover to support': { name: '韦恩推广：移交运维' },
  'Vertex onboarding: enablement workshops': { name: '维特上手服务：赋能培训' },
  'Vertex onboarding: architecture review': { name: '维特上手服务：架构评审' },
  'Vertex onboarding: quarterly check-in': { name: '维特上手服务：季度回顾' },
  'Vertex scoping: solution design': { name: '维特售前：方案设计' },
  'Vertex scoping: phased plan': { name: '维特售前：分阶段计划' },
  'Vertex scoping: effort estimate': { name: '维特售前：工作量估算' },
  'Initech phase 1: migration assessment': { name: '英科一期：迁移评估' },
  'Initech phase 1: workload migration': { name: '英科一期：业务迁移' },
  'Initech phase 1: customer acceptance': { name: '英科一期：客户验收' },
};

const zhTaskName = zhKey('project task', PROJECT_TASKS_ZH, 'name');

export const projectTasksZhCN = zhCNTwin(projectTasks, {
  words: PROJECT_TASKS_ZH,
  text: ['name'],
  refs: { crm_project: zhProjectName, parent_task: zhTaskName },
  map: (twin) => (Array.isArray(twin.predecessors)
    ? { ...twin, predecessors: (twin.predecessors as string[]).map(zhTaskName) }
    : twin),
});
