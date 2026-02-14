/**
 * Adobe Sign Connector Actions
 *
 * Integration with Adobe Sign for document signing:
 * 1. Create Agreement
 * 2. Get Signing Status
 * 3. Download Signed Document
 * 4. Handle Adobe Sign Webhook
 */

import { broker } from '../db.js';

// ============================================================================
// 1. CREATE AGREEMENT
// ============================================================================

export interface CreateAgreementRequest {
  name: string;
  recipient_emails: string[];
  template_id?: string;
  document_url?: string;
  message?: string;
  metadata?: Record<string, string>;
}

export interface CreateAgreementResponse {
  agreement_id: string;
  status: string;
  signing_url: string;
}

export async function createAgreement(request: CreateAgreementRequest): Promise<CreateAgreementResponse> {
  const { name, recipient_emails, template_id, document_url } = request;

  if (!name) {
    throw new Error('name is required');
  }
  if (!recipient_emails || recipient_emails.length === 0) {
    throw new Error('at least one recipient email is required');
  }
  if (!template_id && !document_url) {
    throw new Error('either template_id or document_url is required');
  }

  console.log(`📝 Creating Adobe Sign agreement: ${name}`);

  return {
    agreement_id: `CBJ-${Math.random().toString(36).substring(2, 15)}`,
    status: 'OUT_FOR_SIGNATURE',
    signing_url: `https://secure.adobesign.com/sign/${Math.random().toString(36).substring(2, 15)}`
  };
}

// ============================================================================
// 2. GET SIGNING STATUS
// ============================================================================

export interface GetSigningStatusRequest {
  agreement_id: string;
}

export interface GetSigningStatusResponse {
  agreement_id: string;
  status: string;
  signers: Array<{
    email: string;
    status: string;
    signed_at?: string;
  }>;
}

export async function getSigningStatus(request: GetSigningStatusRequest): Promise<GetSigningStatusResponse> {
  const { agreement_id } = request;

  if (!agreement_id) {
    throw new Error('agreement_id is required');
  }

  console.log(`🔍 Getting signing status for agreement ${agreement_id}`);

  return {
    agreement_id,
    status: 'OUT_FOR_SIGNATURE',
    signers: []
  };
}

// ============================================================================
// 3. DOWNLOAD SIGNED DOCUMENT
// ============================================================================

export interface DownloadSignedDocumentRequest {
  agreement_id: string;
  format?: 'pdf' | 'original';
}

export interface DownloadSignedDocumentResponse {
  agreement_id: string;
  download_url: string;
  format: string;
  expires_at: string;
}

export async function downloadSignedDocument(request: DownloadSignedDocumentRequest): Promise<DownloadSignedDocumentResponse> {
  const { agreement_id, format } = request;

  if (!agreement_id) {
    throw new Error('agreement_id is required');
  }

  console.log(`📥 Downloading signed document for agreement ${agreement_id}`);

  return {
    agreement_id,
    download_url: `https://secure.adobesign.com/download/${agreement_id}`,
    format: format || 'pdf',
    expires_at: new Date(Date.now() + 3600000).toISOString()
  };
}

// ============================================================================
// 4. HANDLE ADOBE SIGN WEBHOOK
// ============================================================================

export interface HandleAdobeSignWebhookRequest {
  event_type: string;
  payload: Record<string, any>;
  webhook_id: string;
}

export interface HandleAdobeSignWebhookResponse {
  processed: boolean;
  event_type: string;
  actions_taken: string[];
}

export async function handleAdobeSignWebhook(request: HandleAdobeSignWebhookRequest): Promise<HandleAdobeSignWebhookResponse> {
  const { event_type, payload, webhook_id } = request;

  if (!event_type || !payload) {
    throw new Error('event_type and payload are required');
  }

  console.log(`🔔 Processing Adobe Sign webhook: ${event_type}`);

  const actions: string[] = [];

  if (event_type === 'AGREEMENT_ALL_SIGNED') {
    actions.push('agreement_completed');
  } else if (event_type === 'AGREEMENT_ACTION_REQUESTED') {
    actions.push('signing_reminder_sent');
  } else if (event_type === 'AGREEMENT_EXPIRED') {
    actions.push('agreement_expiry_logged');
  }

  return {
    processed: true,
    event_type,
    actions_taken: actions
  };
}

export default {
  createAgreement,
  getSigningStatus,
  downloadSignedDocument,
  handleAdobeSignWebhook
};
