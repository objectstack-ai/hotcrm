import { describe, it, expect } from 'vitest';
import { PageSchema, FormViewSchema, ReportSchema, ChartConfigSchema } from '@objectstack/spec/ui';
import { StudioPluginManifestSchema } from '@objectstack/spec/studio';
import { IntegrationHomePage } from '../../../src/integration_home.page';
import { ConnectorDetailPage } from '../../../src/connector_detail.page';
import { ConnectorSetupForm } from '../../../src/connector_setup.form';
import { FieldMappingForm } from '../../../src/field_mapping.form';
import { SyncSuccessRatesReport } from '../../../src/sync_success_rates.report';
import { ApiUsageReport } from '../../../src/api_usage.report';
import { SyncVolumeChart } from '../../../src/sync_volume.chart';
import { ErrorRatesChart } from '../../../src/error_rates.chart';
import { IntegrationAssistantAgent } from '../../../src/integration_assistant.agent';
import { ValidatedSyncLifecycleStateMachine } from '../../../src/sync_lifecycle.statemachine';
import { IntegrationStudioPlugin, IntegrationStudioManifest } from '../../../src/integration.studio';

describe('Integration Phase 13 Metadata Compliance', () => {
  describe('Pages', () => {
    it('IntegrationHomePage validates against PageSchema', () => {
      expect(IntegrationHomePage).toBeDefined();
      expect(() => PageSchema.parse(IntegrationHomePage)).not.toThrow();
    });
    it('ConnectorDetailPage validates against PageSchema', () => {
      expect(ConnectorDetailPage).toBeDefined();
      expect(() => PageSchema.parse(ConnectorDetailPage)).not.toThrow();
    });
  });

  describe('Forms', () => {
    it('ConnectorSetupForm validates against FormViewSchema', () => {
      expect(ConnectorSetupForm).toBeDefined();
      expect(() => FormViewSchema.parse(ConnectorSetupForm)).not.toThrow();
    });
    it('FieldMappingForm validates against FormViewSchema', () => {
      expect(FieldMappingForm).toBeDefined();
      expect(() => FormViewSchema.parse(FieldMappingForm)).not.toThrow();
    });
  });

  describe('Reports', () => {
    it('SyncSuccessRatesReport validates against ReportSchema', () => {
      expect(SyncSuccessRatesReport).toBeDefined();
      expect(() => ReportSchema.parse(SyncSuccessRatesReport)).not.toThrow();
    });
    it('ApiUsageReport validates against ReportSchema', () => {
      expect(ApiUsageReport).toBeDefined();
      expect(() => ReportSchema.parse(ApiUsageReport)).not.toThrow();
    });
  });

  describe('Charts', () => {
    it('SyncVolumeChart validates against ChartConfigSchema', () => {
      expect(SyncVolumeChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(SyncVolumeChart)).not.toThrow();
    });
    it('ErrorRatesChart validates against ChartConfigSchema', () => {
      expect(ErrorRatesChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(ErrorRatesChart)).not.toThrow();
    });
  });

  describe('Agent', () => {
    it('IntegrationAssistantAgent is defined with tools', () => {
      expect(IntegrationAssistantAgent).toBeDefined();
      expect(IntegrationAssistantAgent.name).toBe('integration_assistant');
      expect(IntegrationAssistantAgent.tools.length).toBeGreaterThan(0);
    });
  });

  describe('State Machine', () => {
    it('ValidatedSyncLifecycleStateMachine is defined', () => {
      expect(ValidatedSyncLifecycleStateMachine).toBeDefined();
      expect(ValidatedSyncLifecycleStateMachine.id).toBeTruthy();
    });
  });

  describe('Studio', () => {
    it('IntegrationStudioPlugin is defined', () => {
      expect(IntegrationStudioPlugin).toBeDefined();
      expect(IntegrationStudioPlugin.id).toBeTruthy();
    });
    it('IntegrationStudioManifest validates against StudioPluginManifestSchema', () => {
      expect(IntegrationStudioManifest).toBeDefined();
      expect(() => StudioPluginManifestSchema.parse(IntegrationStudioManifest)).not.toThrow();
    });
  });
});
