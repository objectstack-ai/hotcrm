import { describe, it, expect } from 'vitest';
import { PageSchema, ViewSchema, ReportSchema } from '@objectstack/spec/ui';
import ProductBundlePage from '../../../src/product_bundle.page';
import { ProductMixReport } from '../../../src/product_mix_report.report';
import { QuoteGanttView } from '../../../src/quote_gantt.view';
import { assertTableWidgetsHaveColumns } from '../../../../core/__tests__/helpers/dashboard-test-utils';

describe('Products UI Schema Compliance', () => {
  describe('CpqDashboard', () => {
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/cpq.dashboard');
      expect(mod.CpqDashboard).toBeDefined();
    });

    it('should have options.columns on table widgets', async () => {
      const mod = await import('../../../src/cpq.dashboard');
      assertTableWidgetsHaveColumns(mod.CpqDashboard);
    });
  });

  describe('ProductBundlePage', () => {
    it('should be defined', () => {
      expect(ProductBundlePage).toBeDefined();
    });

    it('should validate against PageSchema', () => {
      expect(() => PageSchema.parse(ProductBundlePage)).not.toThrow();
    });
  });

  describe('Reports', () => {
    it('should validate ProductMixReport against ReportSchema', () => {
      expect(ProductMixReport).toBeDefined();
      expect(() => ReportSchema.parse(ProductMixReport)).not.toThrow();
      expect(ProductMixReport.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });
  });

  describe('Advanced Views', () => {
    it('should validate QuoteGanttView against ViewSchema', () => {
      expect(QuoteGanttView).toBeDefined();
      expect(() => ViewSchema.parse(QuoteGanttView)).not.toThrow();
    });
  });
});
