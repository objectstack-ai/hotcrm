// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twins of the rate cards, projects, project tasks and
 * budget versions with their lines (#2316, #2411, #2545, #2547).
 * How a twin is built: `src/sales/data/_locale.ts`.
 */
import { projectBudgetLines, projectBudgets, projects, projectTasks, rateCards } from './psa.seed';
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

const zhRateCardName = zhKey('rate card', RATE_CARDS_ZH, 'name');

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

/** The budget versions (#2547): the project's Chinese name, then the version. */
const PROJECT_BUDGETS_ZH: Record<string, Record<string, unknown>> = Object.fromEntries(
  projectBudgets.records.map((record) => {
    const english = String(record.name);
    const [project, version] = english.split(' · ');
    return [english, { name: `${zhProjectName(project)} · ${version}` }];
  }),
);
const BUDGET_WORDS_ZH: Record<string, Record<string, unknown>> = {
  'Stark Medical Pilot Delivery · v1': { notes: '已签约的试点：三个院区，八周。' },
  'Stark Medical Pilot Delivery · v2': { reason: '客户调整了病区布局，第三院区需要再做一轮配置。' },
  'Wayne Operations Module Rollout · v1': { notes: '四个区域中心，依次上线。' },
  'Wayne Operations Module Rollout · v2': { reason: '客户在南区中心追加了两周驻场保障。' },
};

const zhBudgetName = zhKey('budget version', PROJECT_BUDGETS_ZH, 'name');

export const projectBudgetsZhCN = zhCNTwin(projectBudgets, {
  words: Object.fromEntries(Object.entries(PROJECT_BUDGETS_ZH).map(([k, v]) => [k, { ...v, ...BUDGET_WORDS_ZH[k] }])),
  text: ['name', 'notes', 'reason'],
  refs: { crm_project: zhProjectName },
});

const BUDGET_LINES_ZH: Record<string, Record<string, unknown>> = {
  'Senior consultants': { description: '高级顾问' },
  'Consultants': { description: '顾问' },
  'Solution architecture': { description: '方案架构' },
  'Travel to the three sites': { description: '三个院区的差旅' },
  'Programme advisory': { description: '项目群咨询' },
  'Travel between the hubs': { description: '区域中心之间的差旅' },
  'Architecture review': { description: '架构评审' },
  'Enablement workshops': { description: '赋能培训' },
  'Workshop materials': { description: '培训资料' },
  'Solution design': { description: '方案设计' },
  'Effort estimate': { description: '工作量估算' },
  'Cloud sandbox for the prototype': { description: '原型用的云沙箱' },
  'Data-centre decommissioning partner': { description: '机房下线分包商' },
  'Playbook and templates': { description: '交付手册和模板' },
  'Training venue': { description: '培训场地' },
};

export const projectBudgetLinesZhCN = zhCNTwin(projectBudgetLines, {
  words: BUDGET_LINES_ZH,
  key: (record) => String(record.description),
  text: ['description'],
  refs: { crm_project_budget: zhBudgetName, rate_card: zhRateCardName },
});
