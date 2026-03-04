import type { App } from '@objectstack/spec/ui';
import { AppSchema } from '@objectstack/spec/ui';

/**
 * HotCRM Application Definition
 * AI-Native Enterprise CRM with 6 business clouds
 */
export const HotCrmApp = {
  name: 'hotcrm',
  label: 'HotCRM',
  description: 'AI-Native Enterprise CRM',
  icon: 'briefcase',
  active: true,
  isDefault: true,
  branding: {
    primaryColor: '#2563EB'
  },
  navigation: [
    // CRM Cloud
    {
      type: 'group' as const,
      id: 'nav_crm',
      label: 'Sales Cloud',
      icon: 'trending-up',
      children: [
        { type: 'object' as const, id: 'nav_accounts', label: 'Accounts', objectName: 'account', icon: 'building-2' },
        { type: 'object' as const, id: 'nav_contacts', label: 'Contacts', objectName: 'contact', icon: 'contact' },
        { type: 'object' as const, id: 'nav_opportunities', label: 'Opportunities', objectName: 'opportunity', icon: 'target' },
        { type: 'object' as const, id: 'nav_leads', label: 'Leads', objectName: 'lead', icon: 'user-plus' },
        { type: 'object' as const, id: 'nav_opportunity_kanban', label: 'Pipeline Board', objectName: 'opportunity', viewName: 'opportunity_kanban', icon: 'columns-3' },
        { type: 'object' as const, id: 'nav_activity_calendar', label: 'Activity Calendar', objectName: 'activity', viewName: 'activity_calendar', icon: 'calendar' },
        { type: 'dashboard' as const, id: 'nav_crm_dashboard', label: 'Sales Dashboard', dashboardName: 'crm_dashboard', icon: 'layout-dashboard' }
      ]
    },
    // Finance Cloud
    {
      type: 'group' as const,
      id: 'nav_finance',
      label: 'Revenue Cloud',
      icon: 'dollar-sign',
      children: [
        { type: 'object' as const, id: 'nav_contracts', label: 'Contracts', objectName: 'contract', icon: 'file-text' },
        { type: 'object' as const, id: 'nav_invoices', label: 'Invoices', objectName: 'invoice', icon: 'receipt' },
        { type: 'object' as const, id: 'nav_payments', label: 'Payments', objectName: 'payment', icon: 'credit-card' },
        { type: 'object' as const, id: 'nav_credit_notes', label: 'Credit Notes', objectName: 'credit_note', icon: 'file-minus' },
        { type: 'dashboard' as const, id: 'nav_finance_dashboard', label: 'Finance Dashboard', dashboardName: 'finance_dashboard', icon: 'layout-dashboard' }
      ]
    },
    // HR Cloud
    {
      type: 'group' as const,
      id: 'nav_hr',
      label: 'HR Cloud',
      icon: 'users',
      children: [
        { type: 'object' as const, id: 'nav_employees', label: 'Employees', objectName: 'employee', icon: 'badge-check' },
        { type: 'object' as const, id: 'nav_candidates', label: 'Candidates', objectName: 'candidate', icon: 'user-search' },
        { type: 'object' as const, id: 'nav_payroll', label: 'Payroll', objectName: 'payroll', icon: 'wallet' },
        { type: 'object' as const, id: 'nav_performance', label: 'Performance', objectName: 'performance_review', icon: 'award' },
        { type: 'object' as const, id: 'nav_recruitment_kanban', label: 'Recruitment Pipeline', objectName: 'candidate', viewName: 'recruitment_kanban', icon: 'columns-3' },
        { type: 'dashboard' as const, id: 'nav_hr_dashboard', label: 'HR Dashboard', dashboardName: 'hr_dashboard', icon: 'layout-dashboard' }
      ]
    },
    // Marketing Cloud
    {
      type: 'group' as const,
      id: 'nav_marketing',
      label: 'Marketing Cloud',
      icon: 'megaphone',
      children: [
        { type: 'object' as const, id: 'nav_campaigns', label: 'Campaigns', objectName: 'campaign', icon: 'rocket' },
        { type: 'object' as const, id: 'nav_campaign_members', label: 'Campaign Members', objectName: 'campaign_member', icon: 'users-round' },
        { type: 'object' as const, id: 'nav_email_templates', label: 'Email Templates', objectName: 'email_template', icon: 'mail' },
        { type: 'object' as const, id: 'nav_campaign_timeline', label: 'Campaign Timeline', objectName: 'campaign', viewName: 'campaign_timeline', icon: 'calendar-range' },
        { type: 'dashboard' as const, id: 'nav_marketing_dashboard', label: 'Marketing Dashboard', dashboardName: 'marketing_dashboard', icon: 'layout-dashboard' }
      ]
    },
    // Products / CPQ Cloud
    {
      type: 'group' as const,
      id: 'nav_products',
      label: 'CPQ Cloud',
      icon: 'package',
      children: [
        { type: 'object' as const, id: 'nav_products', label: 'Products', objectName: 'product', icon: 'box' },
        { type: 'object' as const, id: 'nav_price_books', label: 'Price Books', objectName: 'price_book', icon: 'book-open' },
        { type: 'object' as const, id: 'nav_bundles', label: 'Bundles', objectName: 'product_bundle', icon: 'layers' },
        { type: 'object' as const, id: 'nav_quotes', label: 'Quotes', objectName: 'quote', icon: 'file-check' },
        { type: 'object' as const, id: 'nav_quote_gantt', label: 'Quote Approval Timeline', objectName: 'quote', viewName: 'quote_gantt', icon: 'gantt-chart' },
        { type: 'dashboard' as const, id: 'nav_cpq_dashboard', label: 'CPQ Dashboard', dashboardName: 'cpq_dashboard', icon: 'layout-dashboard' }
      ]
    },
    // Support Cloud
    {
      type: 'group' as const,
      id: 'nav_support',
      label: 'Service Cloud',
      icon: 'headphones',
      children: [
        { type: 'object' as const, id: 'nav_cases', label: 'Cases', objectName: 'case', icon: 'ticket' },
        { type: 'object' as const, id: 'nav_queues', label: 'Queues', objectName: 'queue', icon: 'inbox' },
        { type: 'object' as const, id: 'nav_knowledge', label: 'Knowledge Base', objectName: 'knowledge_article', icon: 'book-open' },
        { type: 'object' as const, id: 'nav_sla_policies', label: 'SLA Policies', objectName: 'sla_policy', icon: 'shield-check' },
        { type: 'object' as const, id: 'nav_case_kanban', label: 'Case Board', objectName: 'case', viewName: 'case_kanban', icon: 'columns-3' },
        { type: 'dashboard' as const, id: 'nav_support_dashboard', label: 'Support Dashboard', dashboardName: 'support_dashboard', icon: 'layout-dashboard' }
      ]
    }
  ]
} satisfies App;

AppSchema.parse(HotCrmApp);

export default HotCrmApp;
