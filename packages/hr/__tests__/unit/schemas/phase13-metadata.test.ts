import { describe, it, expect } from 'vitest';
import { PageSchema, FormViewSchema, ReportSchema, ChartConfigSchema } from '@objectstack/spec/ui';
import { OrgChartPage } from '../../../src/org_chart.page';
import { PTORequestForm } from '../../../src/pto_request.form';
import { TurnoverAnalysisReport } from '../../../src/turnover_analysis.report';
import { CompBenchmarkReport } from '../../../src/comp_benchmark.report';
import { HeadcountTrendChart } from '../../../src/headcount_trend.chart';
import { AttritionByDeptChart } from '../../../src/attrition_by_dept.chart';
import { HRCoPilotAgent } from '../../../src/hr_copilot.agent';
import { ValidatedEmployeeLifecycleStateMachine } from '../../../src/employee_lifecycle.statemachine';

describe('HR Phase 13 Metadata Compliance', () => {
  describe('Pages', () => {
    it('OrgChartPage validates against PageSchema', () => {
      expect(OrgChartPage).toBeDefined();
      expect(() => PageSchema.parse(OrgChartPage)).not.toThrow();
    });
  });

  describe('Forms', () => {
    it('PTORequestForm validates against FormViewSchema', () => {
      expect(PTORequestForm).toBeDefined();
      expect(() => FormViewSchema.parse(PTORequestForm)).not.toThrow();
    });
  });

  describe('Reports', () => {
    it('TurnoverAnalysisReport validates against ReportSchema', () => {
      expect(TurnoverAnalysisReport).toBeDefined();
      expect(() => ReportSchema.parse(TurnoverAnalysisReport)).not.toThrow();
    });
    it('CompBenchmarkReport validates against ReportSchema', () => {
      expect(CompBenchmarkReport).toBeDefined();
      expect(() => ReportSchema.parse(CompBenchmarkReport)).not.toThrow();
    });
  });

  describe('Charts', () => {
    it('HeadcountTrendChart validates against ChartConfigSchema', () => {
      expect(HeadcountTrendChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(HeadcountTrendChart)).not.toThrow();
    });
    it('AttritionByDeptChart validates against ChartConfigSchema', () => {
      expect(AttritionByDeptChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(AttritionByDeptChart)).not.toThrow();
    });
  });

  describe('Agent', () => {
    it('HRCoPilotAgent is defined with tools', () => {
      expect(HRCoPilotAgent).toBeDefined();
      expect(HRCoPilotAgent.name).toBe('hr_copilot');
      expect(HRCoPilotAgent.tools.length).toBeGreaterThan(0);
    });
  });

  describe('State Machine', () => {
    it('ValidatedEmployeeLifecycleStateMachine is defined', () => {
      expect(ValidatedEmployeeLifecycleStateMachine).toBeDefined();
      expect(ValidatedEmployeeLifecycleStateMachine.id).toBeTruthy();
    });
  });
});
