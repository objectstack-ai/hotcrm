import type { NavigationArea, ActionNavItem, ReportNavItem } from '@objectstack/spec/ui';
import { NavigationAreaSchema, ActionNavItemSchema, ReportNavItemSchema } from '@objectstack/spec/ui';

/**
 * Core Navigation Enhancements
 * NavigationArea configurations with ActionNavItem and ReportNavItem entries
 */

// --- Action Nav Items ---
export const QuickCreateAction = {
  type: 'action' as const,
  id: 'quick_create',
  label: 'Quick Create',
  actionDef: { actionName: 'create' }
} satisfies ActionNavItem;

export const GlobalSearchAction = {
  type: 'action' as const,
  id: 'global_search',
  label: 'Global Search',
  actionDef: { actionName: 'search' }
} satisfies ActionNavItem;

export const ImportDataAction = {
  type: 'action' as const,
  id: 'import_data',
  label: 'Import Data',
  actionDef: { actionName: 'import' }
} satisfies ActionNavItem;

export const NotificationsAction = {
  type: 'action' as const,
  id: 'notifications',
  label: 'Notifications',
  actionDef: { actionName: 'show_notifications' }
} satisfies ActionNavItem;

// --- Report Nav Items ---
export const PipelineReport = {
  type: 'report' as const,
  id: 'pipeline_report',
  label: 'Pipeline Report',
  reportName: 'pipeline'
} satisfies ReportNavItem;

export const RevenueReport = {
  type: 'report' as const,
  id: 'revenue_report',
  label: 'Revenue Report',
  reportName: 'revenue'
} satisfies ReportNavItem;

export const ForecastReport = {
  type: 'report' as const,
  id: 'forecast_report',
  label: 'Forecast Report',
  reportName: 'forecast'
} satisfies ReportNavItem;

export const ActivityReport = {
  type: 'report' as const,
  id: 'activity_report',
  label: 'Activity Report',
  reportName: 'activity'
} satisfies ReportNavItem;

// --- Navigation Areas ---
export const HeaderNavigation = {
  id: 'header',
  label: 'Header',
  navigation: [
    { type: 'object' as const, id: 'nav_accounts', objectName: 'account', label: 'Accounts' },
    { type: 'object' as const, id: 'nav_opportunities', objectName: 'opportunity', label: 'Opportunities' },
    { type: 'object' as const, id: 'nav_contacts', objectName: 'contact', label: 'Contacts' },
    { type: 'object' as const, id: 'nav_leads', objectName: 'lead', label: 'Leads' },
    { type: 'object' as const, id: 'nav_cases', objectName: 'case', label: 'Cases' }
  ]
} satisfies NavigationArea;

export const SidebarNavigation = {
  id: 'sidebar',
  label: 'Sidebar',
  navigation: [
    { type: 'object' as const, id: 'nav_dashboard', objectName: 'dashboard', label: 'Dashboards' },
    PipelineReport,
    RevenueReport,
    ForecastReport,
    ActivityReport,
    { type: 'object' as const, id: 'nav_campaigns', objectName: 'campaign', label: 'Campaigns' },
    { type: 'object' as const, id: 'nav_products', objectName: 'product', label: 'Products' },
    { type: 'object' as const, id: 'nav_invoices', objectName: 'invoice', label: 'Invoices' }
  ]
} satisfies NavigationArea;

export const UtilityBarNavigation = {
  id: 'utility_bar',
  label: 'Utility Bar',
  navigation: [
    QuickCreateAction,
    GlobalSearchAction,
    ImportDataAction,
    NotificationsAction
  ]
} satisfies NavigationArea;

// Schema validation
ActionNavItemSchema.parse(QuickCreateAction);
ActionNavItemSchema.parse(GlobalSearchAction);
ActionNavItemSchema.parse(ImportDataAction);
ActionNavItemSchema.parse(NotificationsAction);
ReportNavItemSchema.parse(PipelineReport);
ReportNavItemSchema.parse(RevenueReport);
ReportNavItemSchema.parse(ForecastReport);
ReportNavItemSchema.parse(ActivityReport);
NavigationAreaSchema.parse(HeaderNavigation);
NavigationAreaSchema.parse(SidebarNavigation);
NavigationAreaSchema.parse(UtilityBarNavigation);

export default {
  header: HeaderNavigation,
  sidebar: SidebarNavigation,
  utilityBar: UtilityBarNavigation
};
