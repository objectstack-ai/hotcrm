/**
 * HR MCP Tools
 *
 * Exposes human-resources capabilities (employee search, org chart,
 * PTO balance, request submission) as Model Context Protocol tools
 * for AI agent consumption.
 */

import type { MCPTool } from '@objectstack/spec/ai';
import { MCPToolSchema } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// search_employees
// ---------------------------------------------------------------------------

export const SearchEmployeesTool = {
  name: 'search_employees',
  description:
    'Search the employee directory by name, title, or skills. Optionally filter by department to narrow results.',
  handler: 'hr.search_employees.execute',
  parameters: [
    {
      name: 'query',
      type: 'string' as const,
      description: 'Free-text search query matched against employee name, title, and skills',
      required: true,
    },
    {
      name: 'department',
      type: 'string' as const,
      description: 'Filter results to a specific department',
      required: false,
    },
  ],
  returns: { type: 'array' as const, description: 'Array of matching employee records with key profile fields' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 15000,
  version: '1.0.0',
  category: 'hr',
  tags: ['employee', 'directory', 'search'],
  examples: [
    {
      description: 'Search for engineers in the product department',
      parameters: { query: 'engineer', department: 'Product' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(SearchEmployeesTool);

// ---------------------------------------------------------------------------
// get_org_chart
// ---------------------------------------------------------------------------

export const GetOrgChartTool = {
  name: 'get_org_chart',
  description:
    'Retrieve the organisational hierarchy tree. When a root employee ID is provided, returns the sub-tree rooted at that employee; otherwise returns the full org chart.',
  handler: 'hr.get_org_chart.execute',
  parameters: [
    {
      name: 'root_employee_id',
      type: 'string' as const,
      description: 'Employee ID to use as the root of the sub-tree. Omit for the full org chart.',
      required: false,
    },
  ],
  returns: { type: 'object' as const, description: 'Hierarchical org-chart tree with employee nodes' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 20000,
  version: '1.0.0',
  category: 'hr',
  tags: ['org_chart', 'hierarchy', 'organisation'],
  examples: [
    {
      description: 'Get the org chart under a specific VP',
      parameters: { root_employee_id: 'emp_vp_eng_001' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(GetOrgChartTool);

// ---------------------------------------------------------------------------
// check_pto_balance
// ---------------------------------------------------------------------------

export const CheckPtoBalanceTool = {
  name: 'check_pto_balance',
  description:
    'Check the paid-time-off balance for an employee, returning available days by leave type (vacation, sick, personal).',
  handler: 'hr.check_pto_balance.execute',
  parameters: [
    {
      name: 'employee_id',
      type: 'string' as const,
      description: 'Unique identifier of the employee',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'PTO balance breakdown by leave type' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 10000,
  version: '1.0.0',
  category: 'hr',
  tags: ['pto', 'leave', 'balance'],
  examples: [
    {
      description: 'Check PTO balance for an employee',
      parameters: { employee_id: 'emp_042' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(CheckPtoBalanceTool);

// ---------------------------------------------------------------------------
// submit_request
// ---------------------------------------------------------------------------

export const SubmitRequestTool = {
  name: 'submit_request',
  description:
    'Submit an HR request (e.g. time-off, expense reimbursement, equipment) on behalf of an employee. Creates a request record and triggers the appropriate approval workflow.',
  handler: 'hr.submit_request.execute',
  parameters: [
    {
      name: 'type',
      type: 'string' as const,
      description: 'Type of HR request',
      required: true,
      enum: ['time_off', 'expense', 'equipment', 'training', 'other'],
    },
    {
      name: 'employee_id',
      type: 'string' as const,
      description: 'Unique identifier of the employee submitting the request',
      required: true,
    },
    {
      name: 'details',
      type: 'string' as const,
      description: 'Free-text description of the request including relevant dates, amounts, or justification',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Created request record with tracking ID and approval status' },
  sideEffects: 'write' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 15000,
  version: '1.0.0',
  category: 'hr',
  tags: ['request', 'workflow', 'approval'],
  examples: [
    {
      description: 'Submit a time-off request',
      parameters: { type: 'time_off', employee_id: 'emp_042', details: 'Vacation Dec 23–27, 2024' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(SubmitRequestTool);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  searchEmployees: SearchEmployeesTool,
  getOrgChart: GetOrgChartTool,
  checkPtoBalance: CheckPtoBalanceTool,
  submitRequest: SubmitRequestTool,
};
