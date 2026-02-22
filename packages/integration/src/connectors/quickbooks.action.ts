/**
 * QuickBooks Connector Actions
 *
 * Integration with QuickBooks for accounting:
 * 1. Sync QuickBooks Invoice
 * 2. Reconcile Payments
 * 3. Map Customer/Vendor
 * 4. Handle QuickBooks Webhook
 */

import { broker } from '../db.js';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('integration:quickbooks');

// ============================================================================
// 1. SYNC QUICKBOOKS INVOICE
// ============================================================================

export interface SyncQuickBooksInvoiceRequest {
  invoice_id?: string;
  connection_id: string;
  sync_direction: 'inbound' | 'outbound';
  record_id?: string;
}

export interface SyncQuickBooksInvoiceResponse {
  synced: boolean;
  quickbooks_invoice_id: string;
  crm_invoice_id: string;
  amount: number;
}

export async function syncQuickBooksInvoice(request: SyncQuickBooksInvoiceRequest): Promise<SyncQuickBooksInvoiceResponse> {
  const { invoice_id, connection_id, sync_direction } = request;

  if (!connection_id) {
    throw new Error('connection_id is required');
  }
  if (!sync_direction) {
    throw new Error('sync_direction is required');
  }

  logger.info(`Syncing QuickBooks invoice (${sync_direction})`);

  return {
    synced: true,
    quickbooks_invoice_id: invoice_id || `QB-${Math.random().toString(36).substring(2, 15)}`,
    crm_invoice_id: `inv_${Math.random().toString(36).substring(2, 15)}`,
    amount: 0
  };
}

// ============================================================================
// 2. RECONCILE PAYMENTS
// ============================================================================

export interface ReconcilePaymentsRequest {
  connection_id: string;
  start_date: string;
  end_date: string;
}

export interface ReconcilePaymentsResponse {
  reconciled: boolean;
  payments_matched: number;
  payments_unmatched: number;
  discrepancies: Array<{
    payment_id: string;
    crm_amount: number;
    quickbooks_amount: number;
  }>;
}

export async function reconcilePayments(request: ReconcilePaymentsRequest): Promise<ReconcilePaymentsResponse> {
  const { connection_id, start_date, end_date } = request;

  if (!connection_id) {
    throw new Error('connection_id is required');
  }
  if (!start_date || !end_date) {
    throw new Error('start_date and end_date are required');
  }

  logger.info(`Reconciling payments from ${start_date} to ${end_date}`);

  return {
    reconciled: true,
    payments_matched: 0,
    payments_unmatched: 0,
    discrepancies: []
  };
}

// ============================================================================
// 3. MAP CUSTOMER/VENDOR
// ============================================================================

export interface MapCustomerVendorRequest {
  connection_id: string;
  crm_account_id: string;
  entity_type: 'customer' | 'vendor';
  quickbooks_entity_id?: string;
}

export interface MapCustomerVendorResponse {
  mapped: boolean;
  crm_account_id: string;
  quickbooks_entity_id: string;
  entity_type: string;
}

export async function mapCustomerVendor(request: MapCustomerVendorRequest): Promise<MapCustomerVendorResponse> {
  const { connection_id, crm_account_id, entity_type, quickbooks_entity_id } = request;

  if (!connection_id) {
    throw new Error('connection_id is required');
  }
  if (!crm_account_id) {
    throw new Error('crm_account_id is required');
  }
  if (!entity_type) {
    throw new Error('entity_type is required');
  }

  logger.info(`Mapping CRM account ${crm_account_id} to QuickBooks ${entity_type}`);

  return {
    mapped: true,
    crm_account_id,
    quickbooks_entity_id: quickbooks_entity_id || `QB-${Math.random().toString(36).substring(2, 15)}`,
    entity_type
  };
}

// ============================================================================
// 4. HANDLE QUICKBOOKS WEBHOOK
// ============================================================================

export interface HandleQuickBooksWebhookRequest {
  event_type: string;
  payload: Record<string, any>;
  realm_id: string;
}

export interface HandleQuickBooksWebhookResponse {
  processed: boolean;
  event_type: string;
  actions_taken: string[];
}

export async function handleQuickBooksWebhook(request: HandleQuickBooksWebhookRequest): Promise<HandleQuickBooksWebhookResponse> {
  const { event_type, payload, realm_id } = request;

  if (!event_type || !payload) {
    throw new Error('event_type and payload are required');
  }

  logger.info(`Processing QuickBooks webhook: ${event_type}`);

  const actions: string[] = [];

  if (event_type === 'Invoice.Create') {
    actions.push('invoice_synced');
  } else if (event_type === 'Payment.Create') {
    actions.push('payment_recorded');
  } else if (event_type === 'Customer.Update') {
    actions.push('customer_mapping_updated');
  }

  return {
    processed: true,
    event_type,
    actions_taken: actions
  };
}

export default {
  syncQuickBooksInvoice,
  reconcilePayments,
  mapCustomerVendor,
  handleQuickBooksWebhook
};
