import { describe, it, expect } from 'vitest';
import { PageSchema, ViewSchema, ReportSchema, ChartConfigSchema } from '@objectstack/spec/ui';
import CampaignPage from '../../../src/campaign.page';
import { CampaignRoiReport } from '../../../src/campaign_roi_report.report';
import { CampaignTimelineView } from '../../../src/campaign_timeline.view';
import { ChannelPerformanceChart } from '../../../src/channel_performance.chart';

describe('Marketing UI Schema Compliance', () => {
  describe('MarketingDashboard', () => {
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/marketing.dashboard');
      expect(mod.MarketingDashboard).toBeDefined();
    });
  });

  describe('CampaignPage', () => {
    it('should be defined', () => {
      expect(CampaignPage).toBeDefined();
    });

    it('should validate against PageSchema', () => {
      expect(() => PageSchema.parse(CampaignPage)).not.toThrow();
    });
  });

  describe('Reports', () => {
    it('should validate CampaignRoiReport against ReportSchema', () => {
      expect(CampaignRoiReport).toBeDefined();
      expect(() => ReportSchema.parse(CampaignRoiReport)).not.toThrow();
      expect(CampaignRoiReport.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });
  });

  describe('Advanced Views', () => {
    it('should validate CampaignTimelineView against ViewSchema', () => {
      expect(CampaignTimelineView).toBeDefined();
      expect(() => ViewSchema.parse(CampaignTimelineView)).not.toThrow();
    });
  });

  describe('Charts', () => {
    it('should validate ChannelPerformanceChart against ChartConfigSchema', () => {
      expect(ChannelPerformanceChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(ChannelPerformanceChart)).not.toThrow();
    });
  });
});
