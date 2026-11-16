// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Project Delivery seeds (hotcrm#2316 phase 1a) — the rate cards, and a
 * handful of projects off the demo story's won deals.
 *
 * What is NOT seeded, and why: the staffing, timesheets and expenses all name
 * PEOPLE (`sys_user`), and the seed has no people to name — the demo staff are
 * created by `pnpm demo:staff` after boot, never by a seed. A project's cost
 * and margin therefore read zero on a fresh demo until someone staffs it and
 * books time. The projects are what a delivery manager opens first.
 *
 * Each project's plan is seeded too (hotcrm#2545, phase 2a): its tasks, their
 * tree, predecessors and milestones. No task names an owner (a `sys_user`),
 * and no hours are booked against one, for the reason above. A project's
 * Percent Complete is computed from them by `project_task.hook.ts`, which runs
 * on the seed write, so the figure each project shows is told by its tasks:
 *
 *   - Stark pilot: discovery done, site one well along, site two started → 36.2 %.
 *   - Wayne rollout: blueprint and the north hub done, the south hub at 40 % → 44.3 %.
 *   - Vertex onboarding (approved, not started): nothing done yet → 0 %.
 *   - Vertex scoping (presales): design done, the plan a quarter written → 57.5 %.
 *   - Initech phase 1 (completed): every task completed → 100 %.
 *   - Delivery Practice Enablement (draft): not planned yet, so empty.
 *
 * Each project's budget is seeded as versions with their lines (hotcrm#2547,
 * phase 2c), and its Approved Budget is the baseline version's total, summed
 * by the platform, never typed:
 *
 *   - Stark pilot: version 1 approved (78,000), and a version 2 top-up in
 *     Draft (85,800, ten percent more), ready to send.
 *   - Wayne rollout: version 1 (150,000) superseded by an approved version 2
 *     (165,000), the hypercare top-up.
 *   - Vertex onboarding, Vertex scoping, Initech phase 1: version 1 approved
 *     (36,000, 12,000, 60,000).
 *   - Delivery Practice Enablement (draft): version 1 in Draft (15,000), sent
 *     with the project when it goes for approval.
 *
 * A labor line names a rate card and its hours; its unit cost is the card's
 * cost per hour (a day card's over eight hours), copied by
 * `project_budget.hook.ts` on the seed write, as on a person's.
 *
 * Seed doctrine lives in `src/sales/data/_shared.ts`; the two-language rule in
 * `src/sales/data/_locale.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { RateCard } from '../objects/rate_card.object';
import { Project } from '../objects/project.object';
import { ProjectTask } from '../objects/project_task.object';
import { ProjectBudget } from '../objects/project_budget.object';
import { ProjectBudgetLine } from '../objects/project_budget_line.object';
import { SEED_EN_LOCALES } from '../../sales/data/_locale';

export const rateCards = defineSeed(RateCard, {
  mode: 'ignore',
  locale: SEED_EN_LOCALES,
  externalId: 'name',
  records: [
    { name: 'Junior Consultant', seniority: 'junior', unit: 'hour', cost_rate: 45, bill_rate: 90, is_internal: false },
    { name: 'Consultant', seniority: 'intermediate', unit: 'hour', cost_rate: 65, bill_rate: 130, is_internal: false },
    { name: 'Senior Consultant', seniority: 'senior', unit: 'hour', cost_rate: 85, bill_rate: 170, is_internal: false },
    { name: 'Lead Architect', seniority: 'lead', unit: 'day', cost_rate: 880, bill_rate: 1600, is_internal: false },
    { name: 'Principal Advisor', seniority: 'principal', unit: 'day', cost_rate: 1200, bill_rate: 2400, is_internal: false },
    { name: 'Internal Delivery', seniority: 'intermediate', unit: 'hour', cost_rate: 65, bill_rate: 0, is_internal: true },
  ],
});

export const projects = defineSeed(Project, {
  mode: 'ignore',
  locale: SEED_EN_LOCALES,
  externalId: 'name',
  records: [
    {
      name: 'Stark Medical Pilot Delivery',
      kind: 'delivery',
      billing_type: 'fixed_fee',
      status: 'active',
      crm_account: 'Stark Medical',
      crm_opportunity: 'Stark Medical Pilot',
      description: 'Deliver the clinical operations pilot the customer signed: three sites, eight weeks, go-live review at the end.',
      planned_start: cel`daysAgo(21)`,
      planned_end: cel`daysFromNow(35)`,
      actual_start: cel`daysAgo(19)`,
      planned_revenue: 120000,
    },
    {
      name: 'Wayne Operations Module Rollout',
      kind: 'delivery',
      billing_type: 'time_and_materials',
      status: 'active',
      crm_account: 'Wayne Enterprises',
      crm_opportunity: 'Wayne Operations Module Rollout',
      description: 'Roll the operations module out to the customer\'s four regional hubs, billed monthly on approved hours.',
      planned_start: cel`daysAgo(45)`,
      planned_end: cel`daysFromNow(60)`,
      actual_start: cel`daysAgo(44)`,
      planned_revenue: 260000,
    },
    {
      name: 'Vertex Developer Platform Onboarding',
      kind: 'delivery',
      billing_type: 'retainer',
      status: 'approved',
      crm_account: 'Vertex Analytics',
      crm_opportunity: 'Vertex Developer Platform Adoption',
      description: 'A quarterly retainer: enablement workshops and an architecture review for the customer\'s platform team.',
      planned_start: cel`daysFromNow(7)`,
      planned_end: cel`daysFromNow(97)`,
      planned_revenue: 54000,
    },
    {
      name: 'Vertex Enterprise Rollout Scoping',
      kind: 'presales',
      billing_type: 'non_billable',
      status: 'active',
      crm_account: 'Vertex Analytics',
      crm_opportunity: 'Vertex Enterprise Rollout',
      description: 'Presales scoping for the enterprise rollout: solution design, the phased plan and the effort estimate.',
      planned_start: cel`daysAgo(10)`,
      planned_end: cel`daysFromNow(14)`,
      actual_start: cel`daysAgo(10)`,
    },
    {
      name: 'Initech Phase 1 Delivery',
      kind: 'delivery',
      billing_type: 'fixed_fee',
      status: 'completed',
      crm_account: 'Initech Solutions',
      crm_opportunity: 'Initech Phase 1',
      description: 'Phase one of the cloud migration, delivered and accepted; waiting for the closing review.',
      planned_start: cel`daysAgo(120)`,
      planned_end: cel`daysAgo(20)`,
      actual_start: cel`daysAgo(118)`,
      actual_end: cel`daysAgo(15)`,
      planned_revenue: 90000,
    },
    {
      name: 'Delivery Practice Enablement',
      kind: 'internal',
      billing_type: 'non_billable',
      status: 'draft',
      crm_account: 'Acme Corporation',
      description: 'Internal: the delivery playbook, templates and training for new consultants.',
      planned_start: cel`daysFromNow(14)`,
      planned_end: cel`daysFromNow(74)`,
    },
  ],
});

/**
 * The projects' plans (hotcrm#2545). A summary task (one with subtasks) is
 * listed before its subtasks, and a predecessor before the task that waits for
 * it, so each reference names a row already written. Task names carry their
 * project's short name: the seed identity is the name, and two projects may
 * both have a "Discovery".
 */
export const projectTasks = defineSeed(ProjectTask, {
  mode: 'ignore',
  locale: SEED_EN_LOCALES,
  externalId: 'name',
  records: [
    // Stark Medical Pilot Delivery — three sites, eight weeks.
    { name: 'Stark pilot: discovery workshops', crm_project: 'Stark Medical Pilot Delivery', status: 'completed', planned_hours: 40, percent_complete: 100, planned_start: cel`daysAgo(21)`, planned_end: cel`daysAgo(14)` },
    { name: 'Stark pilot: site configuration', crm_project: 'Stark Medical Pilot Delivery', status: 'in_progress', planned_start: cel`daysAgo(13)`, planned_end: cel`daysFromNow(14)` },
    { name: 'Stark pilot: configure site one', crm_project: 'Stark Medical Pilot Delivery', parent_task: 'Stark pilot: site configuration', predecessors: ['Stark pilot: discovery workshops'], status: 'in_progress', planned_hours: 60, percent_complete: 80, planned_start: cel`daysAgo(13)`, planned_end: cel`daysAgo(2)` },
    { name: 'Stark pilot: configure site two', crm_project: 'Stark Medical Pilot Delivery', parent_task: 'Stark pilot: site configuration', predecessors: ['Stark pilot: configure site one'], status: 'in_progress', planned_hours: 60, percent_complete: 10, planned_start: cel`daysAgo(3)`, planned_end: cel`daysFromNow(7)` },
    { name: 'Stark pilot: configure site three', crm_project: 'Stark Medical Pilot Delivery', parent_task: 'Stark pilot: site configuration', predecessors: ['Stark pilot: configure site two'], status: 'not_started', planned_hours: 60, percent_complete: 0, planned_start: cel`daysFromNow(4)`, planned_end: cel`daysFromNow(14)` },
    { name: 'Stark pilot: staff training', crm_project: 'Stark Medical Pilot Delivery', predecessors: ['Stark pilot: configure site three'], status: 'not_started', planned_hours: 40, percent_complete: 0, planned_start: cel`daysFromNow(15)`, planned_end: cel`daysFromNow(28)` },
    { name: 'Stark pilot: go-live review', crm_project: 'Stark Medical Pilot Delivery', predecessors: ['Stark pilot: staff training'], status: 'not_started', is_milestone: true, planned_hours: 0, percent_complete: 0, planned_start: cel`daysFromNow(35)`, planned_end: cel`daysFromNow(35)` },

    // Wayne Operations Module Rollout — four regional hubs, one after another.
    { name: 'Wayne rollout: solution blueprint', crm_project: 'Wayne Operations Module Rollout', status: 'completed', planned_hours: 80, percent_complete: 100, planned_start: cel`daysAgo(45)`, planned_end: cel`daysAgo(30)` },
    { name: 'Wayne rollout: hub deployments', crm_project: 'Wayne Operations Module Rollout', status: 'in_progress', planned_start: cel`daysAgo(29)`, planned_end: cel`daysFromNow(50)` },
    { name: 'Wayne rollout: north hub', crm_project: 'Wayne Operations Module Rollout', parent_task: 'Wayne rollout: hub deployments', predecessors: ['Wayne rollout: solution blueprint'], status: 'completed', planned_hours: 120, percent_complete: 100, planned_start: cel`daysAgo(29)`, planned_end: cel`daysAgo(10)` },
    { name: 'Wayne rollout: south hub', crm_project: 'Wayne Operations Module Rollout', parent_task: 'Wayne rollout: hub deployments', predecessors: ['Wayne rollout: north hub'], status: 'in_progress', planned_hours: 120, percent_complete: 40, planned_start: cel`daysAgo(9)`, planned_end: cel`daysFromNow(10)` },
    { name: 'Wayne rollout: east hub', crm_project: 'Wayne Operations Module Rollout', parent_task: 'Wayne rollout: hub deployments', predecessors: ['Wayne rollout: south hub'], status: 'not_started', planned_hours: 120, percent_complete: 0, planned_start: cel`daysFromNow(11)`, planned_end: cel`daysFromNow(30)` },
    { name: 'Wayne rollout: west hub', crm_project: 'Wayne Operations Module Rollout', parent_task: 'Wayne rollout: hub deployments', predecessors: ['Wayne rollout: east hub'], status: 'not_started', planned_hours: 120, percent_complete: 0, planned_start: cel`daysFromNow(31)`, planned_end: cel`daysFromNow(50)` },
    { name: 'Wayne rollout: handover to support', crm_project: 'Wayne Operations Module Rollout', predecessors: ['Wayne rollout: west hub'], status: 'not_started', is_milestone: true, planned_hours: 0, percent_complete: 0, planned_start: cel`daysFromNow(60)`, planned_end: cel`daysFromNow(60)` },

    // Vertex Developer Platform Onboarding — approved, starts next week.
    { name: 'Vertex onboarding: enablement workshops', crm_project: 'Vertex Developer Platform Onboarding', status: 'not_started', planned_hours: 48, percent_complete: 0, planned_start: cel`daysFromNow(7)`, planned_end: cel`daysFromNow(30)` },
    { name: 'Vertex onboarding: architecture review', crm_project: 'Vertex Developer Platform Onboarding', predecessors: ['Vertex onboarding: enablement workshops'], status: 'not_started', planned_hours: 32, percent_complete: 0, planned_start: cel`daysFromNow(31)`, planned_end: cel`daysFromNow(60)` },
    { name: 'Vertex onboarding: quarterly check-in', crm_project: 'Vertex Developer Platform Onboarding', predecessors: ['Vertex onboarding: architecture review'], status: 'not_started', is_milestone: true, planned_hours: 0, percent_complete: 0, planned_start: cel`daysFromNow(97)`, planned_end: cel`daysFromNow(97)` },

    // Vertex Enterprise Rollout Scoping — presales.
    { name: 'Vertex scoping: solution design', crm_project: 'Vertex Enterprise Rollout Scoping', status: 'completed', planned_hours: 40, percent_complete: 100, planned_start: cel`daysAgo(10)`, planned_end: cel`daysAgo(3)` },
    { name: 'Vertex scoping: phased plan', crm_project: 'Vertex Enterprise Rollout Scoping', predecessors: ['Vertex scoping: solution design'], status: 'in_progress', planned_hours: 24, percent_complete: 25, planned_start: cel`daysAgo(2)`, planned_end: cel`daysFromNow(6)` },
    { name: 'Vertex scoping: effort estimate', crm_project: 'Vertex Enterprise Rollout Scoping', predecessors: ['Vertex scoping: phased plan'], status: 'not_started', planned_hours: 16, percent_complete: 0, planned_start: cel`daysFromNow(7)`, planned_end: cel`daysFromNow(14)` },

    // Initech Phase 1 Delivery — delivered and accepted.
    { name: 'Initech phase 1: migration assessment', crm_project: 'Initech Phase 1 Delivery', status: 'completed', planned_hours: 60, percent_complete: 100, planned_start: cel`daysAgo(120)`, planned_end: cel`daysAgo(100)` },
    { name: 'Initech phase 1: workload migration', crm_project: 'Initech Phase 1 Delivery', predecessors: ['Initech phase 1: migration assessment'], status: 'completed', planned_hours: 200, percent_complete: 100, planned_start: cel`daysAgo(99)`, planned_end: cel`daysAgo(30)` },
    { name: 'Initech phase 1: customer acceptance', crm_project: 'Initech Phase 1 Delivery', predecessors: ['Initech phase 1: workload migration'], status: 'completed', is_milestone: true, planned_hours: 0, percent_complete: 100, planned_start: cel`daysAgo(20)`, planned_end: cel`daysAgo(20)` },
  ],
});

/**
 * The projects' budget versions (hotcrm#2547). Listed in version order, so
 * each version's number (stamped on the write) is the one in its name, and an
 * approved version 2 supersedes the version 1 before it.
 */
export const projectBudgets = defineSeed(ProjectBudget, {
  mode: 'ignore',
  locale: SEED_EN_LOCALES,
  externalId: 'name',
  records: [
    { name: 'Stark Medical Pilot Delivery · v1', crm_project: 'Stark Medical Pilot Delivery', version: 1, status: 'approved', notes: 'The signed pilot: three sites, eight weeks.' },
    {
      name: 'Stark Medical Pilot Delivery · v2', crm_project: 'Stark Medical Pilot Delivery', version: 2, status: 'draft',
      reason: 'Site three needs a second configuration pass after the customer changed its ward layout.',
    },
    { name: 'Wayne Operations Module Rollout · v1', crm_project: 'Wayne Operations Module Rollout', version: 1, status: 'approved', notes: 'Four regional hubs, one after another.' },
    {
      name: 'Wayne Operations Module Rollout · v2', crm_project: 'Wayne Operations Module Rollout', version: 2, status: 'approved',
      reason: 'The customer added two weeks of on-site hypercare at the south hub.',
    },
    { name: 'Vertex Developer Platform Onboarding · v1', crm_project: 'Vertex Developer Platform Onboarding', version: 1, status: 'approved' },
    { name: 'Vertex Enterprise Rollout Scoping · v1', crm_project: 'Vertex Enterprise Rollout Scoping', version: 1, status: 'approved' },
    { name: 'Initech Phase 1 Delivery · v1', crm_project: 'Initech Phase 1 Delivery', version: 1, status: 'approved' },
    { name: 'Delivery Practice Enablement · v1', crm_project: 'Delivery Practice Enablement', version: 1, status: 'draft' },
  ],
});

/**
 * The versions' lines (hotcrm#2547). A version's Total Cost sums their
 * amounts, and the baseline's total is the project's Approved Budget.
 */
export const projectBudgetLines = defineSeed(ProjectBudgetLine, {
  mode: 'ignore',
  locale: SEED_EN_LOCALES,
  externalId: ['crm_project_budget', 'description'],
  records: [
    // Stark v1: 34,000 + 31,200 + 8,800 + 4,000 = 78,000.
    { crm_project_budget: 'Stark Medical Pilot Delivery · v1', category: 'labor', description: 'Senior consultants', rate_card: 'Senior Consultant', hours: 400, period: cel`daysAgo(21)` },
    { crm_project_budget: 'Stark Medical Pilot Delivery · v1', category: 'labor', description: 'Consultants', rate_card: 'Consultant', hours: 480, period: cel`daysAgo(21)` },
    { crm_project_budget: 'Stark Medical Pilot Delivery · v1', category: 'labor', description: 'Solution architecture', rate_card: 'Lead Architect', hours: 80, period: cel`daysAgo(21)` },
    { crm_project_budget: 'Stark Medical Pilot Delivery · v1', category: 'expense', description: 'Travel to the three sites', quantity: 1, unit_cost: 4000 },
    // Stark v2 (Draft): 34,000 + 39,000 + 8,800 + 4,000 = 85,800, ten percent more.
    { crm_project_budget: 'Stark Medical Pilot Delivery · v2', category: 'labor', description: 'Senior consultants', rate_card: 'Senior Consultant', hours: 400, period: cel`daysAgo(21)` },
    { crm_project_budget: 'Stark Medical Pilot Delivery · v2', category: 'labor', description: 'Consultants', rate_card: 'Consultant', hours: 600, period: cel`daysAgo(21)` },
    { crm_project_budget: 'Stark Medical Pilot Delivery · v2', category: 'labor', description: 'Solution architecture', rate_card: 'Lead Architect', hours: 80, period: cel`daysAgo(21)` },
    { crm_project_budget: 'Stark Medical Pilot Delivery · v2', category: 'expense', description: 'Travel to the three sites', quantity: 1, unit_cost: 4000 },
    // Wayne v1 (superseded): 68,000 + 65,000 + 9,000 + 8,000 = 150,000.
    { crm_project_budget: 'Wayne Operations Module Rollout · v1', category: 'labor', description: 'Senior consultants', rate_card: 'Senior Consultant', hours: 800, period: cel`daysAgo(45)` },
    { crm_project_budget: 'Wayne Operations Module Rollout · v1', category: 'labor', description: 'Consultants', rate_card: 'Consultant', hours: 1000, period: cel`daysAgo(45)` },
    { crm_project_budget: 'Wayne Operations Module Rollout · v1', category: 'labor', description: 'Programme advisory', rate_card: 'Principal Advisor', hours: 60, period: cel`daysAgo(45)` },
    { crm_project_budget: 'Wayne Operations Module Rollout · v1', category: 'expense', description: 'Travel between the hubs', quantity: 1, unit_cost: 8000 },
    // Wayne v2 (the baseline): 68,000 + 78,000 + 9,000 + 10,000 = 165,000.
    { crm_project_budget: 'Wayne Operations Module Rollout · v2', category: 'labor', description: 'Senior consultants', rate_card: 'Senior Consultant', hours: 800, period: cel`daysAgo(45)` },
    { crm_project_budget: 'Wayne Operations Module Rollout · v2', category: 'labor', description: 'Consultants', rate_card: 'Consultant', hours: 1200, period: cel`daysAgo(45)` },
    { crm_project_budget: 'Wayne Operations Module Rollout · v2', category: 'labor', description: 'Programme advisory', rate_card: 'Principal Advisor', hours: 60, period: cel`daysAgo(45)` },
    { crm_project_budget: 'Wayne Operations Module Rollout · v2', category: 'expense', description: 'Travel between the hubs', quantity: 1, unit_cost: 10000 },
    // Vertex onboarding v1: 17,600 + 17,000 + 1,400 = 36,000.
    { crm_project_budget: 'Vertex Developer Platform Onboarding · v1', category: 'labor', description: 'Architecture review', rate_card: 'Lead Architect', hours: 160, period: cel`daysFromNow(7)` },
    { crm_project_budget: 'Vertex Developer Platform Onboarding · v1', category: 'labor', description: 'Enablement workshops', rate_card: 'Senior Consultant', hours: 200, period: cel`daysFromNow(7)` },
    { crm_project_budget: 'Vertex Developer Platform Onboarding · v1', category: 'expense', description: 'Workshop materials', quantity: 4, unit_cost: 350 },
    // Vertex scoping v1: 8,500 + 2,600 + 900 = 12,000.
    { crm_project_budget: 'Vertex Enterprise Rollout Scoping · v1', category: 'labor', description: 'Solution design', rate_card: 'Senior Consultant', hours: 100, period: cel`daysAgo(10)` },
    { crm_project_budget: 'Vertex Enterprise Rollout Scoping · v1', category: 'labor', description: 'Effort estimate', rate_card: 'Consultant', hours: 40, period: cel`daysAgo(10)` },
    { crm_project_budget: 'Vertex Enterprise Rollout Scoping · v1', category: 'third_party_goods', description: 'Cloud sandbox for the prototype', quantity: 1, unit_cost: 900 },
    // Initech phase 1 v1: 25,500 + 27,300 + 7,200 = 60,000.
    { crm_project_budget: 'Initech Phase 1 Delivery · v1', category: 'labor', description: 'Senior consultants', rate_card: 'Senior Consultant', hours: 300, period: cel`daysAgo(120)` },
    { crm_project_budget: 'Initech Phase 1 Delivery · v1', category: 'labor', description: 'Consultants', rate_card: 'Consultant', hours: 420, period: cel`daysAgo(120)` },
    { crm_project_budget: 'Initech Phase 1 Delivery · v1', category: 'subcontract_service', description: 'Data-centre decommissioning partner', quantity: 1, unit_cost: 7200 },
    // Delivery Practice Enablement v1 (Draft): 13,000 + 2,000 = 15,000.
    { crm_project_budget: 'Delivery Practice Enablement · v1', category: 'labor', description: 'Playbook and templates', rate_card: 'Internal Delivery', hours: 200, period: cel`daysFromNow(14)` },
    { crm_project_budget: 'Delivery Practice Enablement · v1', category: 'other', description: 'Training venue', quantity: 2, unit_cost: 1000 },
  ],
});
