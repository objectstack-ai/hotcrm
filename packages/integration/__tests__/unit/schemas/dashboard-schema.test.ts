import { describe, it, expect } from 'vitest';
import { assertTableWidgetsHaveColumns } from '../../../../core/__tests__/helpers/dashboard-test-utils';

describe('Integration Dashboard Schema Compliance', () => {
  describe('IntegrationDashboard', () => {
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/integration.dashboard');
      expect(mod.IntegrationDashboard).toBeDefined();
    });

    it('should have options.columns on table widgets', async () => {
      const mod = await import('../../../src/integration.dashboard');
      assertTableWidgetsHaveColumns(mod.IntegrationDashboard);
    });
  });
});
