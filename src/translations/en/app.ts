// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — every translation namespace EXCEPT `objects`:
 * `apps`, `messages`, `dashboards`, `pages`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/en.ts`.
 *
 * A namespace `TranslationData` gains later lands here too, and the room is
 * measured: this file is the smaller half of the bundle, and the schema bounds
 * how many namespaces can ever arrive.
 */
export const appSurface: Omit<TranslationData, 'objects'> = {
  apps: {
    crm_enterprise: {
      label: 'HotCRM',
      description: 'Customer relationship management for sales, service, and marketing',
      navigation: {
        group_activity: { label: 'Activity' },
        group_sales: { label: 'Sales' },
        group_service: { label: 'Service' },
        group_marketing: { label: 'Marketing' },
      },
    },
  },
  messages: {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.back': 'Back',
    'common.confirm': 'Confirm',
    'nav.sales': 'Sales',
    'nav.service': 'Service',
    'nav.marketing': 'Marketing',
    'nav.products': 'Products',
    'nav.analytics': 'Analytics',
    'success.saved': 'Record saved successfully',
    'success.converted': 'Lead converted successfully',
    'confirm.delete': 'Are you sure you want to delete this record?',
    'confirm.convert_lead': 'Convert this lead to account, contact, and opportunity?',
    'error.required': 'This field is required',
    'error.load_failed': 'Failed to load data',
  },
  dashboards: {
    sales_activity_dashboard: {
      label: 'Sales Activity',
      description: 'Who is talking to customers, how often, and which accounts have gone quiet',
      widgets: {
        interactions_held: { title: 'Interactions Logged', description: 'Calls and meetings that actually happened' },
        meetings_booked: { title: 'Meetings Booked', description: 'Meetings on the calendar that have not happened yet' },
        customer_minutes: { title: 'Customer Minutes', description: 'Total time spent in front of customers' },
        tasks_completed: { title: 'Tasks Completed', description: 'Follow-ups closed out — the other half of activity' },
        activity_by_rep: { title: 'Activity by Rep', description: 'Logged interactions per owner' },
        activity_by_week: { title: 'Activity Volume by Week', description: 'Interactions per week' },
        activity_mix: { title: 'Activity Mix', description: 'Calls vs meetings vs demos' },
        activity_by_record_type: { title: 'Where the Activity Lands', description: 'Which part of the funnel is getting attention' },
        deal_activity: { title: 'Interactions on Deals', description: 'Logged interactions linked to an opportunity' },
        open_deals_for_activity: { title: 'Open Deals', description: 'Opportunities still in play' },
        quiet_accounts_30: { title: 'Quiet 30+ Days', description: 'Active accounts with no logged interaction in a month' },
        quiet_accounts_60: { title: 'Quiet 60+ Days', description: 'Two months of silence — the at-risk threshold' },
        quiet_accounts_90: { title: 'Quiet 90+ Days', description: 'A quarter with no contact' },
      },
    },
    crm_overview_dashboard: {
      label: 'CRM Overview',
      description: 'Revenue metrics, pipeline analytics, and deal insights',
      widgets: {
        total_revenue: { title: 'Total Revenue', description: 'Closed-won revenue this period' },
        active_deals: { title: 'Active Deals', description: 'Open opportunities in the pipeline' },
        won_deals: { title: 'Won Deals', description: 'Closed-won deals this period' },
        avg_deal_size: { title: 'Avg Deal Size', description: 'Average value of closed-won deals' },
        revenue_trends: { title: 'Revenue Trends', description: 'Closed-won revenue over the last 12 months' },
        lead_source: { title: 'Lead Source', description: 'Pipeline value by acquisition channel' },
        pipeline_by_stage: { title: 'Pipeline by Stage', description: 'Open opportunity value at each sales stage' },
        top_products: { title: 'Top Products', description: 'Total list-price revenue by product category' },
        pipeline_by_owner: { title: 'Pipeline by Owner', description: 'Open pipeline value and deal count per sales rep' },
      },
    },
    executive_dashboard: {
      label: 'Executive Overview',
      description: 'High-level revenue, customer, and pipeline KPIs for leadership',
      widgets: {
        total_revenue_ytd: { title: 'Total Revenue (YTD)', description: 'Closed-won revenue this year' },
        total_accounts: { title: 'Active Accounts', description: 'Customers with at least one active relationship' },
        total_contacts: { title: 'Total Contacts', description: 'People in our address book' },
        open_leads: { title: 'Open Leads', description: 'Unconverted leads in the funnel' },
        revenue_trend: { title: 'Revenue Trend', description: 'Closed-won revenue over the last 12 months' },
        revenue_by_industry: { title: 'Revenue by Industry', description: 'YTD closed-won revenue split by customer industry' },
        pipeline_by_stage: { title: 'Pipeline by Stage', description: 'Open opportunity value at each sales stage' },
        new_accounts_by_month: { title: 'New Accounts', description: 'Account creation cadence — last 6 months' },
        accounts_by_industry: { title: 'Accounts by Industry', description: 'Total annual revenue and account count per industry' },
      },
    },
    sales_dashboard: {
      label: 'Sales Performance',
      description: 'Pipeline analytics, win rate trends, and rep performance',
      widgets: {
        total_pipeline_value: { title: 'Total Pipeline', description: 'Sum of open opportunity value' },
        closed_won_qtd: { title: 'Closed Won (QTD)', description: 'Revenue closed this quarter' },
        open_opportunities: { title: 'Open Opportunities', description: 'Active deals in flight' },
        avg_deal_size: { title: 'Avg Deal Size', description: 'Average value of closed-won deals this quarter' },
        pipeline_by_stage: { title: 'Pipeline by Stage', description: 'Open opportunity value at each sales stage' },
        monthly_revenue_trend: { title: 'Monthly Revenue Trend', description: 'Closed-won revenue, last 12 months' },
        pipeline_by_forecast_category: { title: 'Pipeline by Forecast Category', description: 'Open pipeline grouped by sales forecast category' },
        lead_source_breakdown: { title: 'Lead Source', description: 'Where our pipeline is coming from' },
        open_pipeline_by_owner: { title: 'Open Pipeline by Owner', description: 'In-flight pipeline value, deal count and avg win probability per rep' },
        quota_attainment_by_rep: { title: 'Quota Attainment by Rep', description: 'Current-quarter quota, closed revenue and attainment per rep, from forecast snapshots' },
        pipeline_stage_by_source: { title: 'Pipeline by Stage × Lead Source', description: 'Cross-tab of open opportunity amount by stage and source' },
        win_rate_12m: { title: 'Win Rate (12M)', description: 'Deals won as a share of all deals settled in the last 12 months' },
        won_deals_12m: { title: 'Deals Won (12M)', description: 'The numerator of the win rate' },
        lost_deals_12m: { title: 'Deals Lost (12M)', description: 'The other half of the win-rate denominator' },
        win_rate_by_owner: { title: 'Win / Loss by Rep', description: 'Deals won, deals lost and win rate per rep — last 12 months' },
        win_rate_by_lead_source: { title: 'Win / Loss by Lead Source', description: 'Which sources produce deals that actually close — last 12 months' },
        loss_reason_breakdown: { title: 'Why We Lose', description: 'Lost deals by reason — last 12 months' },
      },
    },
    service_dashboard: {
      label: 'Customer Service',
      description: 'Case load, SLA health, and resolution performance',
      widgets: {
        open_cases: { title: 'Open Cases', description: 'Cases that are not yet closed' },
        critical_cases: { title: 'Critical Cases', description: 'Open cases marked as critical priority' },
        avg_resolution_time: { title: 'Avg Resolution Time', description: 'Mean time to close, in hours' },
        sla_violations: { title: 'SLA Violations', description: 'Cases that breached their SLA' },
        cases_by_status: { title: 'Cases by Status', description: 'Workload distribution across the pipeline' },
        cases_by_priority: { title: 'Cases by Priority', description: 'Open case mix by urgency' },
        cases_by_origin: { title: 'Cases by Origin', description: 'Where our cases are coming from' },
        daily_case_volume: { title: 'Daily Case Volume', description: 'New cases created over the last 30 days' },
        sla_compliance_gauge: { title: 'SLA Compliance', description: 'Percent of cases resolved within SLA this period' },
        kb_deflection_rate: { title: 'KB Deflection Rate', description: 'Share of closed cases resolved with a knowledge article' },
        kb_resolved_cases: { title: 'Resolved by KB', description: 'Closed cases pointing at the article that resolved them' },
        closed_cases_total: { title: 'Closed Cases', description: 'The denominator behind the deflection rate' },
        top_resolving_articles: { title: 'Top Resolving Articles', description: 'Knowledge articles ranked by the closed cases they resolved' },
        open_cases_by_priority: { title: 'Open Cases by Priority', description: 'Open cases and their SLA-violation rate, broken down by priority' },
      },
    },
  },
  pages: {
    account_detail_page: {
      label: 'Account Detail',
      description: 'Slotted account record page — custom header + persistent discussion feed.',
    },
    account_workbench: {
      label: 'Account Workbench',
      description: 'Curated account list for the sales team: quick filters only, no view management.',
    },
    app_launcher_page: {
      label: 'App Launcher',
      description: 'Central hub for accessing all applications',
      subtitle: 'Select an app to get started',
      components: {
        app_search: { label: 'Search Apps' },
        app_grid: { label: 'Application Grid' },
      },
    },
    case_detail_page: {
      label: 'Case Detail',
      description: 'Service-agent case record: highlights, SLA path, details and activity timeline.',
      title: '{case_number} · {subject}',
      subtitle: '{crm_account}',
      components: {
        case_highlights: { label: 'Key Information' },
        case_status_path: { label: 'Case Status Path' },
      },
    },
    lead_detail_page: {
      label: 'Lead Detail',
      description: 'Comprehensive lead detail page with highlights, details, and related information',
      title: '{first_name} {last_name}',
      subtitle: '{company}',
      components: {
        lead_duplicate_alert_confirmed: { label: 'Confirmed Duplicate Alert' },
        lead_duplicate_alert_suspected: { label: 'Suspected Duplicate Alert' },
        lead_highlights: { label: 'Key Information' },
        lead_path: { label: 'Lead Status Path' },
        main_tabs: { label: 'Lead Information Tabs' },
      },
    },
    opportunity_detail_page: {
      label: 'Opportunity Detail',
      description:
        'Comprehensive opportunity detail page with path, highlights, details, and related lists',
      title: '{name}',
      subtitle: '{crm_account}',
      components: {
        opp_highlights: { label: 'Key Information' },
        opp_stage_path: { label: 'Opportunity Stage Path' },
      },
    },
    sales_home_page: {
      label: 'Sales Home',
      description: 'Sales team home page with key metrics and quick actions',
      title: 'Sales Dashboard',
      subtitle: 'Welcome back',
      components: {
        quick_create: { title: 'Quick Create', label: 'Quick Create' },
        key_metrics: { title: 'Key Performance Indicators', label: 'Key Metrics' },
        home_tabs: { label: 'Home Tabs' },
        ai_briefing: {
          title: 'Ask the AI Assistant',
          description:
            'Open the assistant panel from the right edge of the page and ask "what should I focus on today?" — it sees your live pipeline, schema, and accounts.',
          label: 'Today with the AI Assistant',
        },
        upcoming_events: { title: 'Upcoming Events', label: 'Upcoming Events' },
      },
    },
    utility_bar_page: {
      label: 'Utility Bar',
      description: 'Quick access utility bar with floating tools',
      components: {
        notifications_panel: { label: 'Notifications' },
        quick_notes: { title: 'Quick Notes', label: 'Quick Notes' },
        quick_search: { label: 'Quick Search' },
      },
    },
  },
};
