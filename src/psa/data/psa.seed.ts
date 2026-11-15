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
 * Seed doctrine lives in `src/sales/data/_shared.ts`; the two-language rule in
 * `src/sales/data/_locale.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { RateCard } from '../objects/rate_card.object';
import { Project } from '../objects/project.object';
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
      percent_complete: 35,
      planned_revenue: 120000,
      approved_budget: 78000,
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
      percent_complete: 40,
      planned_revenue: 260000,
      approved_budget: 165000,
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
      approved_budget: 36000,
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
      percent_complete: 50,
      approved_budget: 12000,
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
      percent_complete: 100,
      planned_revenue: 90000,
      approved_budget: 60000,
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
      approved_budget: 15000,
    },
  ],
});
