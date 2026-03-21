import { describe, it, expect } from 'vitest';
import { PageSchema, ReportSchema, ChartConfigSchema, ActionSchema } from '@objectstack/spec/ui';
import InvoicePage from '../../../src/invoice.page';
import { RevenueReport } from '../../../src/revenue_report.report';
import { ArAgingReport } from '../../../src/ar_aging_report.report';
import { CashFlowChart } from '../../../src/cash_flow.chart';
import { CreateInvoiceAction, RecordPaymentAction, SendReminderAction } from '../../../src/finance_actions.action_ui';
import { assertTableWidgetsHaveColumns } from '../../../../core/__tests__/helpers/dashboard-test-utils';

describe('Finance UI Schema Compliance', () => {
  describe('FinanceDashboard', () => {
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/finance.dashboard');
      expect(mod.FinanceDashboard).toBeDefined();
    });

    it('should have options.columns on table widgets', async () => {
      const mod = await import('../../../src/finance.dashboard');
      assertTableWidgetsHaveColumns(mod.FinanceDashboard);
    });
  });

  describe('InvoicePage', () => {
    it('should be defined', () => {
      expect(InvoicePage).toBeDefined();
    });

    it('should validate against PageSchema', () => {
      expect(() => PageSchema.parse(InvoicePage)).not.toThrow();
    });
  });

  describe('Reports', () => {
    const reports = [
      { name: 'RevenueReport', report: RevenueReport },
      { name: 'ArAgingReport', report: ArAgingReport },
    ];

    describe.each(reports)('$name', ({ report }) => {
      it('should be defined', () => {
        expect(report).toBeDefined();
      });

      it('should validate against ReportSchema', () => {
        expect(() => ReportSchema.parse(report)).not.toThrow();
      });

      it('should have snake_case name', () => {
        expect(report.name).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });
  });

  describe('Charts', () => {
    it('should validate CashFlowChart against ChartConfigSchema', () => {
      expect(CashFlowChart).toBeDefined();
      expect(() => ChartConfigSchema.parse(CashFlowChart)).not.toThrow();
    });
  });

  describe('UI Actions', () => {
    const actions = [
      { name: 'CreateInvoiceAction', action: CreateInvoiceAction },
      { name: 'RecordPaymentAction', action: RecordPaymentAction },
      { name: 'SendReminderAction', action: SendReminderAction },
    ];

    describe.each(actions)('$name', ({ action }) => {
      it('should be defined', () => {
        expect(action).toBeDefined();
      });

      it('should validate against ActionSchema', () => {
        expect(() => ActionSchema.parse(action)).not.toThrow();
      });

      it('should have snake_case name', () => {
        expect(action.name).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });
  });
});
