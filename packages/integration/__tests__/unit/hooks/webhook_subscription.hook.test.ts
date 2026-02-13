import { describe, it, expect, vi } from 'vitest';
import { SubscriptionValidation, SecretRotation, EndpointVerification } from '../../../src/webhook_subscription.hook';

function createMockContext(overrides: Record<string, any> = {}): any {
  return {
    input: { doc: {} },
    result: null,
    ql: {
      find: vi.fn().mockResolvedValue([]),
      doc: {
        update: vi.fn().mockResolvedValue({}),
      },
    },
    ...overrides,
  };
}

// ─── SubscriptionValidation ────────────────────────────────────────────────────

describe('SubscriptionValidation Hook', () => {
  it('should have correct hook metadata', () => {
    expect(SubscriptionValidation.name).toBe('SubscriptionValidation');
    expect(SubscriptionValidation.object).toBe('webhook_subscription');
    expect(SubscriptionValidation.events).toContain('beforeInsert');
    expect(SubscriptionValidation.events).toContain('beforeUpdate');
  });

  it('should accept a valid target_url', async () => {
    const ctx = createMockContext({
      input: { doc: { target_url: 'https://hooks.example.com/webhook' } },
    });
    await expect(SubscriptionValidation.handler(ctx)).resolves.not.toThrow();
  });

  it('should reject an invalid target_url', async () => {
    const ctx = createMockContext({
      input: { doc: { target_url: 'not-a-url' } },
    });
    await expect(SubscriptionValidation.handler(ctx)).rejects.toThrow('target_url must be a valid URL');
  });

  it('should accept valid JSON filters', async () => {
    const ctx = createMockContext({
      input: { doc: { filters: '{"type": "account"}' } },
    });
    await expect(SubscriptionValidation.handler(ctx)).resolves.not.toThrow();
  });

  it('should reject invalid JSON filters', async () => {
    const ctx = createMockContext({
      input: { doc: { filters: '{bad json}' } },
    });
    await expect(SubscriptionValidation.handler(ctx)).rejects.toThrow('invalid JSON');
  });

  it('should accept filters as an object', async () => {
    const ctx = createMockContext({
      input: { doc: { filters: { type: 'account' } } },
    });
    await expect(SubscriptionValidation.handler(ctx)).resolves.not.toThrow();
  });

  it('should reject max_retries below 0', async () => {
    const ctx = createMockContext({
      input: { doc: { max_retries: -1 } },
    });
    await expect(SubscriptionValidation.handler(ctx)).rejects.toThrow('max_retries must be between 0 and 10');
  });

  it('should reject max_retries above 10', async () => {
    const ctx = createMockContext({
      input: { doc: { max_retries: 11 } },
    });
    await expect(SubscriptionValidation.handler(ctx)).rejects.toThrow('max_retries must be between 0 and 10');
  });

  it('should accept max_retries of 0', async () => {
    const ctx = createMockContext({
      input: { doc: { max_retries: 0 } },
    });
    await expect(SubscriptionValidation.handler(ctx)).resolves.not.toThrow();
  });

  it('should accept max_retries of 10', async () => {
    const ctx = createMockContext({
      input: { doc: { max_retries: 10 } },
    });
    await expect(SubscriptionValidation.handler(ctx)).resolves.not.toThrow();
  });

  it('should pass when no validatable fields are set', async () => {
    const ctx = createMockContext({
      input: { doc: { name: 'My Webhook' } },
    });
    await expect(SubscriptionValidation.handler(ctx)).resolves.not.toThrow();
  });
});

// ─── SecretRotation ────────────────────────────────────────────────────────────

describe('SecretRotation Hook', () => {
  it('should have correct hook metadata', () => {
    expect(SecretRotation.name).toBe('SecretRotation');
    expect(SecretRotation.object).toBe('webhook_subscription');
    expect(SecretRotation.events).toContain('afterUpdate');
  });

  it('should log when secret is rotated', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      input: { doc: { secret: 'new-secret-value' } },
      result: { _id: 'ws1', name: 'Test Webhook' },
    });

    await SecretRotation.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('secret rotated'));
    consoleSpy.mockRestore();
  });

  it('should not log when secret is not changed', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      input: { doc: { name: 'Updated Name' } },
      result: { _id: 'ws1', name: 'Updated Name' },
    });

    await SecretRotation.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should skip when result has no _id', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      input: { doc: { secret: 'new-secret' } },
      result: { name: 'Test Webhook' },
    });

    await SecretRotation.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── EndpointVerification ──────────────────────────────────────────────────────

describe('EndpointVerification Hook', () => {
  it('should have correct hook metadata', () => {
    expect(EndpointVerification.name).toBe('EndpointVerification');
    expect(EndpointVerification.object).toBe('webhook_subscription');
    expect(EndpointVerification.events).toContain('afterInsert');
  });

  it('should verify endpoint when _id and target_url are present', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      result: { _id: 'ws1', target_url: 'https://hooks.example.com/webhook' },
    });

    await EndpointVerification.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Verifying webhook endpoint'));
    consoleSpy.mockRestore();
  });

  it('should skip when _id is missing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      result: { target_url: 'https://hooks.example.com/webhook' },
    });

    await EndpointVerification.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should skip when target_url is missing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext({
      result: { _id: 'ws1' },
    });

    await EndpointVerification.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
