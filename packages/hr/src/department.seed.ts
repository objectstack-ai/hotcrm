/**
 * Department Seed Data
 * Standard organizational department types
 */

export const DepartmentSeedData = [
  { code: 'ENG', name: 'Engineering', parent_id: null, cost_center: 'CC-100' },
  { code: 'SALES', name: 'Sales', parent_id: null, cost_center: 'CC-200' },
  { code: 'MKT', name: 'Marketing', parent_id: null, cost_center: 'CC-300' },
  { code: 'FIN', name: 'Finance', parent_id: null, cost_center: 'CC-400' },
  { code: 'HR', name: 'Human Resources', parent_id: null, cost_center: 'CC-500' },
  { code: 'OPS', name: 'Operations', parent_id: null, cost_center: 'CC-600' },
  { code: 'LEGAL', name: 'Legal', parent_id: null, cost_center: 'CC-700' },
  { code: 'CS', name: 'Customer Success', parent_id: null, cost_center: 'CC-800' },
  { code: 'IT', name: 'Information Technology', parent_id: null, cost_center: 'CC-900' },
  { code: 'RD', name: 'Research & Development', parent_id: 'ENG', cost_center: 'CC-110' },
  { code: 'QA', name: 'Quality Assurance', parent_id: 'ENG', cost_center: 'CC-120' },
  { code: 'PM', name: 'Product Management', parent_id: 'ENG', cost_center: 'CC-130' }
];

export default DepartmentSeedData;
