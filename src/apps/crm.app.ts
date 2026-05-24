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
        { id: 'nav_contact',     type: 'object', objectName: 'crm_contact',     label: 'Contacts',      icon: 'user' },
        { id: 'nav_opportunity', type: 'object', objectName: 'crm_opportunity', label: 'Opportunities', icon: 'target' },
        { id: 'nav_pipeline',    type: 'object', objectName: 'crm_opportunity', viewName: 'pipeline_kanban', label: 'Pipeline', icon: 'columns-3' },
        { id: 'nav_quote',       type: 'object', objectName: 'crm_quote',       label: 'Quotes',        icon: 'receipt' },
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
