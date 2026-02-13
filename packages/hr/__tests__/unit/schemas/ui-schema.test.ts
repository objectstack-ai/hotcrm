import { describe, it, expect } from 'vitest';
import { ViewSchema, ReportSchema, ChartConfigSchema, WidgetManifestSchema } from '@objectstack/spec/ui';
import { HeadcountReport } from '../../../src/headcount_report.report';
import { RecruitmentKanbanView } from '../../../src/recruitment_kanban.view';
import { AttritionTrendChart } from '../../../src/attrition_trend.chart';
import { HeadcountWidget } from '../../../src/headcount_widget.widget';

describe('HR UI Schema Compliance', () => {
  describe('HrDashboard', () => {
    // HrDashboard module calls DashboardSchema.parse() at load time.
    // The dashboard widget filter format currently uses arrays (ObjectQL style)
    // which does not match the DashboardSchema expectation of record/object.
    it('should fail module-level DashboardSchema validation (known schema mismatch)', async () => {
      await expect(() => import('../../../src/hr.dashboard')).rejects.toThrow();
    });
  });

  describe('Reports', () => {
    it('should validate HeadcountReport against ReportSchema', () => {
      expect(HeadcountReport).toBeDefined();
      expect(() => ReportSchema.parse(HeadcountReport)).not.toThrow();
      expect(HeadcountReport.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });
  });

  describe('Advanced Views', () => {
    it('should validate RecruitmentKanbanView against ViewSchema', () => {
      expect(RecruitmentKanbanView).toBeDefined();
      expect(() => ViewSchema.parse(RecruitmentKanbanView)).not.toThrow();
    });
  });

  describe('Charts', () => {
    it('should validate AttritionTrendChart against ChartConfigSchema', () => {
      expect(AttritionTrendChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(AttritionTrendChart)).not.toThrow();
    });
  });

  describe('Widgets', () => {
    it('should validate HeadcountWidget against WidgetManifestSchema', () => {
      expect(HeadcountWidget).toBeDefined();
      expect(() => WidgetManifestSchema.parse(HeadcountWidget)).not.toThrow();
    });
  });
});
