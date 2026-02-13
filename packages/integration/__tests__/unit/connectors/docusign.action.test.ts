import { describe, it, expect } from 'vitest';
import {
  createEnvelope,
  getSigningStatus,
  downloadSignedDocument,
  handleDocuSignWebhook,
} from '../../../src/connectors/docusign.action';

// ─── createEnvelope ────────────────────────────────────────────────────────────

describe('createEnvelope', () => {
  it('should create an envelope with valid input', async () => {
    const result = await createEnvelope({
      recipients: [{ name: 'John Doe', email: 'john@example.com', role: 'signer' }],
      subject: 'Contract Signing',
    });
    expect(result.envelope_id).toMatch(/^env_/);
    expect(result.status).toBe('sent');
    expect(result.uri).toContain('/envelopes/');
  });

  it('should accept optional template_id, documents, and message', async () => {
    const result = await createEnvelope({
      template_id: 'tmpl_123',
      recipients: [{ name: 'Jane', email: 'jane@example.com', role: 'signer' }],
      documents: [{ name: 'contract.pdf', content: 'base64content' }],
      subject: 'NDA',
      message: 'Please sign this NDA',
    });
    expect(result.envelope_id).toBeDefined();
  });

  it('should throw when recipients is empty', async () => {
    await expect(
      createEnvelope({ recipients: [], subject: 'Test' })
    ).rejects.toThrow('At least one recipient is required');
  });

  it('should throw when subject is missing', async () => {
    await expect(
      createEnvelope({
        recipients: [{ name: 'John', email: 'john@example.com', role: 'signer' }],
        subject: '',
      })
    ).rejects.toThrow('subject is required');
  });
});

// ─── getSigningStatus ──────────────────────────────────────────────────────────

describe('getSigningStatus', () => {
  it('should return signing status for a valid envelope', async () => {
    const result = await getSigningStatus({ envelope_id: 'env_abc123' });
    expect(result.envelope_id).toBe('env_abc123');
    expect(result.status).toBe('completed');
    expect(result.recipients).toHaveLength(1);
    expect(result.recipients[0].status).toBe('completed');
  });

  it('should throw when envelope_id is missing', async () => {
    await expect(getSigningStatus({ envelope_id: '' })).rejects.toThrow('envelope_id is required');
  });
});

// ─── downloadSignedDocument ────────────────────────────────────────────────────

describe('downloadSignedDocument', () => {
  it('should return download URL for signed document', async () => {
    const result = await downloadSignedDocument({ envelope_id: 'env_abc123' });
    expect(result.envelope_id).toBe('env_abc123');
    expect(result.document_url).toContain('/documents/');
    expect(result.content_type).toBe('application/pdf');
  });

  it('should accept optional document_id', async () => {
    const result = await downloadSignedDocument({
      envelope_id: 'env_abc123',
      document_id: 'doc_456',
    });
    expect(result.envelope_id).toBe('env_abc123');
  });

  it('should throw when envelope_id is missing', async () => {
    await expect(downloadSignedDocument({ envelope_id: '' })).rejects.toThrow('envelope_id is required');
  });
});

// ─── handleDocuSignWebhook ─────────────────────────────────────────────────────

describe('handleDocuSignWebhook', () => {
  it('should process envelope-completed event', async () => {
    const result = await handleDocuSignWebhook({
      event: 'envelope-completed',
      envelope_id: 'env_123',
      payload: {},
    });
    expect(result.processed).toBe(true);
    expect(result.event).toBe('envelope-completed');
    expect(result.actions_taken).toContain('document_stored');
    expect(result.actions_taken).toContain('contract_updated');
  });

  it('should process recipient-completed event', async () => {
    const result = await handleDocuSignWebhook({
      event: 'recipient-completed',
      envelope_id: 'env_123',
      payload: {},
    });
    expect(result.actions_taken).toContain('signature_recorded');
  });

  it('should process envelope-declined event', async () => {
    const result = await handleDocuSignWebhook({
      event: 'envelope-declined',
      envelope_id: 'env_123',
      payload: {},
    });
    expect(result.actions_taken).toContain('decline_logged');
  });

  it('should return empty actions for unknown events', async () => {
    const result = await handleDocuSignWebhook({
      event: 'unknown-event',
      envelope_id: 'env_123',
      payload: {},
    });
    expect(result.processed).toBe(true);
    expect(result.actions_taken).toHaveLength(0);
  });

  it('should throw when event is missing', async () => {
    await expect(
      handleDocuSignWebhook({ event: '', envelope_id: 'env_123', payload: {} })
    ).rejects.toThrow('event and envelope_id are required');
  });

  it('should throw when envelope_id is missing', async () => {
    await expect(
      handleDocuSignWebhook({ event: 'envelope-completed', envelope_id: '', payload: {} })
    ).rejects.toThrow('event and envelope_id are required');
  });
});
