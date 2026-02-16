/**
 * Product Seed Data
 * Sample product catalog spanning software, hardware, services, and subscriptions
 */

export const ProductSeedData = [
  { name: 'HotCRM Professional', code: 'CRM-PRO', category: 'subscription', description: 'Full-featured CRM with sales automation, reporting, and dashboards', unit_price: 75.00, is_active: true, family: 'CRM Suite' },
  { name: 'HotCRM Enterprise', code: 'CRM-ENT', category: 'subscription', description: 'Enterprise CRM with advanced analytics, AI copilot, and custom objects', unit_price: 150.00, is_active: true, family: 'CRM Suite' },
  { name: 'HotCRM Starter', code: 'CRM-STR', category: 'subscription', description: 'Lightweight CRM for small teams with contact and deal management', unit_price: 25.00, is_active: true, family: 'CRM Suite' },
  { name: 'Analytics Dashboard Add-on', code: 'ANL-DASH', category: 'software', description: 'Interactive dashboards with drill-down reporting and custom KPIs', unit_price: 30.00, is_active: true, family: 'Analytics' },
  { name: 'Predictive Lead Scoring', code: 'ANL-PLS', category: 'software', description: 'AI-powered lead scoring engine using historical conversion data', unit_price: 45.00, is_active: true, family: 'Analytics' },
  { name: 'Revenue Intelligence Module', code: 'ANL-REV', category: 'software', description: 'Pipeline analytics and revenue forecasting powered by machine learning', unit_price: 60.00, is_active: true, family: 'Analytics' },
  { name: 'Salesforce Connector', code: 'INT-SF', category: 'software', description: 'Bidirectional data sync with Salesforce CRM', unit_price: 40.00, is_active: true, family: 'Integration' },
  { name: 'SAP ERP Connector', code: 'INT-SAP', category: 'software', description: 'Real-time integration with SAP ERP for order and invoice data', unit_price: 55.00, is_active: true, family: 'Integration' },
  { name: 'Slack Integration', code: 'INT-SLK', category: 'software', description: 'CRM notifications and deal updates directly in Slack channels', unit_price: 10.00, is_active: true, family: 'Integration' },
  { name: 'Implementation Package — Standard', code: 'SVC-IMP-S', category: 'service', description: 'Guided implementation including data migration, configuration, and training (up to 50 users)', unit_price: 15000.00, is_active: true, family: 'Services' },
  { name: 'Implementation Package — Enterprise', code: 'SVC-IMP-E', category: 'service', description: 'Full-scale enterprise implementation with custom workflows, integrations, and change management', unit_price: 45000.00, is_active: true, family: 'Services' },
  { name: 'Premium Support Plan', code: 'SVC-SUP-P', category: 'service', description: '24/7 priority support with dedicated account manager and 1-hour SLA', unit_price: 500.00, is_active: true, family: 'Services' },
  { name: 'API Gateway — 10K Requests', code: 'HW-API-10K', category: 'hardware', description: 'Dedicated API gateway appliance supporting up to 10,000 requests per second', unit_price: 8000.00, is_active: true, family: 'Infrastructure' },
  { name: 'Data Warehouse Appliance', code: 'HW-DWH', category: 'hardware', description: 'Pre-configured analytics appliance with 10 TB storage and columnar engine', unit_price: 25000.00, is_active: false, family: 'Infrastructure' },
  { name: 'Custom Training Workshop', code: 'SVC-TRN', category: 'service', description: 'On-site or virtual instructor-led training tailored to your team workflows', unit_price: 3500.00, is_active: true, family: 'Services' },
];

export default ProductSeedData;
