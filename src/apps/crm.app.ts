// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { App } from '@objectstack/spec/ui';

/**
 * HotCRM — v1 navigation.
 *
 * Intentionally narrow. v1 sells one story: "the CRM that rewrites itself
 * when your business changes." Every nav item users see must serve that
 * demo. Marketing/Forecast/Contract/CPQ/Products live in source but are
 * hidden from primary nav for v1 — users still reach them via lookups,
 * global search, or by enabling them in a future profile.
 */
export const CrmApp = App.create({
  name: 'crm_enterprise',
  label: 'HotCRM',
  icon: 'briefcase',
  defaultAgent: 'sales_copilot',
  branding: {
    primaryColor: '#4169E1',
    logo: '/assets/crm-logo.png',
    favicon: '/assets/crm-favicon.ico',
  },

  navigation: [
    // Pinned landing — single executive view, single click from launcher.
    {
      id: 'nav_home',
      type: 'dashboard',
      dashboardName: 'executive_dashboard',
      label: 'Home',
      icon: 'home',
    },

    {
      id: 'group_sales',
      type: 'group',
      label: 'Sales',
      icon: 'chart-line',
      expanded: true,
      children: [
        { id: 'nav_lead',        type: 'object', objectName: 'crm_lead',        label: 'Leads',         icon: 'user-plus' },
        { id: 'nav_account',     type: 'object', objectName: 'crm_account',     label: 'Accounts',      icon: 'building' },
        // ADR-0047 interface page — the curated counterpart to the Accounts
        // object entry (quick filters only; activates with spec > 9.2.0).
        { id: 'nav_account_workbench', type: 'page', pageName: 'account_workbench', label: 'Account Workbench', icon: 'sliders-horizontal' },
        { id: 'nav_contact',     type: 'object', objectName: 'crm_contact',     label: 'Contacts',      icon: 'user' },
        { id: 'nav_opportunity', type: 'object', objectName: 'crm_opportunity', label: 'Opportunities', icon: 'target' },
        { id: 'nav_pipeline',    type: 'object', objectName: 'crm_opportunity', viewName: 'pipeline_kanban', label: 'Pipeline', icon: 'columns-3' },
        { id: 'nav_quote',       type: 'object', objectName: 'crm_quote',       label: 'Quotes',        icon: 'receipt' },
        // Contracts close the sales cycle: quote → signed agreement → renewal.
        // The object, its views and its renewal automation all shipped, but
        // there was no way to reach any of it from the app.
        { id: 'nav_contract',    type: 'object', objectName: 'crm_contract',    label: 'Contracts',     icon: 'file-signature' },
        { id: 'nav_sales_dashboard', type: 'dashboard', dashboardName: 'sales_dashboard', label: 'Sales Performance', icon: 'chart-line' },
      ],
    },

    {
      // Everything a rep owes someone. `crm_task` had views, seed data, a
      // recurrence hook and two reminder flows, and no entry point — the only
      // way to see a task was to open the record it hung off.
      id: 'group_work',
      type: 'group',
      label: 'My Work',
      icon: 'list-checks',
      expanded: true,
      // These are ListViews, not a dashboard, and that is deliberate. A
      // "My Day" dashboard was built and removed: dashboard widget filters do
      // NOT interpolate `{current_user}` / `{current_user_id}` — the literal
      // string reaches the query and matches no owner, so every widget renders
      // 0. Proven side by side on one dashboard: `{current_user}` → 0,
      // `{current_user_id}` → 0, no owner filter → 10,100,081. The token is
      // implemented in platform-objects (the ListView data path) and has no
      // counterpart in service-analytics. Filed upstream; until it lands, a
      // ListView is the only surface where "mine" actually means mine.
      children: [
        { id: 'nav_my_tasks', type: 'object', objectName: 'crm_task', viewName: 'my_open_tasks', label: 'My Tasks', icon: 'circle-check' },
        { id: 'nav_my_deals', type: 'object', objectName: 'crm_opportunity', viewName: 'my_open_deals', label: 'My Deals', icon: 'target' },
        { id: 'nav_my_leads', type: 'object', objectName: 'crm_lead', viewName: 'my_leads', label: 'My Leads', icon: 'user-plus' },
        { id: 'nav_all_tasks', type: 'object', objectName: 'crm_task', label: 'All Tasks', icon: 'list' },
      ],
    },

    {
      // Campaigns drive lead_source and the campaign-member records that
      // "Add to Campaign" writes — with no nav entry the marketing half of
      // the data model was invisible.
      id: 'group_marketing',
      type: 'group',
      label: 'Marketing',
      icon: 'megaphone',
      children: [
        { id: 'nav_campaign', type: 'object', objectName: 'crm_campaign', label: 'Campaigns', icon: 'megaphone' },
        { id: 'nav_product',  type: 'object', objectName: 'crm_product',  label: 'Products',  icon: 'package' },
      ],
    },

    {
      id: 'group_service',
      type: 'group',
      label: 'Service',
      icon: 'headset',
      expanded: true,
      children: [
        { id: 'nav_case',      type: 'object', objectName: 'crm_case',              label: 'Cases',     icon: 'life-buoy' },
        { id: 'nav_knowledge', type: 'object', objectName: 'crm_knowledge_article', label: 'Knowledge', icon: 'book-open' },
        { id: 'nav_service_dashboard', type: 'dashboard', dashboardName: 'service_dashboard', label: 'Service Overview', icon: 'gauge' },
      ],
    },

    {
      id: 'group_insights',
      type: 'group',
      label: 'Insights',
      icon: 'sparkles',
      children: [
        // Trimmed to three high-signal reports. Full report catalogue still
        // ships as metadata; admins can pin more from the report picker.
        { id: 'nav_crm_dashboard',            type: 'dashboard', dashboardName: 'crm_overview_dashboard', label: 'CRM Overview',      icon: 'layout-dashboard' },
        { id: 'nav_forecast',                 type: 'object', objectName: 'crm_forecast',                 label: 'Forecasts',         icon: 'trending-up' },
        { id: 'nav_report_pipeline_coverage', type: 'report', reportName: 'pipeline_coverage_by_quarter', label: 'Pipeline Coverage', icon: 'columns-3' },
        { id: 'nav_report_lead_inflow',       type: 'report', reportName: 'lead_inflow_by_month_source',  label: 'Lead Inflow',       icon: 'trending-up' },
        { id: 'nav_report_sla',               type: 'report', reportName: 'sla_performance',              label: 'SLA Performance',   icon: 'timer' },
      ],
    },

    {
      id: 'group_approvals',
      type: 'group',
      label: 'Approvals',
      icon: 'check-circle',
      children: [
        { id: 'nav_approval_requests', type: 'object', objectName: 'sys_approval_request', label: 'Inbox',     icon: 'inbox',   requiresObject: 'sys_approval_request' },
        { id: 'nav_approval_processes',type: 'object', objectName: 'sys_approval_process', label: 'Processes', icon: 'workflow',requiresObject: 'sys_approval_process' },
      ],
    },
  ],
});
