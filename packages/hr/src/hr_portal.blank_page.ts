/**
 * HR Self-Service Portal — Blank Page Layout
 *
 * Employee self-service portal with PTO balance, org chart,
 * upcoming reviews, team directory, and company announcements.
 */
import { BlankPageLayoutSchema, BlankPageLayoutItemSchema, InterfacePageConfigSchema, ElementDataSourceSchema } from '@objectstack/spec/ui';

/* ── Data Sources ─────────────────────────────────────── */

const employeeSource = {
  type: 'object' as const,
  object: 'employee'
};

const performanceReviewSource = {
  type: 'object' as const,
  object: 'performance_review'
};

const benefitEnrollmentSource = {
  type: 'object' as const,
  object: 'benefit_enrollment'
};

ElementDataSourceSchema.parse(employeeSource);
ElementDataSourceSchema.parse(performanceReviewSource);
ElementDataSourceSchema.parse(benefitEnrollmentSource);

/* ── Layout Items ─────────────────────────────────────── */

const ptoBalanceCard = {
  componentId: 'pto_balance',
  type: 'number',
  x: 0,
  y: 0,
  w: 4,
  h: 2,
  width: 380,
  height: 120,
  properties: {
    label: 'PTO Balance',
    object: 'employee',
    valueField: 'pto_remaining',
    suffix: ' days',
    showSecondary: true,
    secondaryLabel: 'Used this year'
  }
};

const orgChart = {
  componentId: 'org_chart',
  type: 'image',
  x: 4,
  y: 0,
  w: 8,
  h: 5,
  width: 740,
  height: 340,
  properties: {
    chartType: 'org',
    object: 'employee',
    displayField: 'full_name',
    parentField: 'manager',
    photoField: 'photo'
  }
};

const reviewSchedule = {
  componentId: 'review_schedule',
  type: 'text',
  x: 0,
  y: 2,
  w: 4,
  h: 3,
  width: 380,
  height: 220,
  properties: {
    displayAs: 'list',
    object: 'performance_review',
    columns: ['reviewer', 'review_date', 'status'],
    sort: 'review_date:asc',
    limit: 5,
    title: 'Upcoming Reviews'
  }
};

const directorySearch = {
  componentId: 'directory_search',
  type: 'filter',
  x: 0,
  y: 5,
  w: 4,
  h: 2,
  width: 380,
  height: 120,
  properties: {
    placeholder: 'Search employee directory...',
    object: 'employee',
    searchFields: ['full_name', 'department', 'title', 'email']
  }
};

const teamDirectory = {
  componentId: 'team_directory',
  type: 'text',
  x: 0,
  y: 7,
  w: 6,
  h: 4,
  width: 560,
  height: 260,
  properties: {
    displayAs: 'card_grid',
    object: 'employee',
    columns: ['full_name', 'title', 'department', 'email', 'phone'],
    showPhoto: true,
    limit: 12
  }
};

const announcements = {
  componentId: 'announcements',
  type: 'text',
  x: 6,
  y: 7,
  w: 6,
  h: 4,
  width: 560,
  height: 260,
  properties: {
    displayAs: 'feed',
    title: 'Company Announcements',
    sort: 'created_at:desc',
    limit: 10
  }
};

const benefitsCard = {
  componentId: 'benefits_summary',
  type: 'text',
  x: 4,
  y: 5,
  w: 8,
  h: 2,
  width: 740,
  height: 120,
  properties: {
    displayAs: 'stat_list',
    object: 'benefit_enrollment',
    metrics: ['health_plan', 'dental_plan', 'retirement_contribution']
  }
};

const items = [
  ptoBalanceCard,
  orgChart,
  reviewSchedule,
  directorySearch,
  teamDirectory,
  announcements,
  benefitsCard
];

items.forEach(item => BlankPageLayoutItemSchema.parse(item));

/* ── Blank Page Layout ────────────────────────────────── */

export const HrPortalBlankPage = {
  name: 'hr_portal',
  label: 'HR Self-Service Portal',
  description: 'Employee self-service portal with PTO balance, org chart, upcoming reviews, and team directory',
  items
};

BlankPageLayoutSchema.parse(HrPortalBlankPage);

/* ── Interface Page Config ────────────────────────────── */

export const HrPortalPageConfig = {
  name: 'hr_portal',
  label: 'HR Self-Service Portal',
  dataSources: [employeeSource, performanceReviewSource, benefitEnrollmentSource],
  permissions: ['view_employees', 'view_performance_reviews', 'view_benefits']
};

InterfacePageConfigSchema.parse(HrPortalPageConfig);

export default HrPortalBlankPage;
