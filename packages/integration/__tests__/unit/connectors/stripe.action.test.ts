import { describe, it, expect } from 'vitest';
import {
  createPaymentIntent,
  processRefund,
  syncSubscription,
  handleStripeWebhook,
} from '../../../src/connectors/stripe.action';

// ─── createPaymentIntent ───────────────────────────────────────────────────────

describe('createPaymentIntent', () => {
  it('should create a payment intent with valid input', async () => {
    const result = await createPaymentIntent({ amount: 5000, currency: 'usd' });
    expect(result.payment_intent_id).toMatch(/^pi_/);
    expect(result.client_secret).toMatch(/^pi_secret_/);
    expect(result.status).toBe('requires_payment_method');
  });

  it('should accept optional customer_id and metadata', async () => {
    const result = await createPaymentIntent({
      amount: 1000,
      currency: 'eur',
      customer_id: 'cus_123',
      metadata: { order: '456' },
    });
    expect(result.payment_intent_id).toBeDefined();
  });

  it('should throw when amount is missing or zero', async () => {
    await expect(createPaymentIntent({ amount: 0, currency: 'usd' })).rejects.toThrow('amount must be a positive number');
  });

  it('should throw when amount is negative', async () => {
    await expect(createPaymentIntent({ amount: -100, currency: 'usd' })).rejects.toThrow('amount must be a positive number');
  });

  it('should throw when currency is missing', async () => {
    await expect(createPaymentIntent({ amount: 1000, currency: '' })).rejects.toThrow('currency is required');
  });
});

// ─── processRefund ─────────────────────────────────────────────────────────────

describe('processRefund', () => {
  it('should process a refund with valid payment_intent_id', async () => {
    const result = await processRefund({ payment_intent_id: 'pi_abc123' });
    expect(result.refund_id).toMatch(/^re_/);
    expect(result.status).toBe('succeeded');
  });

  it('should accept optional amount and reason', async () => {
    const result = await processRefund({
      payment_intent_id: 'pi_abc123',
      amount: 500,
      reason: 'duplicate',
    });
    expect(result.amount).toBe(500);
  });

  it('should throw when payment_intent_id is missing', async () => {
    await expect(processRefund({ payment_intent_id: '' })).rejects.toThrow('payment_intent_id is required');
  });
});

// ─── syncSubscription ──────────────────────────────────────────────────────────

describe('syncSubscription', () => {
  it('should sync a subscription with valid input', async () => {
    const result = await syncSubscription({
      subscription_id: 'sub_123',
      connection_id: 'conn_456',
    });
    expect(result.synced).toBe(true);
    expect(result.subscription_status).toBe('active');
    expect(result.records_updated).toBe(1);
  });

  it('should throw when subscription_id is missing', async () => {
    await expect(
      syncSubscription({ subscription_id: '', connection_id: 'conn_456' })
    ).rejects.toThrow('subscription_id and connection_id are required');
  });

  it('should throw when connection_id is missing', async () => {
    await expect(
      syncSubscription({ subscription_id: 'sub_123', connection_id: '' })
    ).rejects.toThrow('subscription_id and connection_id are required');
  });
});

// ─── handleStripeWebhook ───────────────────────────────────────────────────────

describe('handleStripeWebhook', () => {
  it('should process payment_intent.succeeded event', async () => {
    const result = await handleStripeWebhook({
      event_type: 'payment_intent.succeeded',
      payload: { id: 'pi_123' },
      signature: 'sig_abc',
    });
    expect(result.processed).toBe(true);
    expect(result.event_type).toBe('payment_intent.succeeded');
    expect(result.actions_taken).toContain('payment_recorded');
  });

  it('should process customer.subscription.updated event', async () => {
    const result = await handleStripeWebhook({
      event_type: 'customer.subscription.updated',
      payload: { id: 'sub_123' },
      signature: 'sig_abc',
    });
    expect(result.actions_taken).toContain('subscription_synced');
  });

  it('should process invoice.payment_failed event', async () => {
    const result = await handleStripeWebhook({
      event_type: 'invoice.payment_failed',
      payload: { id: 'inv_123' },
      signature: 'sig_abc',
    });
    expect(result.actions_taken).toContain('payment_failure_logged');
  });

  it('should return empty actions for unknown event types', async () => {
    const result = await handleStripeWebhook({
      event_type: 'unknown.event',
      payload: { id: 'xxx' },
      signature: 'sig_abc',
    });
    expect(result.processed).toBe(true);
    expect(result.actions_taken).toHaveLength(0);
  });

  it('should throw when event_type is missing', async () => {
    await expect(
      handleStripeWebhook({ event_type: '', payload: { id: '1' }, signature: 'sig' })
    ).rejects.toThrow('event_type and payload are required');
  });

  it('should throw when payload is missing', async () => {
    await expect(
      handleStripeWebhook({ event_type: 'test', payload: null as any, signature: 'sig' })
    ).rejects.toThrow('event_type and payload are required');
  });
});
