import { describe, it, expect } from 'vitest';
import { Connector } from '../../../src/connector.object';
import { Connection } from '../../../src/connection.object';
import { SyncConfig } from '../../../src/sync_config.object';
import { SyncLog } from '../../../src/sync_log.object';
import { WebhookSubscription } from '../../../src/webhook_subscription.object';
import { WebhookDelivery } from '../../../src/webhook_delivery.object';
import { ApiKey } from '../../../src/api_key.object';
import { FieldMapping } from '../../../src/field_mapping.object';

// ─── Connector ─────────────────────────────────────────────────────────────────

describe('Connector Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(Connector.name).toBe('connector');
    expect(Connector.label).toBe('Connector');
  });

  it('should have required fields defined', () => {
    expect(Connector.fields).toBeDefined();
    expect(Connector.fields.name).toBeDefined();
    expect(Connector.fields.provider).toBeDefined();
    expect(Connector.fields.connector_type).toBeDefined();
  });

  it('should mark name and provider as required', () => {
    expect(Connector.fields.name.required).toBe(true);
    expect(Connector.fields.provider.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Connector.fields.name.type).toBe('text');
    expect(Connector.fields.description.type).toBe('textarea');
    expect(Connector.fields.provider.type).toBe('text');
    expect(Connector.fields.base_url.type).toBe('url');
    expect(Connector.fields.version.type).toBe('text');
    expect(Connector.fields.icon.type).toBe('text');
  });

  it('should have connector_type select with 5 options', () => {
    expect(Connector.fields.connector_type.type).toBe('select');
    expect(Connector.fields.connector_type.options).toHaveLength(5);
    const values = Connector.fields.connector_type.options.map((o: any) => o.value);
    expect(values).toContain('rest_api');
    expect(values).toContain('graphql');
    expect(values).toContain('soap');
    expect(values).toContain('database');
    expect(values).toContain('file');
  });

  it('should have auth_type select with 5 options', () => {
    expect(Connector.fields.auth_type.type).toBe('select');
    expect(Connector.fields.auth_type.options).toHaveLength(5);
    const values = Connector.fields.auth_type.options.map((o: any) => o.value);
    expect(values).toContain('oauth2');
    expect(values).toContain('api_key');
    expect(values).toContain('basic');
    expect(values).toContain('token');
    expect(values).toContain('none');
  });

  it('should have status select defaulting to inactive', () => {
    expect(Connector.fields.status.type).toBe('select');
    expect(Connector.fields.status.defaultValue).toBe('inactive');
    const values = Connector.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('active');
    expect(values).toContain('inactive');
    expect(values).toContain('error');
  });

  it('should have category select with 5 options', () => {
    expect(Connector.fields.category.type).toBe('select');
    expect(Connector.fields.category.options).toHaveLength(5);
    const values = Connector.fields.category.options.map((o: any) => o.value);
    expect(values).toContain('communication');
    expect(values).toContain('payment');
    expect(values).toContain('storage');
    expect(values).toContain('crm');
    expect(values).toContain('marketing');
  });

  it('should enforce maxLength on text fields', () => {
    expect(Connector.fields.name.maxLength).toBe(255);
    expect(Connector.fields.provider.maxLength).toBe(255);
    expect(Connector.fields.version.maxLength).toBe(20);
    expect(Connector.fields.icon.maxLength).toBe(100);
  });
});

// ─── Connection ────────────────────────────────────────────────────────────────

describe('Connection Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(Connection.name).toBe('connection');
    expect(Connection.label).toBe('Connection');
  });

  it('should have required fields', () => {
    expect(Connection.fields.name.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Connection.fields.name.type).toBe('text');
    expect(Connection.fields.tenant_id.type).toBe('text');
    expect(Connection.fields.auth_token_ref.type).toBe('text');
    expect(Connection.fields.refresh_token_ref.type).toBe('text');
    expect(Connection.fields.expires_at.type).toBe('datetime');
    expect(Connection.fields.last_used.type).toBe('datetime');
    expect(Connection.fields.metadata.type).toBe('textarea');
  });

  it('should have connector_id lookup referencing connector', () => {
    expect(Connection.fields.connector_id.type).toBe('lookup');
    expect(Connection.fields.connector_id.reference).toBe('connector');
    expect(Connection.fields.connector_id.required).toBe(true);
  });

  it('should have owner_id lookup referencing users', () => {
    expect(Connection.fields.owner_id.type).toBe('lookup');
    expect(Connection.fields.owner_id.reference).toBe('users');
  });

  it('should have status select defaulting to disconnected', () => {
    expect(Connection.fields.status.type).toBe('select');
    expect(Connection.fields.status.defaultValue).toBe('disconnected');
    const values = Connection.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('connected');
    expect(values).toContain('disconnected');
    expect(values).toContain('expired');
    expect(values).toContain('error');
  });

  it('should enforce maxLength on text fields', () => {
    expect(Connection.fields.name.maxLength).toBe(255);
    expect(Connection.fields.tenant_id.maxLength).toBe(255);
    expect(Connection.fields.auth_token_ref.maxLength).toBe(500);
    expect(Connection.fields.refresh_token_ref.maxLength).toBe(500);
  });
});

// ─── SyncConfig ────────────────────────────────────────────────────────────────

describe('SyncConfig Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(SyncConfig.name).toBe('sync_config');
    expect(SyncConfig.label).toBe('Sync Configuration');
  });

  it('should have required fields', () => {
    expect(SyncConfig.fields.name.required).toBe(true);
    expect(SyncConfig.fields.source_object.required).toBe(true);
    expect(SyncConfig.fields.target_object.required).toBe(true);
    expect(SyncConfig.fields.field_mapping.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(SyncConfig.fields.name.type).toBe('text');
    expect(SyncConfig.fields.source_object.type).toBe('text');
    expect(SyncConfig.fields.target_object.type).toBe('text');
    expect(SyncConfig.fields.field_mapping.type).toBe('textarea');
    expect(SyncConfig.fields.is_active.type).toBe('boolean');
    expect(SyncConfig.fields.last_sync.type).toBe('datetime');
  });

  it('should have connection_id lookup referencing connection', () => {
    expect(SyncConfig.fields.connection_id.type).toBe('lookup');
    expect(SyncConfig.fields.connection_id.reference).toBe('connection');
    expect(SyncConfig.fields.connection_id.required).toBe(true);
  });

  it('should have direction select with 3 options', () => {
    expect(SyncConfig.fields.direction.type).toBe('select');
    expect(SyncConfig.fields.direction.options).toHaveLength(3);
    const values = SyncConfig.fields.direction.options.map((o: any) => o.value);
    expect(values).toContain('inbound');
    expect(values).toContain('outbound');
    expect(values).toContain('bidirectional');
  });

  it('should have frequency select with 5 options', () => {
    expect(SyncConfig.fields.frequency.type).toBe('select');
    expect(SyncConfig.fields.frequency.options).toHaveLength(5);
    const values = SyncConfig.fields.frequency.options.map((o: any) => o.value);
    expect(values).toContain('realtime');
    expect(values).toContain('hourly');
    expect(values).toContain('daily');
    expect(values).toContain('weekly');
    expect(values).toContain('manual');
  });

  it('should have conflict_resolution select with 4 options', () => {
    expect(SyncConfig.fields.conflict_resolution.type).toBe('select');
    expect(SyncConfig.fields.conflict_resolution.options).toHaveLength(4);
    const values = SyncConfig.fields.conflict_resolution.options.map((o: any) => o.value);
    expect(values).toContain('source_wins');
    expect(values).toContain('target_wins');
    expect(values).toContain('newest_wins');
    expect(values).toContain('manual');
  });

  it('should have is_active defaulting to false', () => {
    expect(SyncConfig.fields.is_active.defaultValue).toBe(false);
  });

  it('should have owner_id lookup referencing users', () => {
    expect(SyncConfig.fields.owner_id.type).toBe('lookup');
    expect(SyncConfig.fields.owner_id.reference).toBe('users');
  });
});

// ─── SyncLog ───────────────────────────────────────────────────────────────────

describe('SyncLog Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(SyncLog.name).toBe('sync_log');
    expect(SyncLog.label).toBe('Sync Log');
  });

  it('should have required fields', () => {
    expect(SyncLog.fields.started_at.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(SyncLog.fields.name.type).toBe('text');
    expect(SyncLog.fields.started_at.type).toBe('datetime');
    expect(SyncLog.fields.completed_at.type).toBe('datetime');
    expect(SyncLog.fields.records_processed.type).toBe('number');
    expect(SyncLog.fields.records_failed.type).toBe('number');
    expect(SyncLog.fields.error_details.type).toBe('textarea');
    expect(SyncLog.fields.duration_ms.type).toBe('number');
  });

  it('should have sync_config_id lookup referencing sync_config', () => {
    expect(SyncLog.fields.sync_config_id.type).toBe('lookup');
    expect(SyncLog.fields.sync_config_id.reference).toBe('sync_config');
    expect(SyncLog.fields.sync_config_id.required).toBe(true);
  });

  it('should have status select with 4 options', () => {
    expect(SyncLog.fields.status.type).toBe('select');
    expect(SyncLog.fields.status.options).toHaveLength(4);
    const values = SyncLog.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('running');
    expect(values).toContain('completed');
    expect(values).toContain('failed');
    expect(values).toContain('cancelled');
  });
});

// ─── WebhookSubscription ───────────────────────────────────────────────────────

describe('WebhookSubscription Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(WebhookSubscription.name).toBe('webhook_subscription');
    expect(WebhookSubscription.label).toBe('Webhook Subscription');
  });

  it('should have required fields', () => {
    expect(WebhookSubscription.fields.name.required).toBe(true);
    expect(WebhookSubscription.fields.event_type.required).toBe(true);
    expect(WebhookSubscription.fields.target_url.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(WebhookSubscription.fields.name.type).toBe('text');
    expect(WebhookSubscription.fields.event_type.type).toBe('text');
    expect(WebhookSubscription.fields.target_url.type).toBe('url');
    expect(WebhookSubscription.fields.secret.type).toBe('text');
    expect(WebhookSubscription.fields.max_retries.type).toBe('number');
    expect(WebhookSubscription.fields.filters.type).toBe('textarea');
    expect(WebhookSubscription.fields.last_triggered.type).toBe('datetime');
  });

  it('should have status select defaulting to active', () => {
    expect(WebhookSubscription.fields.status.type).toBe('select');
    expect(WebhookSubscription.fields.status.defaultValue).toBe('active');
    const values = WebhookSubscription.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('active');
    expect(values).toContain('inactive');
    expect(values).toContain('failed');
  });

  it('should have retry_policy select defaulting to exponential', () => {
    expect(WebhookSubscription.fields.retry_policy.type).toBe('select');
    expect(WebhookSubscription.fields.retry_policy.defaultValue).toBe('exponential');
    const values = WebhookSubscription.fields.retry_policy.options.map((o: any) => o.value);
    expect(values).toContain('none');
    expect(values).toContain('linear');
    expect(values).toContain('exponential');
  });

  it('should have max_retries defaulting to 3', () => {
    expect(WebhookSubscription.fields.max_retries.defaultValue).toBe(3);
  });

  it('should have owner_id lookup referencing users', () => {
    expect(WebhookSubscription.fields.owner_id.type).toBe('lookup');
    expect(WebhookSubscription.fields.owner_id.reference).toBe('users');
  });
});

// ─── WebhookDelivery ───────────────────────────────────────────────────────────

describe('WebhookDelivery Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(WebhookDelivery.name).toBe('webhook_delivery');
    expect(WebhookDelivery.label).toBe('Webhook Delivery');
  });

  it('should have correct field types', () => {
    expect(WebhookDelivery.fields.event_payload.type).toBe('textarea');
    expect(WebhookDelivery.fields.response_status.type).toBe('number');
    expect(WebhookDelivery.fields.response_body.type).toBe('textarea');
    expect(WebhookDelivery.fields.attempt_number.type).toBe('number');
    expect(WebhookDelivery.fields.delivered_at.type).toBe('datetime');
  });

  it('should have subscription_id lookup referencing webhook_subscription', () => {
    expect(WebhookDelivery.fields.subscription_id.type).toBe('lookup');
    expect(WebhookDelivery.fields.subscription_id.reference).toBe('webhook_subscription');
    expect(WebhookDelivery.fields.subscription_id.required).toBe(true);
  });

  it('should have status select with 4 options', () => {
    expect(WebhookDelivery.fields.status.type).toBe('select');
    expect(WebhookDelivery.fields.status.options).toHaveLength(4);
    const values = WebhookDelivery.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('success');
    expect(values).toContain('failed');
    expect(values).toContain('pending');
    expect(values).toContain('retrying');
  });
});

// ─── ApiKey ────────────────────────────────────────────────────────────────────

describe('ApiKey Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(ApiKey.name).toBe('api_key');
    expect(ApiKey.label).toBe('API Key');
  });

  it('should have required fields', () => {
    expect(ApiKey.fields.name.required).toBe(true);
    expect(ApiKey.fields.key_hash.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(ApiKey.fields.name.type).toBe('text');
    expect(ApiKey.fields.key_hash.type).toBe('text');
    expect(ApiKey.fields.scopes.type).toBe('textarea');
    expect(ApiKey.fields.rate_limit.type).toBe('number');
    expect(ApiKey.fields.expires_at.type).toBe('datetime');
    expect(ApiKey.fields.last_used.type).toBe('datetime');
    expect(ApiKey.fields.is_active.type).toBe('boolean');
    expect(ApiKey.fields.usage_count.type).toBe('number');
  });

  it('should have created_by lookup referencing users', () => {
    expect(ApiKey.fields.created_by.type).toBe('lookup');
    expect(ApiKey.fields.created_by.reference).toBe('users');
  });

  it('should have correct default values', () => {
    expect(ApiKey.fields.rate_limit.defaultValue).toBe(1000);
    expect(ApiKey.fields.is_active.defaultValue).toBe(true);
    expect(ApiKey.fields.usage_count.defaultValue).toBe(0);
  });

  it('should enforce maxLength on text fields', () => {
    expect(ApiKey.fields.name.maxLength).toBe(255);
    expect(ApiKey.fields.key_hash.maxLength).toBe(500);
  });
});

// ─── FieldMapping ──────────────────────────────────────────────────────────────

describe('FieldMapping Object Spec Compliance', () => {
  it('should have correct object name and label', () => {
    expect(FieldMapping.name).toBe('field_mapping');
    expect(FieldMapping.label).toBe('Field Mapping');
  });

  it('should have required fields', () => {
    expect(FieldMapping.fields.name.required).toBe(true);
    expect(FieldMapping.fields.source_object.required).toBe(true);
    expect(FieldMapping.fields.target_object.required).toBe(true);
    expect(FieldMapping.fields.mappings.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(FieldMapping.fields.name.type).toBe('text');
    expect(FieldMapping.fields.source_object.type).toBe('text');
    expect(FieldMapping.fields.target_object.type).toBe('text');
    expect(FieldMapping.fields.mappings.type).toBe('textarea');
    expect(FieldMapping.fields.transform_rules.type).toBe('textarea');
    expect(FieldMapping.fields.default_values.type).toBe('textarea');
    expect(FieldMapping.fields.is_template.type).toBe('boolean');
  });

  it('should have owner_id lookup referencing users', () => {
    expect(FieldMapping.fields.owner_id.type).toBe('lookup');
    expect(FieldMapping.fields.owner_id.reference).toBe('users');
  });

  it('should have is_template defaulting to false', () => {
    expect(FieldMapping.fields.is_template.defaultValue).toBe(false);
  });

  it('should enforce maxLength on text fields', () => {
    expect(FieldMapping.fields.name.maxLength).toBe(255);
    expect(FieldMapping.fields.source_object.maxLength).toBe(255);
    expect(FieldMapping.fields.target_object.maxLength).toBe(255);
  });
});
