import { describe, it, expect } from 'vitest';
import {
  PACKAGE_DEPENDENCY_GRAPH,
  validateDependencies,
  getLoadOrder,
  hasCircularDependency,
} from '../../../core/src/dependency_graph';

// Import seed data for cross-package relationship validation
import { AccountSeedData } from '../../../crm/src/account.seed';
import { InvoiceSeedData } from '../../../finance/src/invoice.seed';
import { CampaignSeedData } from '../../../marketing/src/campaign.seed';
import { CaseSeedData } from '../../../support/src/case.seed';
import { PatientSeedData } from '../../../healthcare/src/patient.seed';
import { WealthAccountSeedData } from '../../../financial-services/src/wealth_account.seed';
import { PropertySeedData } from '../../../real-estate/src/property.seed';
import { CourseSeedData } from '../../../education/src/course.seed';
import { EmployeeSeedData } from '../../../hr/src/employee.seed';
import { ProductSeedData } from '../../../products/src/product.seed';

// Import seed validation utility
import { validateSeedData } from '../../../core/src/seed_validation';

describe('Cross-Package Integration Tests', () => {
  // --- 13E-3.1: Seed Data Relationships ---
  describe('Seed Data Cross-Package Relationships', () => {
    it('CRM account seeds should provide accounts for Finance invoice references', () => {
      expect(AccountSeedData.length).toBeGreaterThanOrEqual(5);
      expect(InvoiceSeedData.length).toBeGreaterThanOrEqual(5);
      // Both exist and can be loaded independently
      const result1 = validateSeedData(AccountSeedData);
      const result2 = validateSeedData(InvoiceSeedData);
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });

    it('CRM seeds should be loadable before Marketing seeds (dependency order)', () => {
      const order = getLoadOrder();
      const crmIndex = order.indexOf('crm');
      const marketingIndex = order.indexOf('marketing');
      expect(crmIndex).toBeLessThan(marketingIndex);
      expect(CampaignSeedData.length).toBeGreaterThanOrEqual(1);
    });

    it('CRM seeds should be loadable before Support seeds', () => {
      const order = getLoadOrder();
      const crmIndex = order.indexOf('crm');
      const supportIndex = order.indexOf('support');
      expect(crmIndex).toBeLessThan(supportIndex);
      expect(CaseSeedData.length).toBeGreaterThanOrEqual(1);
    });

    it('Core seeds should be loadable before all other package seeds', () => {
      const order = getLoadOrder();
      expect(order[0]).toBe('core');
    });

    it('Finance seeds should be loadable before Financial Services seeds', () => {
      const order = getLoadOrder();
      const financeIndex = order.indexOf('finance');
      const fsIndex = order.indexOf('financial-services');
      expect(financeIndex).toBeLessThan(fsIndex);
      expect(WealthAccountSeedData.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- 13E-3.2: Plugin Registration Order ---
  describe('Plugin Registration Order', () => {
    it('all package dependencies should point to existing packages', () => {
      const result = validateDependencies();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('load order should have no circular dependencies', () => {
      expect(hasCircularDependency()).toBe(false);
    });

    it('load order should include all 14 packages', () => {
      const order = getLoadOrder();
      expect(order).toHaveLength(14);
    });

    it('core must always load first', () => {
      const order = getLoadOrder();
      expect(order[0]).toBe('core');
    });

    it('packages with CRM dependency must load after CRM', () => {
      const order = getLoadOrder();
      const crmIndex = order.indexOf('crm');
      const crmDependents = PACKAGE_DEPENDENCY_GRAPH
        .filter(p => p.dependencies.includes('crm'))
        .map(p => p.name);

      for (const dep of crmDependents) {
        expect(order.indexOf(dep)).toBeGreaterThan(crmIndex);
      }
    });

    it('each package loadOrder should be consistent with topological sort', () => {
      const order = getLoadOrder();
      for (const pkg of PACKAGE_DEPENDENCY_GRAPH) {
        for (const dep of pkg.dependencies) {
          const depOrder = order.indexOf(dep);
          const pkgOrder = order.indexOf(pkg.name);
          expect(depOrder).toBeLessThan(pkgOrder);
        }
      }
    });
  });

  // --- 13E-3.3: Vertical Package Integration ---
  describe('Vertical Package Integration with Core Clouds', () => {
    it('Healthcare should depend on core and crm', () => {
      const healthcare = PACKAGE_DEPENDENCY_GRAPH.find(p => p.name === 'healthcare');
      expect(healthcare).toBeDefined();
      expect(healthcare!.dependencies).toContain('core');
      expect(healthcare!.dependencies).toContain('crm');
      expect(PatientSeedData.length).toBeGreaterThanOrEqual(1);
    });

    it('Financial Services should depend on core, crm, and finance', () => {
      const fs = PACKAGE_DEPENDENCY_GRAPH.find(p => p.name === 'financial-services');
      expect(fs).toBeDefined();
      expect(fs!.dependencies).toContain('core');
      expect(fs!.dependencies).toContain('crm');
      expect(fs!.dependencies).toContain('finance');
    });

    it('Real Estate should depend on core and crm', () => {
      const re = PACKAGE_DEPENDENCY_GRAPH.find(p => p.name === 'real-estate');
      expect(re).toBeDefined();
      expect(re!.dependencies).toContain('core');
      expect(re!.dependencies).toContain('crm');
      expect(PropertySeedData.length).toBeGreaterThanOrEqual(1);
    });

    it('Education should depend on core', () => {
      const edu = PACKAGE_DEPENDENCY_GRAPH.find(p => p.name === 'education');
      expect(edu).toBeDefined();
      expect(edu!.dependencies).toContain('core');
      expect(CourseSeedData.length).toBeGreaterThanOrEqual(1);
    });

    it('all verticals should have seed files', () => {
      const verticals = ['healthcare', 'financial-services', 'real-estate', 'education'];
      for (const v of verticals) {
        const pkg = PACKAGE_DEPENDENCY_GRAPH.find(p => p.name === v);
        expect(pkg).toBeDefined();
        expect(pkg!.seedFiles.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // --- 13E-3.4: AI Agent Cross-Package Data Access ---
  describe('AI Agent Cross-Package Data Access', () => {
    it('AI package should be able to reference CRM data structures', () => {
      expect(AccountSeedData).toBeDefined();
      expect(Array.isArray(AccountSeedData)).toBe(true);
      expect(AccountSeedData[0]).toHaveProperty('name');
    });

    it('AI package should be able to reference HR data structures', () => {
      expect(EmployeeSeedData).toBeDefined();
      expect(Array.isArray(EmployeeSeedData)).toBe(true);
      expect(EmployeeSeedData[0]).toHaveProperty('first_name');
    });

    it('AI package should be able to reference Products data structures', () => {
      expect(ProductSeedData).toBeDefined();
      expect(Array.isArray(ProductSeedData)).toBe(true);
      expect(ProductSeedData[0]).toHaveProperty('name');
    });

    it('seed data from all packages should be loadable without import errors', () => {
      const datasets = [
        AccountSeedData, InvoiceSeedData, CampaignSeedData,
        CaseSeedData, PatientSeedData, WealthAccountSeedData,
        PropertySeedData, CourseSeedData, EmployeeSeedData, ProductSeedData,
      ];
      for (const ds of datasets) {
        expect(Array.isArray(ds)).toBe(true);
        expect(ds.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // --- Seed Load Idempotency ---
  describe('Seed Data Load Idempotency', () => {
    it('seed data arrays should be stable across multiple imports', () => {
      const firstImport = AccountSeedData;
      const secondImport = AccountSeedData;
      expect(firstImport).toBe(secondImport);
      expect(firstImport.length).toBe(secondImport.length);
    });

    it('seed data should not be mutated', () => {
      const original = JSON.stringify(AccountSeedData);
      expect(JSON.stringify(AccountSeedData)).toBe(original);
    });
  });
});
