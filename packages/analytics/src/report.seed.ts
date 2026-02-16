/**
 * Report Seed Data
 * Sample reports demonstrating tabular, summary, and matrix report types
 */

export const ReportSeedData = [
  { name: 'Open Opportunities by Stage', description: 'Tabular report listing all open opportunities grouped by current stage with close dates and amounts.', type: 'tabular', object_name: 'opportunity', columns: ['name', 'account_name', 'stage', 'amount', 'close_date', 'owner'], filters: [{ field: 'is_closed', operator: '=', value: false }, { field: 'amount', operator: '>', value: 0 }], sort_by: 'close_date', group_by: 'stage', created_by: 'admin@hotcrm.example.com' },
  { name: 'Quarterly Revenue Summary', description: 'Summary report aggregating closed-won revenue by quarter and sales region.', type: 'summary', object_name: 'opportunity', columns: ['name', 'amount', 'close_date', 'region', 'owner'], filters: [{ field: 'stage', operator: '=', value: 'Closed Won' }, { field: 'close_date', operator: '>=', value: '2025-01-01' }], sort_by: 'amount', group_by: 'region', created_by: 'james.wilson@hotcrm.example.com' },
  { name: 'Support Cases by Priority and Status', description: 'Matrix report showing case counts across priority levels and current statuses.', type: 'matrix', object_name: 'case', columns: ['case_number', 'subject', 'priority', 'status', 'created_date', 'assigned_to'], filters: [{ field: 'created_date', operator: '>=', value: '2025-01-01' }], sort_by: 'priority', group_by: 'status', created_by: 'rachel.adams@hotcrm.example.com' },
];

export default ReportSeedData;
