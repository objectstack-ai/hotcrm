import { describe, it, expect } from 'vitest';
import {
  PACKAGE_DEPENDENCY_GRAPH,
  validateDependencies,
  getLoadOrder,
  hasCircularDependency,
  getTotalSeedFileCount,
} from '../../../src/dependency_graph';

describe('Package Dependency Graph', () => {
  describe('PACKAGE_DEPENDENCY_GRAPH', () => {
    it('should contain all 14 packages (13 business + education)', () => {
      expect(PACKAGE_DEPENDENCY_GRAPH).toHaveLength(14);
    });

    it('should include all core clouds', () => {
      const names = PACKAGE_DEPENDENCY_GRAPH.map(p => p.name);
      expect(names).toContain('core');
      expect(names).toContain('crm');
      expect(names).toContain('finance');
      expect(names).toContain('products');
      expect(names).toContain('hr');
      expect(names).toContain('support');
      expect(names).toContain('marketing');
    });

    it('should include cross-functional packages', () => {
      const names = PACKAGE_DEPENDENCY_GRAPH.map(p => p.name);
      expect(names).toContain('analytics');
      expect(names).toContain('integration');
      expect(names).toContain('community');
    });

    it('should include all vertical solutions', () => {
      const names = PACKAGE_DEPENDENCY_GRAPH.map(p => p.name);
      expect(names).toContain('healthcare');
      expect(names).toContain('financial-services');
      expect(names).toContain('real-estate');
      expect(names).toContain('education');
    });

    it('each package should have unique loadOrder', () => {
      const orders = PACKAGE_DEPENDENCY_GRAPH.map(p => p.loadOrder);
      expect(new Set(orders).size).toBe(orders.length);
    });

    it('each package should have at least one seed file', () => {
      for (const pkg of PACKAGE_DEPENDENCY_GRAPH) {
        expect(pkg.seedFiles.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('core should have no dependencies', () => {
      const core = PACKAGE_DEPENDENCY_GRAPH.find(p => p.name === 'core');
      expect(core?.dependencies).toEqual([]);
    });

    it('financial-services should depend on core, crm, and finance', () => {
      const fs = PACKAGE_DEPENDENCY_GRAPH.find(p => p.name === 'financial-services');
      expect(fs?.dependencies).toContain('core');
      expect(fs?.dependencies).toContain('crm');
      expect(fs?.dependencies).toContain('finance');
    });
  });

  describe('validateDependencies', () => {
    it('should validate all dependencies point to existing packages', () => {
      const result = validateDependencies();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getLoadOrder', () => {
    it('should return a valid topological order', () => {
      const order = getLoadOrder();
      expect(order.length).toBe(PACKAGE_DEPENDENCY_GRAPH.length);
    });

    it('should load core before all other packages', () => {
      const order = getLoadOrder();
      expect(order[0]).toBe('core');
    });

    it('should load crm before finance', () => {
      const order = getLoadOrder();
      const crmIndex = order.indexOf('crm');
      const financeIndex = order.indexOf('finance');
      expect(crmIndex).toBeLessThan(financeIndex);
    });

    it('should load finance before financial-services', () => {
      const order = getLoadOrder();
      const finIndex = order.indexOf('finance');
      const fsIndex = order.indexOf('financial-services');
      expect(finIndex).toBeLessThan(fsIndex);
    });

    it('should load crm before support, marketing, healthcare, and real-estate', () => {
      const order = getLoadOrder();
      const crmIndex = order.indexOf('crm');
      for (const dep of ['support', 'marketing', 'healthcare', 'real-estate']) {
        expect(order.indexOf(dep)).toBeGreaterThan(crmIndex);
      }
    });
  });

  describe('hasCircularDependency', () => {
    it('should not detect circular dependencies', () => {
      expect(hasCircularDependency()).toBe(false);
    });
  });

  describe('getTotalSeedFileCount', () => {
    it('should return 39 total seed files', () => {
      expect(getTotalSeedFileCount()).toBe(39);
    });
  });
});
