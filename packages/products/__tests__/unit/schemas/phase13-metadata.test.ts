import { describe, it, expect } from 'vitest';
import { PageSchema, FormViewSchema, ReportSchema, ChartConfigSchema } from '@objectstack/spec/ui';
import { CPQHomePage } from '../../../src/cpq_home.page';
import { OrderDetailPage } from '../../../src/order_detail.page';
import { OrderForm } from '../../../src/order.form';
import { BundleConfigForm } from '../../../src/bundle_config.form';
import { QuoteConversionReport } from '../../../src/quote_conversion.report';
import { DiscountAnalysisReport } from '../../../src/discount_analysis.report';
import { PricingDistributionChart } from '../../../src/pricing_distribution.chart';
import { OrderTrendChart } from '../../../src/order_trend.chart';
import { CPQAssistantAgent } from '../../../src/cpq_assistant.agent';
import { ValidatedOrderLifecycleStateMachine } from '../../../src/order_lifecycle.statemachine';

describe('Products Phase 13 Metadata Compliance', () => {
  describe('Pages', () => {
    it('CPQHomePage validates against PageSchema', () => {
      expect(CPQHomePage).toBeDefined();
      expect(() => PageSchema.parse(CPQHomePage)).not.toThrow();
    });
    it('OrderDetailPage validates against PageSchema', () => {
      expect(OrderDetailPage).toBeDefined();
      expect(() => PageSchema.parse(OrderDetailPage)).not.toThrow();
    });
  });

  describe('Forms', () => {
    it('OrderForm validates against FormViewSchema', () => {
      expect(OrderForm).toBeDefined();
      expect(() => FormViewSchema.parse(OrderForm)).not.toThrow();
    });
    it('BundleConfigForm validates against FormViewSchema', () => {
      expect(BundleConfigForm).toBeDefined();
      expect(() => FormViewSchema.parse(BundleConfigForm)).not.toThrow();
    });
  });

  describe('Reports', () => {
    it('QuoteConversionReport validates against ReportSchema', () => {
      expect(QuoteConversionReport).toBeDefined();
      expect(() => ReportSchema.parse(QuoteConversionReport)).not.toThrow();
    });
    it('DiscountAnalysisReport validates against ReportSchema', () => {
      expect(DiscountAnalysisReport).toBeDefined();
      expect(() => ReportSchema.parse(DiscountAnalysisReport)).not.toThrow();
    });
  });

  describe('Charts', () => {
    it('PricingDistributionChart validates against ChartConfigSchema', () => {
      expect(PricingDistributionChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(PricingDistributionChart)).not.toThrow();
    });
    it('OrderTrendChart validates against ChartConfigSchema', () => {
      expect(OrderTrendChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(OrderTrendChart)).not.toThrow();
    });
  });

  describe('Agent', () => {
    it('CPQAssistantAgent is defined with tools', () => {
      expect(CPQAssistantAgent).toBeDefined();
      expect(CPQAssistantAgent.name).toBe('cpq_assistant');
      expect(CPQAssistantAgent.tools.length).toBeGreaterThan(0);
    });
  });

  describe('State Machine', () => {
    it('ValidatedOrderLifecycleStateMachine is defined', () => {
      expect(ValidatedOrderLifecycleStateMachine).toBeDefined();
      expect(ValidatedOrderLifecycleStateMachine.id).toBeTruthy();
    });
  });
});
