import { describe, it, expect } from 'vitest';
import { PageSchema, FormViewSchema, ReportSchema, ChartConfigSchema } from '@objectstack/spec/ui';
import { StudioPluginManifestSchema } from '@objectstack/spec/studio';
import { AnalyticsHomePage } from '../../../src/analytics_home.page';
import { ReportBuilderPage } from '../../../src/report_builder.page';
import { ReportBuilderForm } from '../../../src/report_builder.form';
import { QueryPerformanceReport } from '../../../src/query_performance.report';
import { DataFreshnessReport } from '../../../src/data_freshness.report';
import { QueryLatencyChart } from '../../../src/query_latency.chart';
import { DataVolumeGrowthChart } from '../../../src/data_volume_growth.chart';
import { AnalyticsCoPilotAgent } from '../../../src/analytics_copilot.agent';
import { AnalyticsStudioPlugin, AnalyticsStudioManifest } from '../../../src/analytics.studio';

describe('Analytics Phase 13 Metadata Compliance', () => {
  describe('Pages', () => {
    it('AnalyticsHomePage validates against PageSchema', () => {
      expect(AnalyticsHomePage).toBeDefined();
      expect(() => PageSchema.parse(AnalyticsHomePage)).not.toThrow();
    });
    it('ReportBuilderPage validates against PageSchema', () => {
      expect(ReportBuilderPage).toBeDefined();
      expect(() => PageSchema.parse(ReportBuilderPage)).not.toThrow();
    });
  });

  describe('Forms', () => {
    it('ReportBuilderForm validates against FormViewSchema', () => {
      expect(ReportBuilderForm).toBeDefined();
      expect(() => FormViewSchema.parse(ReportBuilderForm)).not.toThrow();
    });
  });

  describe('Reports', () => {
    it('QueryPerformanceReport validates against ReportSchema', () => {
      expect(QueryPerformanceReport).toBeDefined();
      expect(() => ReportSchema.parse(QueryPerformanceReport)).not.toThrow();
    });
    it('DataFreshnessReport validates against ReportSchema', () => {
      expect(DataFreshnessReport).toBeDefined();
      expect(() => ReportSchema.parse(DataFreshnessReport)).not.toThrow();
    });
  });

  describe('Charts', () => {
    it('QueryLatencyChart validates against ChartConfigSchema', () => {
      expect(QueryLatencyChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(QueryLatencyChart)).not.toThrow();
    });
    it('DataVolumeGrowthChart validates against ChartConfigSchema', () => {
      expect(DataVolumeGrowthChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(DataVolumeGrowthChart)).not.toThrow();
    });
  });

  describe('Agent', () => {
    it('AnalyticsCoPilotAgent is defined with tools', () => {
      expect(AnalyticsCoPilotAgent).toBeDefined();
      expect(AnalyticsCoPilotAgent.name).toBe('analytics_copilot');
      expect(AnalyticsCoPilotAgent.tools.length).toBeGreaterThan(0);
    });
  });

  describe('Studio', () => {
    it('AnalyticsStudioPlugin is defined', () => {
      expect(AnalyticsStudioPlugin).toBeDefined();
      expect(AnalyticsStudioPlugin.id).toBeTruthy();
    });
    it('AnalyticsStudioManifest validates against StudioPluginManifestSchema', () => {
      expect(AnalyticsStudioManifest).toBeDefined();
      expect(() => StudioPluginManifestSchema.parse(AnalyticsStudioManifest)).not.toThrow();
    });
  });
});
