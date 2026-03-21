import { describe, it, expect } from 'vitest';

describe('Integration Dashboard Schema Compliance', () => {
  describe('IntegrationDashboard', () => {
    it('should pass module-level DashboardSchema validation', async () => {
      const mod = await import('../../../src/integration.dashboard');
      expect(mod.IntegrationDashboard).toBeDefined();
    });

    it('should have options.columns on table widgets', async () => {
      const mod = await import('../../../src/integration.dashboard');
      const tableWidgets = mod.IntegrationDashboard.widgets.filter((w: any) => w.type === 'table');
      expect(tableWidgets.length).toBeGreaterThan(0);
      for (const w of tableWidgets) {
        expect(w.options, `table widget "${w.id}" should have options`).toBeDefined();
        expect(w.options.columns, `table widget "${w.id}" should have options.columns`).toBeDefined();
        expect(Array.isArray(w.options.columns)).toBe(true);
        expect(w.options.columns.length).toBeGreaterThan(0);
      }
    });
  });
});
