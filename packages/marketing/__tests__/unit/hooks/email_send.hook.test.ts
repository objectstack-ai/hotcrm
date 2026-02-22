import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  EmailSendTrackingTrigger,
  EmailSendValidationTrigger
} from '../../../src/hooks/email_send.hook';

vi.mock('@hotcrm/core', () => ({
  createLogger: () => ({
    info: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    debug: (...args: any[]) => console.debug(...args),
    fatal: (...args: any[]) => console.error(...args),
  }),
  logger: {
    info: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    debug: (...args: any[]) => console.debug(...args),
    fatal: (...args: any[]) => console.error(...args),
  },
}));

const mockQlFind = vi.fn();
const mockQlDocGet = vi.fn();
const mockQlDocCreate = vi.fn();
const mockQlDocUpdate = vi.fn();

const createMockContext = (
  event: string,
  doc: any,
  previous?: any,
  result?: any
): HookContext => {
  const baseContext: any = {
    event,
    ql: {
      find: mockQlFind,
      doc: { get: mockQlDocGet, create: mockQlDocCreate, update: mockQlDocUpdate }
    },
    session: { userId: 'user_123', tenantId: 'tenant_123' }
  };

  if (event.startsWith('before')) {
    baseContext.input = { doc };
    baseContext.previous = previous;
  } else {
    baseContext.result = result || doc;
    baseContext.previous = previous;
    baseContext.input = { doc };
  }
  return baseContext;
};

describe('EmailSend Hook - EmailSendTrackingTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update campaign metrics when email status changes', async () => {
    const emailSend = { _id: 'es_001', campaign: 'camp_001', status: 'opened' };
    const previous = { status: 'sent' };
    const allSends = [
      { status: 'opened' },
      { status: 'clicked' },
      { status: 'sent' },
      { status: 'bounced' }
    ];
    mockQlFind.mockResolvedValue(allSends);

    const ctx = createMockContext('afterUpdate', emailSend, previous, emailSend);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await EmailSendTrackingTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('campaign', 'camp_001', expect.objectContaining({
      total_sent: 4,
      total_opened: 2, // opened + clicked
      total_clicked: 1,
      total_bounced: 1,
      open_rate: 50,
      click_rate: 25,
      bounce_rate: 25
    }));
    consoleSpy.mockRestore();
  });

  it('should not trigger when status has not changed', async () => {
    const emailSend = { _id: 'es_002', campaign: 'camp_002', status: 'sent' };
    const previous = { status: 'sent' };
    const ctx = createMockContext('afterUpdate', emailSend, previous, emailSend);

    await EmailSendTrackingTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should skip when no campaign linked', async () => {
    const emailSend = { _id: 'es_003', status: 'opened' };
    const previous = { status: 'sent' };
    const ctx = createMockContext('afterUpdate', emailSend, previous, emailSend);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await EmailSendTrackingTrigger.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should not trigger without previous state', async () => {
    const emailSend = { _id: 'es_004', campaign: 'camp_004', status: 'opened' };
    const ctx = createMockContext('afterUpdate', emailSend, undefined, emailSend);

    await EmailSendTrackingTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });
});

describe('EmailSend Hook - EmailSendValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject invalid email format', async () => {
    const doc = { recipient_email: 'not-an-email' };
    const ctx = createMockContext('beforeInsert', doc);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await EmailSendValidationTrigger.handler(ctx);

    expect(ctx.input.doc.status).toBe('failed');
    expect(ctx.input.doc.failure_reason).toBe('Invalid recipient email format');
    errorSpy.mockRestore();
  });

  it('should reject when recipient is unsubscribed', async () => {
    const doc = { recipient_email: 'unsubscribed@example.com' };
    mockQlFind.mockResolvedValue([{ email: 'unsubscribed@example.com' }]);
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await EmailSendValidationTrigger.handler(ctx);

    expect(ctx.input.doc.status).toBe('failed');
    expect(ctx.input.doc.failure_reason).toBe('Recipient has unsubscribed');
    consoleSpy.mockRestore();
  });

  it('should generate tracking_id when not provided', async () => {
    const doc = { recipient_email: 'valid@example.com' };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await EmailSendValidationTrigger.handler(ctx);

    expect(ctx.input.doc.tracking_id).toBeDefined();
    expect(ctx.input.doc.tracking_id).toMatch(/^trk_/);
    consoleSpy.mockRestore();
  });

  it('should not overwrite existing tracking_id', async () => {
    const doc = { recipient_email: 'valid@example.com', tracking_id: 'existing_id' };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeInsert', doc);

    await EmailSendValidationTrigger.handler(ctx);

    expect(ctx.input.doc.tracking_id).toBe('existing_id');
  });

  it('should reject when no recipient_email provided', async () => {
    const doc = {};
    const ctx = createMockContext('beforeInsert', doc);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await EmailSendValidationTrigger.handler(ctx);

    expect(ctx.input.doc.status).toBe('failed');
    errorSpy.mockRestore();
  });
});
