import { describe, it, expect } from 'vitest';
import { assertTableWidgetsHaveColumns } from '../../../../core/__tests__/helpers/dashboard-test-utils';

describe('Analytics Dashboard Schema Compliance', () => {
  describe('AnalyticsDashboard', () => {
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/analytics.dashboard');
      expect(mod.AnalyticsDashboard).toBeDefined();
    });

    it('should have options.columns on table widgets', async () => {
      const mod = await import('../../../src/analytics.dashboard');
      assertTableWidgetsHaveColumns(mod.AnalyticsDashboard);
    });
  });
});
