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
        { type: 'object' as const, id: 'nav_accounts', label: 'Accounts', objectName: 'account' },
        { type: 'object' as const, id: 'nav_contacts', label: 'Contacts', objectName: 'contact' },
        { type: 'object' as const, id: 'nav_opportunities', label: 'Opportunities', objectName: 'opportunity' },
        { type: 'object' as const, id: 'nav_leads', label: 'Leads', objectName: 'lead' },
        { type: 'object' as const, id: 'nav_opportunity_kanban', label: 'Pipeline Board', objectName: 'opportunity', viewName: 'opportunity_kanban' },
        { type: 'object' as const, id: 'nav_activity_calendar', label: 'Activity Calendar', objectName: 'activity', viewName: 'activity_calendar' },
        { type: 'dashboard' as const, id: 'nav_crm_dashboard', label: 'Sales Dashboard', dashboardName: 'crm_dashboard' }
      ]
    },
    // Finance Cloud
    {
      type: 'group' as const,
      id: 'nav_finance',
      label: 'Revenue Cloud',
      icon: 'dollar-sign',
      children: [
        { type: 'object' as const, id: 'nav_contracts', label: 'Contracts', objectName: 'contract' },
        { type: 'object' as const, id: 'nav_invoices', label: 'Invoices', objectName: 'invoice' },
        { type: 'object' as const, id: 'nav_payments', label: 'Payments', objectName: 'payment' },
        { type: 'object' as const, id: 'nav_credit_notes', label: 'Credit Notes', objectName: 'credit_note' },
        { type: 'dashboard' as const, id: 'nav_finance_dashboard', label: 'Finance Dashboard', dashboardName: 'finance_dashboard' }
      ]
    },
    // HR Cloud
    {
      type: 'group' as const,
      id: 'nav_hr',
      label: 'HR Cloud',
      icon: 'users',
      children: [
        { type: 'object' as const, id: 'nav_employees', label: 'Employees', objectName: 'employee' },
        { type: 'object' as const, id: 'nav_candidates', label: 'Candidates', objectName: 'candidate' },
        { type: 'object' as const, id: 'nav_payroll', label: 'Payroll', objectName: 'payroll' },
        { type: 'object' as const, id: 'nav_performance', label: 'Performance', objectName: 'performance_review' },
        { type: 'object' as const, id: 'nav_recruitment_kanban', label: 'Recruitment Pipeline', objectName: 'candidate', viewName: 'recruitment_kanban' },
        { type: 'dashboard' as const, id: 'nav_hr_dashboard', label: 'HR Dashboard', dashboardName: 'hr_dashboard' }
      ]
    },
    // Marketing Cloud
    {
      type: 'group' as const,
      id: 'nav_marketing',
      label: 'Marketing Cloud',
      icon: 'megaphone',
      children: [
        { type: 'object' as const, id: 'nav_campaigns', label: 'Campaigns', objectName: 'campaign' },
        { type: 'object' as const, id: 'nav_campaign_members', label: 'Campaign Members', objectName: 'campaign_member' },
        { type: 'object' as const, id: 'nav_email_templates', label: 'Email Templates', objectName: 'email_template' },
        { type: 'object' as const, id: 'nav_campaign_timeline', label: 'Campaign Timeline', objectName: 'campaign', viewName: 'campaign_timeline' },
        { type: 'dashboard' as const, id: 'nav_marketing_dashboard', label: 'Marketing Dashboard', dashboardName: 'marketing_dashboard' }
      ]
    },
    // Products / CPQ Cloud
    {
      type: 'group' as const,
      id: 'nav_products',
      label: 'CPQ Cloud',
      icon: 'package',
      children: [
        { type: 'object' as const, id: 'nav_products', label: 'Products', objectName: 'product' },
        { type: 'object' as const, id: 'nav_price_books', label: 'Price Books', objectName: 'price_book' },
        { type: 'object' as const, id: 'nav_bundles', label: 'Bundles', objectName: 'product_bundle' },
        { type: 'object' as const, id: 'nav_quotes', label: 'Quotes', objectName: 'quote' },
        { type: 'object' as const, id: 'nav_quote_gantt', label: 'Quote Approval Timeline', objectName: 'quote', viewName: 'quote_gantt' },
        { type: 'dashboard' as const, id: 'nav_cpq_dashboard', label: 'CPQ Dashboard', dashboardName: 'cpq_dashboard' }
      ]
    },
    // Support Cloud
    {
      type: 'group' as const,
      id: 'nav_support',
      label: 'Service Cloud',
      icon: 'headphones',
      children: [
        { type: 'object' as const, id: 'nav_cases', label: 'Cases', objectName: 'case' },
        { type: 'object' as const, id: 'nav_queues', label: 'Queues', objectName: 'queue' },
        { type: 'object' as const, id: 'nav_knowledge', label: 'Knowledge Base', objectName: 'knowledge_article' },
        { type: 'object' as const, id: 'nav_sla_policies', label: 'SLA Policies', objectName: 'sla_policy' },
        { type: 'object' as const, id: 'nav_case_kanban', label: 'Case Board', objectName: 'case', viewName: 'case_kanban' },
        { type: 'dashboard' as const, id: 'nav_support_dashboard', label: 'Support Dashboard', dashboardName: 'support_dashboard' }
      ]
    }
  ]
} satisfies App;

AppSchema.parse(HotCrmApp);

export default HotCrmApp;
