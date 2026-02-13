import { describe, it, expect } from 'vitest';
import { ReportSchema } from '@objectstack/spec/ui';
import { PipelineReport } from '../../../src/pipeline_report.report';
import { ForecastReport } from '../../../src/forecast_report.report';
import { RevenueReport } from '../../../../finance/src/revenue_report.report';
import { ArAgingReport } from '../../../../finance/src/ar_aging_report.report';
import { HeadcountReport } from '../../../../hr/src/headcount_report.report';
import { CampaignRoiReport } from '../../../../marketing/src/campaign_roi_report.report';
import { ProductMixReport } from '../../../../products/src/product_mix_report.report';
import { CaseVolumeReport } from '../../../../support/src/case_volume_report.report';

describe('Phase 10.5A Report Definitions Metadata Compliance', () => {
  const reports = [
    { name: 'PipelineReport', report: PipelineReport },
    { name: 'ForecastReport', report: ForecastReport },
    { name: 'RevenueReport', report: RevenueReport },
    { name: 'ArAgingReport', report: ArAgingReport },
    { name: 'HeadcountReport', report: HeadcountReport },
    { name: 'CampaignRoiReport', report: CampaignRoiReport },
    { name: 'ProductMixReport', report: ProductMixReport },
    { name: 'CaseVolumeReport', report: CaseVolumeReport },
  ];

  it('should have exactly 8 report definitions', () => {
    expect(reports.length).toBe(8);
  });

  describe.each(reports)('$name', ({ report }) => {
    it('should be defined', () => {
      expect(report).toBeDefined();
    });

    it('should validate against ReportSchema', () => {
      expect(() => ReportSchema.parse(report)).not.toThrow();
    });

    it('should have a snake_case name', () => {
      expect(report.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });

    it('should have a non-empty label', () => {
      expect(typeof report.label).toBe('string');
      expect(report.label.length).toBeGreaterThan(0);
    });

    it('should reference a valid objectName', () => {
      expect(typeof report.objectName).toBe('string');
      expect(report.objectName.length).toBeGreaterThan(0);
    });

    it('should have columns with field definitions', () => {
      expect(Array.isArray(report.columns)).toBe(true);
      expect(report.columns.length).toBeGreaterThan(0);
      for (const col of report.columns) {
        expect(typeof col.field).toBe('string');
      }
    });

    it('should have at least one groupingsDown entry', () => {
      expect(Array.isArray(report.groupingsDown)).toBe(true);
      expect(report.groupingsDown.length).toBeGreaterThan(0);
    });
  });

  it('report names are unique across clouds', () => {
    const names = reports.map((r) => r.report.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
