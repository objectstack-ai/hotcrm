import { describe, it, expect } from 'vitest';
import { PageSchema, FormViewSchema, ReportSchema, ChartConfigSchema } from '@objectstack/spec/ui';
import { KbArticlePage } from '../../../src/kb_article.page';
import { EscalationForm } from '../../../src/escalation.form';
import { FirstResponseTimeReport } from '../../../src/first_response_time.report';
import { AgentPerformanceReport } from '../../../src/agent_performance.report';
import { ResolutionTimeHistogramChart } from '../../../src/resolution_time_histogram.chart';
import { SlaGaugeChart } from '../../../src/sla_gauge.chart';
import { SupportCoPilotAgent } from '../../../src/support_copilot.agent';

describe('Support Phase 13 Metadata Compliance', () => {
  describe('Pages', () => {
    it('KbArticlePage validates against PageSchema', () => {
      expect(KbArticlePage).toBeDefined();
      expect(() => PageSchema.parse(KbArticlePage)).not.toThrow();
    });
  });

  describe('Forms', () => {
    it('EscalationForm validates against FormViewSchema', () => {
      expect(EscalationForm).toBeDefined();
      expect(() => FormViewSchema.parse(EscalationForm)).not.toThrow();
    });
  });

  describe('Reports', () => {
    it('FirstResponseTimeReport validates against ReportSchema', () => {
      expect(FirstResponseTimeReport).toBeDefined();
      expect(() => ReportSchema.parse(FirstResponseTimeReport)).not.toThrow();
    });
    it('AgentPerformanceReport validates against ReportSchema', () => {
      expect(AgentPerformanceReport).toBeDefined();
      expect(() => ReportSchema.parse(AgentPerformanceReport)).not.toThrow();
    });
  });

  describe('Charts', () => {
    it('ResolutionTimeHistogramChart validates against ChartConfigSchema', () => {
      expect(ResolutionTimeHistogramChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(ResolutionTimeHistogramChart)).not.toThrow();
    });
    it('SlaGaugeChart validates against ChartConfigSchema', () => {
      expect(SlaGaugeChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(SlaGaugeChart)).not.toThrow();
    });
  });

  describe('Agent', () => {
    it('SupportCoPilotAgent is defined with tools', () => {
      expect(SupportCoPilotAgent).toBeDefined();
      expect(SupportCoPilotAgent.name).toBe('support_copilot');
      expect(SupportCoPilotAgent.tools.length).toBeGreaterThan(0);
    });
  });
});
