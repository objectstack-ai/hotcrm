/**
 * Case Seed Data
 * Sample support cases across priorities, statuses, and channels
 */

export const CaseSeedData = [
  { case_number: 'CS-2025-0001', subject: 'Unable to log in after password reset', description: 'Customer reports that the password reset email link expires immediately. Tried multiple browsers and devices.', status: 'open', priority: 'high', type: 'problem', origin: 'email', account_name: 'Acme Corporation', contact_name: 'John Carter' },
  { case_number: 'CS-2025-0002', subject: 'How to configure custom dashboards', description: 'Customer is asking for step-by-step guidance on creating and sharing custom dashboards with their team.', status: 'closed', priority: 'low', type: 'question', origin: 'chat', account_name: 'GlobalTech Solutions', contact_name: 'Maria Chen' },
  { case_number: 'CS-2025-0003', subject: 'Data import failing for large CSV files', description: 'Import wizard crashes when uploading CSV files larger than 50 MB. Error: "Request entity too large".', status: 'in_progress', priority: 'high', type: 'problem', origin: 'web', account_name: 'Summit Financial Group', contact_name: 'David Park' },
  { case_number: 'CS-2025-0004', subject: 'Request for bulk email sending limits increase', description: 'Customer needs daily email sending limit raised from 5,000 to 20,000 for upcoming marketing campaign.', status: 'new', priority: 'medium', type: 'feature_request', origin: 'email', account_name: 'BrightPath Media', contact_name: 'Sarah Lopez' },
  { case_number: 'CS-2025-0005', subject: 'Production outage — API returning 503 errors', description: 'All API endpoints returning 503 Service Unavailable since 14:30 UTC. Multiple integrations affected across the organization.', status: 'escalated', priority: 'critical', type: 'incident', origin: 'phone', account_name: 'NovaStar Energy', contact_name: 'James Wright' },
  { case_number: 'CS-2025-0006', subject: 'Report export to PDF cuts off columns', description: 'When exporting wide reports to PDF format, the last two columns are truncated. Works fine in Excel export.', status: 'open', priority: 'medium', type: 'problem', origin: 'web', account_name: 'GreenLeaf Manufacturing', contact_name: 'Emily Tran' },
  { case_number: 'CS-2025-0007', subject: 'Add support for multi-currency pricing', description: 'Customer operates in EUR, GBP, and USD markets. Requesting native multi-currency support in the quoting module.', status: 'new', priority: 'medium', type: 'feature_request', origin: 'email', account_name: 'Pacific Retail Holdings', contact_name: 'Robert Kim' },
  { case_number: 'CS-2025-0008', subject: 'SSO integration with Okta not redirecting', description: 'SAML SSO flow initiates but fails to redirect back to the application after Okta authentication. IdP metadata was uploaded correctly.', status: 'in_progress', priority: 'high', type: 'problem', origin: 'phone', account_name: 'MedVita Health Systems', contact_name: 'Linda Nguyen' },
  { case_number: 'CS-2025-0009', subject: 'How to set up workflow automation rules', description: 'New admin needs guidance on configuring automated lead assignment rules and email alerts based on record criteria.', status: 'closed', priority: 'low', type: 'question', origin: 'chat', account_name: 'EduPrime Learning', contact_name: 'Thomas Reed' },
  { case_number: 'CS-2025-0010', subject: 'Scheduled report delivery stopped working', description: 'Daily scheduled report emails have not been delivered for the past three days. No changes were made to the schedule configuration.', status: 'open', priority: 'high', type: 'incident', origin: 'web', account_name: 'Horizon Real Estate Group', contact_name: 'Angela Brooks' },
];

export default CaseSeedData;
