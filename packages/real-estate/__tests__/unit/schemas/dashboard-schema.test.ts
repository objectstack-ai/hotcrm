import { describe, it, expect } from 'vitest';
import { assertTableWidgetsHaveColumns } from '../../../../core/__tests__/helpers/dashboard-test-utils';

describe('Real-Estate Dashboard Schema Compliance', () => {
  describe('BrokerageDashboard', () => {
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/brokerage.dashboard');
      expect(mod.BrokerageDashboard).toBeDefined();
    });

    it('should have options.columns on table widgets', async () => {
      const mod = await import('../../../src/brokerage.dashboard');
      assertTableWidgetsHaveColumns(mod.BrokerageDashboard);
    });
  });
});
