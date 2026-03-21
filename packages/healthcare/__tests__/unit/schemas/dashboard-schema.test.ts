import { describe, it, expect } from 'vitest';
import { assertTableWidgetsHaveColumns } from '../../../../core/__tests__/helpers/dashboard-test-utils';

describe('Healthcare Dashboard Schema Compliance', () => {
  describe('HealthcareDashboard', () => {
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/healthcare.dashboard');
      expect(mod.HealthcareDashboard).toBeDefined();
    });

    it('should have options.columns on table widgets', async () => {
      const mod = await import('../../../src/healthcare.dashboard');
      assertTableWidgetsHaveColumns(mod.HealthcareDashboard);
    });
  });
});
