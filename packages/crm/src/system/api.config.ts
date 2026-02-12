import { ApiEndpointRegistrationSchema } from '@objectstack/spec/api';
import type { z } from 'zod';

type ApiEndpointRegistration = z.infer<typeof ApiEndpointRegistrationSchema>;

// ---------------------------------------------------------------------------
// Account Endpoints
// ---------------------------------------------------------------------------

export const listAccounts: ApiEndpointRegistration =
  ApiEndpointRegistrationSchema.parse({
    id: 'crm_accounts_list',
    path: '/api/v1/crm/accounts',
    method: 'GET',
    description: 'List all accounts with filtering and pagination',
    tags: ['crm', 'accounts'],
    requiredPermissions: ['account.read'],
    parameters: [
      { name: 'limit', in: 'query', schema: { type: 'number' }, description: 'Maximum results to return' },
      { name: 'offset', in: 'query', schema: { type: 'number' }, description: 'Offset for pagination' },
      { name: 'industry', in: 'query', schema: { type: 'string' }, description: 'Filter by industry' },
    ],
    responses: [
      { statusCode: 200, description: 'List of accounts' },
      { statusCode: 401, description: 'Unauthorized' },
    ],
  });

export const getAccount: ApiEndpointRegistration =
  ApiEndpointRegistrationSchema.parse({
    id: 'crm_accounts_get',
    path: '/api/v1/crm/accounts/:id',
    method: 'GET',
    description: 'Get a single account by ID',
    tags: ['crm', 'accounts'],
    requiredPermissions: ['account.read'],
    parameters: [
      { name: 'id', in: 'path', schema: { type: 'string' }, description: 'Account ID', required: true },
    ],
    responses: [
      { statusCode: 200, description: 'Account details' },
      { statusCode: '4xx', description: 'Not found or unauthorized' },
    ],
  });

export const createAccount: ApiEndpointRegistration =
  ApiEndpointRegistrationSchema.parse({
    id: 'crm_accounts_create',
    path: '/api/v1/crm/accounts',
    method: 'POST',
    description: 'Create a new account',
    tags: ['crm', 'accounts'],
    requiredPermissions: ['account.create'],
    responses: [
      { statusCode: 200, description: 'Created account' },
      { statusCode: '4xx', description: 'Validation error or unauthorized' },
    ],
  });

export const updateAccount: ApiEndpointRegistration =
  ApiEndpointRegistrationSchema.parse({
    id: 'crm_accounts_update',
    path: '/api/v1/crm/accounts/:id',
    method: 'PUT',
    description: 'Update an existing account',
    tags: ['crm', 'accounts'],
    requiredPermissions: ['account.update'],
    parameters: [
      { name: 'id', in: 'path', schema: { type: 'string' }, description: 'Account ID', required: true },
    ],
    responses: [
      { statusCode: 200, description: 'Updated account' },
      { statusCode: '4xx', description: 'Not found or validation error' },
    ],
  });

export const deleteAccount: ApiEndpointRegistration =
  ApiEndpointRegistrationSchema.parse({
    id: 'crm_accounts_delete',
    path: '/api/v1/crm/accounts/:id',
    method: 'DELETE',
    description: 'Delete an account',
    tags: ['crm', 'accounts'],
    requiredPermissions: ['account.delete'],
    parameters: [
      { name: 'id', in: 'path', schema: { type: 'string' }, description: 'Account ID', required: true },
    ],
    responses: [
      { statusCode: 200, description: 'Account deleted' },
      { statusCode: '4xx', description: 'Not found or unauthorized' },
    ],
  });

// ---------------------------------------------------------------------------
// Contact Endpoints
// ---------------------------------------------------------------------------

export const listContacts: ApiEndpointRegistration =
  ApiEndpointRegistrationSchema.parse({
    id: 'crm_contacts_list',
    path: '/api/v1/crm/contacts',
    method: 'GET',
    description: 'List all contacts with filtering and pagination',
    tags: ['crm', 'contacts'],
    requiredPermissions: ['contact.read'],
    parameters: [
      { name: 'limit', in: 'query', schema: { type: 'number' }, description: 'Maximum results to return' },
      { name: 'offset', in: 'query', schema: { type: 'number' }, description: 'Offset for pagination' },
      { name: 'account_id', in: 'query', schema: { type: 'string' }, description: 'Filter by account' },
    ],
    responses: [
      { statusCode: 200, description: 'List of contacts' },
      { statusCode: 401, description: 'Unauthorized' },
    ],
  });

export const createContact: ApiEndpointRegistration =
  ApiEndpointRegistrationSchema.parse({
    id: 'crm_contacts_create',
    path: '/api/v1/crm/contacts',
    method: 'POST',
    description: 'Create a new contact',
    tags: ['crm', 'contacts'],
    requiredPermissions: ['contact.create'],
    responses: [
      { statusCode: 200, description: 'Created contact' },
      { statusCode: '4xx', description: 'Validation error or unauthorized' },
    ],
  });

// ---------------------------------------------------------------------------
// Opportunity Endpoints
// ---------------------------------------------------------------------------

export const listOpportunities: ApiEndpointRegistration =
  ApiEndpointRegistrationSchema.parse({
    id: 'crm_opportunities_list',
    path: '/api/v1/crm/opportunities',
    method: 'GET',
    description: 'List all opportunities with filtering and pagination',
    tags: ['crm', 'opportunities'],
    requiredPermissions: ['opportunity.read'],
    parameters: [
      { name: 'limit', in: 'query', schema: { type: 'number' }, description: 'Maximum results to return' },
      { name: 'offset', in: 'query', schema: { type: 'number' }, description: 'Offset for pagination' },
      { name: 'stage', in: 'query', schema: { type: 'string' }, description: 'Filter by stage' },
      { name: 'account_id', in: 'query', schema: { type: 'string' }, description: 'Filter by account' },
    ],
    responses: [
      { statusCode: 200, description: 'List of opportunities' },
      { statusCode: 401, description: 'Unauthorized' },
    ],
  });

export const createOpportunity: ApiEndpointRegistration =
  ApiEndpointRegistrationSchema.parse({
    id: 'crm_opportunities_create',
    path: '/api/v1/crm/opportunities',
    method: 'POST',
    description: 'Create a new opportunity',
    tags: ['crm', 'opportunities'],
    requiredPermissions: ['opportunity.create'],
    responses: [
      { statusCode: 200, description: 'Created opportunity' },
      { statusCode: '4xx', description: 'Validation error or unauthorized' },
    ],
  });

// ---------------------------------------------------------------------------
// Lead Endpoints
// ---------------------------------------------------------------------------

export const listLeads: ApiEndpointRegistration =
  ApiEndpointRegistrationSchema.parse({
    id: 'crm_leads_list',
    path: '/api/v1/crm/leads',
    method: 'GET',
    description: 'List all leads with filtering and pagination',
    tags: ['crm', 'leads'],
    requiredPermissions: ['lead.read'],
    parameters: [
      { name: 'limit', in: 'query', schema: { type: 'number' }, description: 'Maximum results to return' },
      { name: 'offset', in: 'query', schema: { type: 'number' }, description: 'Offset for pagination' },
      { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by lead status' },
    ],
    responses: [
      { statusCode: 200, description: 'List of leads' },
      { statusCode: 401, description: 'Unauthorized' },
    ],
  });

export const createLead: ApiEndpointRegistration =
  ApiEndpointRegistrationSchema.parse({
    id: 'crm_leads_create',
    path: '/api/v1/crm/leads',
    method: 'POST',
    description: 'Create a new lead',
    tags: ['crm', 'leads'],
    requiredPermissions: ['lead.create'],
    responses: [
      { statusCode: 200, description: 'Created lead' },
      { statusCode: '4xx', description: 'Validation error or unauthorized' },
    ],
  });

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const accountEndpoints = {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
};

export const contactEndpoints = {
  listContacts,
  createContact,
};

export const opportunityEndpoints = {
  listOpportunities,
  createOpportunity,
};

export const leadEndpoints = {
  listLeads,
  createLead,
};

export const crmApiEndpoints = {
  ...accountEndpoints,
  ...contactEndpoints,
  ...opportunityEndpoints,
  ...leadEndpoints,
};

export default crmApiEndpoints;
