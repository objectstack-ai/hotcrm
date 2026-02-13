import { describe, it, expect } from 'vitest';
import { Connector } from '../../src/connector.object';
import { Connection } from '../../src/connection.object';
import { SyncConfig } from '../../src/sync_config.object';
import { SyncLog } from '../../src/sync_log.object';
import { WebhookSubscription } from '../../src/webhook_subscription.object';
import { WebhookDelivery } from '../../src/webhook_delivery.object';
import { ApiKey } from '../../src/api_key.object';
import { FieldMapping } from '../../src/field_mapping.object';

// ─── Connector → Connection → SyncConfig → SyncLog Flow ───────────────────────

describe('Sync Lifecycle Flow', () => {
  it('should have connector → connection lookup chain', () => {
    // Connection references Connector
    expect(Connection.fields.connector_id.type).toBe('lookup');
    expect(Connection.fields.connector_id.reference).toBe('connector');
    expect(Connection.fields.connector_id.reference).toBe(Connector.name);
  });

  it('should have connection → sync_config lookup chain', () => {
    // SyncConfig references Connection
    expect(SyncConfig.fields.connection_id.type).toBe('lookup');
    expect(SyncConfig.fields.connection_id.reference).toBe('connection');
    expect(SyncConfig.fields.connection_id.reference).toBe(Connection.name);
  });

  it('should have sync_config → sync_log lookup chain', () => {
    // SyncLog references SyncConfig
    expect(SyncLog.fields.sync_config_id.type).toBe('lookup');
    expect(SyncLog.fields.sync_config_id.reference).toBe('sync_config');
    expect(SyncLog.fields.sync_config_id.reference).toBe(SyncConfig.name);
  });

  it('should form a complete data pipeline: connector → connection → sync_config → sync_log', () => {
    const chain = [
      Connector.name,
      Connection.fields.connector_id.reference,
      Connection.name,
      SyncConfig.fields.connection_id.reference,
      SyncConfig.name,
      SyncLog.fields.sync_config_id.reference,
    ];
    // Each pair (reference_to, name) should match
    expect(chain[0]).toBe(chain[1]); // connector
    expect(chain[2]).toBe(chain[3]); // connection
    expect(chain[4]).toBe(chain[5]); // sync_config
  });

  it('should track sync execution via SyncLog fields', () => {
    expect(SyncLog.fields.started_at).toBeDefined();
    expect(SyncLog.fields.completed_at).toBeDefined();
    expect(SyncLog.fields.records_processed).toBeDefined();
    expect(SyncLog.fields.records_failed).toBeDefined();
    expect(SyncLog.fields.duration_ms).toBeDefined();
    expect(SyncLog.fields.status).toBeDefined();

    const statusValues = SyncLog.fields.status.options.map((o: any) => o.value);
    expect(statusValues).toContain('running');
    expect(statusValues).toContain('completed');
    expect(statusValues).toContain('failed');
  });

  it('should support sync direction and frequency configuration', () => {
    const directions = SyncConfig.fields.direction.options.map((o: any) => o.value);
    expect(directions).toEqual(['inbound', 'outbound', 'bidirectional']);

    const frequencies = SyncConfig.fields.frequency.options.map((o: any) => o.value);
    expect(frequencies).toContain('realtime');
    expect(frequencies).toContain('manual');
  });

  it('should support field mapping in sync config', () => {
    expect(SyncConfig.fields.field_mapping.type).toBe('textarea');
    expect(SyncConfig.fields.field_mapping.required).toBe(true);
  });
});

// ─── Webhook Subscription → Delivery Flow ──────────────────────────────────────

describe('Webhook Lifecycle Flow', () => {
  it('should have subscription → delivery lookup chain', () => {
    expect(WebhookDelivery.fields.subscription_id.type).toBe('lookup');
    expect(WebhookDelivery.fields.subscription_id.reference).toBe('webhook_subscription');
    expect(WebhookDelivery.fields.subscription_id.reference).toBe(WebhookSubscription.name);
  });

  it('should track delivery lifecycle via status', () => {
    const subscriptionStatuses = WebhookSubscription.fields.status.options.map((o: any) => o.value);
    expect(subscriptionStatuses).toContain('active');
    expect(subscriptionStatuses).toContain('inactive');
    expect(subscriptionStatuses).toContain('failed');

    const deliveryStatuses = WebhookDelivery.fields.status.options.map((o: any) => o.value);
    expect(deliveryStatuses).toContain('success');
    expect(deliveryStatuses).toContain('failed');
    expect(deliveryStatuses).toContain('pending');
    expect(deliveryStatuses).toContain('retrying');
  });

  it('should support retry configuration on subscriptions', () => {
    expect(WebhookSubscription.fields.retry_policy).toBeDefined();
    expect(WebhookSubscription.fields.max_retries).toBeDefined();
    expect(WebhookSubscription.fields.retry_policy.defaultValue).toBe('exponential');
    expect(WebhookSubscription.fields.max_retries.defaultValue).toBe(3);
  });

  it('should track delivery attempts and responses', () => {
    expect(WebhookDelivery.fields.attempt_number.type).toBe('number');
    expect(WebhookDelivery.fields.response_status.type).toBe('number');
    expect(WebhookDelivery.fields.response_body.type).toBe('textarea');
    expect(WebhookDelivery.fields.delivered_at.type).toBe('datetime');
  });

  it('should support event filtering on subscriptions', () => {
    expect(WebhookSubscription.fields.event_type).toBeDefined();
    expect(WebhookSubscription.fields.filters).toBeDefined();
    expect(WebhookSubscription.fields.event_type.required).toBe(true);
  });
});

// ─── API Key Lifecycle ─────────────────────────────────────────────────────────

describe('API Key Lifecycle', () => {
  it('should have required fields for key identification', () => {
    expect(ApiKey.fields.name.required).toBe(true);
    expect(ApiKey.fields.key_hash.required).toBe(true);
  });

  it('should start with active state by default', () => {
    expect(ApiKey.fields.is_active.defaultValue).toBe(true);
  });

  it('should track usage count starting at 0', () => {
    expect(ApiKey.fields.usage_count.defaultValue).toBe(0);
  });

  it('should have rate limiting support', () => {
    expect(ApiKey.fields.rate_limit.type).toBe('number');
    expect(ApiKey.fields.rate_limit.defaultValue).toBe(1000);
  });

  it('should track expiration and last usage', () => {
    expect(ApiKey.fields.expires_at.type).toBe('datetime');
    expect(ApiKey.fields.last_used.type).toBe('datetime');
  });

  it('should have scopes for access control', () => {
    expect(ApiKey.fields.scopes.type).toBe('textarea');
  });

  it('should track who created the key', () => {
    expect(ApiKey.fields.created_by.type).toBe('lookup');
    expect(ApiKey.fields.created_by.reference).toBe('users');
  });
});

// ─── FieldMapping as Reusable Template ─────────────────────────────────────────

describe('FieldMapping Template Support', () => {
  it('should support source and target object configuration', () => {
    expect(FieldMapping.fields.source_object.required).toBe(true);
    expect(FieldMapping.fields.target_object.required).toBe(true);
  });

  it('should have required mappings definition', () => {
    expect(FieldMapping.fields.mappings.required).toBe(true);
    expect(FieldMapping.fields.mappings.type).toBe('textarea');
  });

  it('should support transformation rules and defaults', () => {
    expect(FieldMapping.fields.transform_rules.type).toBe('textarea');
    expect(FieldMapping.fields.default_values.type).toBe('textarea');
  });

  it('should support template flag', () => {
    expect(FieldMapping.fields.is_template.type).toBe('boolean');
    expect(FieldMapping.fields.is_template.defaultValue).toBe(false);
  });

  it('should track ownership', () => {
    expect(FieldMapping.fields.owner_id.type).toBe('lookup');
    expect(FieldMapping.fields.owner_id.reference).toBe('users');
  });
});

// ─── Cross-Object Consistency ──────────────────────────────────────────────────

describe('Cross-Object Consistency', () => {
  it('should use consistent naming: all objects use snake_case names', () => {
    const objects = [Connector, Connection, SyncConfig, SyncLog, WebhookSubscription, WebhookDelivery, ApiKey, FieldMapping];
    for (const obj of objects) {
      expect(obj.name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('should have labels defined for all objects', () => {
    const objects = [Connector, Connection, SyncConfig, SyncLog, WebhookSubscription, WebhookDelivery, ApiKey, FieldMapping];
    for (const obj of objects) {
      expect(obj.label).toBeDefined();
      expect(obj.label.length).toBeGreaterThan(0);
    }
  });

  it('should have enable config on all objects', () => {
    const objects = [Connector, Connection, SyncConfig, SyncLog, WebhookSubscription, WebhookDelivery, ApiKey, FieldMapping];
    for (const obj of objects) {
      expect(obj.enable).toBeDefined();
      expect(typeof obj.enable.searchable).toBe('boolean');
    }
  });
});
