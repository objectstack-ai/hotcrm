/**
 * Product Seed Data
 * Sample product catalog spanning software, hardware, services, and subscriptions
 */

export const ProductSeedData = [
  { name: 'HotCRM Professional', description: 'Full-featured CRM with sales automation, reporting, and dashboards', is_active: true, family: 'crm_suite' },
  { name: 'HotCRM Enterprise', description: 'Enterprise CRM with advanced analytics, AI copilot, and custom objects', is_active: true, family: 'crm_suite' },
  { name: 'HotCRM Starter', description: 'Lightweight CRM for small teams with contact and deal management', is_active: true, family: 'crm_suite' },
  { name: 'Analytics Dashboard Add-on', description: 'Interactive dashboards with drill-down reporting and custom KPIs', is_active: true, family: 'analytics' },
  { name: 'Predictive Lead Scoring', description: 'AI-powered lead scoring engine using historical conversion data', is_active: true, family: 'analytics' },
  { name: 'Revenue Intelligence Module', description: 'Pipeline analytics and revenue forecasting powered by machine learning', is_active: true, family: 'analytics' },
  { name: 'Salesforce Connector', description: 'Bidirectional data sync with Salesforce CRM', is_active: true, family: 'integration' },
  { name: 'SAP ERP Connector', description: 'Real-time integration with SAP ERP for order and invoice data', is_active: true, family: 'integration' },
  { name: 'Slack Integration', description: 'CRM notifications and deal updates directly in Slack channels', is_active: true, family: 'integration' },
  { name: 'Implementation Package — Standard', description: 'Guided implementation including data migration, configuration, and training (up to 50 users)', is_active: true, family: 'services' },
  { name: 'Implementation Package — Enterprise', description: 'Full-scale enterprise implementation with custom workflows, integrations, and change management', is_active: true, family: 'services' },
  { name: 'Premium Support Plan', description: '24/7 priority support with dedicated account manager and 1-hour SLA', is_active: true, family: 'services' },
  { name: 'API Gateway — 10K Requests', description: 'Dedicated API gateway appliance supporting up to 10,000 requests per second', is_active: true, family: 'infrastructure' },
  { name: 'Data Warehouse Appliance', description: 'Pre-configured analytics appliance with 10 TB storage and columnar engine', is_active: false, family: 'infrastructure' },
  { name: 'Custom Training Workshop', description: 'On-site or virtual instructor-led training tailored to your team workflows', is_active: true, family: 'services' }
];

export default ProductSeedData;
