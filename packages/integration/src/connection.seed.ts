/**
 * Connection Seed Data
 * Sample integration connections for common third-party services
 */

export const ConnectionSeedData = [
  { name: 'Salesforce Production Sync', connector_type: 'salesforce', status: 'connected', environment: 'production', last_sync_at: '2025-06-20T14:30:00Z', sync_frequency: 'every_15_minutes', config: { instance_url: 'https://acme.my.salesforce.com', api_version: '60.0', sync_direction: 'bidirectional', objects: ['Account', 'Contact', 'Opportunity'] } },
  { name: 'Slack Notifications', connector_type: 'slack', status: 'disconnected', environment: 'sandbox', last_sync_at: '2025-06-10T09:15:00Z', sync_frequency: 'real_time', config: { workspace: 'hotcrm-dev', default_channel: '#crm-alerts', notify_on: ['deal_closed', 'case_escalated', 'lead_converted'] } },
];

export default ConnectionSeedData;
