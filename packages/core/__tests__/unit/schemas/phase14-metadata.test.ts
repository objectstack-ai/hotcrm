import { describe, it, expect } from 'vitest';
import { InterfaceBuilderConfigSchema, PageBuilderConfigSchema, CanvasSnapSettingsSchema, ElementPaletteItemSchema } from '@objectstack/spec/studio';
import { NavigationAreaSchema, ActionNavItemSchema, ReportNavItemSchema } from '@objectstack/spec/ui';
import { OclifPluginConfigSchema } from '@objectstack/spec/kernel';
import { SortItemSchema } from '@objectstack/spec/shared';

import {
  InterfaceBuilder, PageBuilder, CanvasSnap, ElementPalette
} from '../../../src/interface_builder.studio';

import {
  FEED_ENABLED_OBJECTS, DEFAULT_FEED_CONFIG,
  FEED_PERMISSION_RULES, AUTO_SUBSCRIPTION_RULES,
  FeedServiceContract
} from '../../../src/feed_service.contract';

import {
  packageConventions, SYSTEM_FIELDS, SYSTEM_OBJECTS,
  hotcrmCliConfig, STANDARD_SORTS, SystemMetadata
} from '../../../src/system_metadata';

import {
  QuickCreateAction, GlobalSearchAction, ImportDataAction, NotificationsAction,
  PipelineReport, RevenueReport, ForecastReport, ActivityReport,
  HeaderNavigation, SidebarNavigation, UtilityBarNavigation
} from '../../../src/navigation';

describe('Core Phase 14 Schema Compliance', () => {
  // --- Interface Builder Studio ---
  describe('Interface Builder', () => {
    it('InterfaceBuilder should be defined', () => {
      expect(InterfaceBuilder).toBeDefined();
    });

    it('InterfaceBuilder should validate against InterfaceBuilderConfigSchema', () => {
      expect(() => InterfaceBuilderConfigSchema.parse(InterfaceBuilder)).not.toThrow();
    });

    it('InterfaceBuilder should have expected properties', () => {
      expect(InterfaceBuilder).toHaveProperty('enabled');
      expect(InterfaceBuilder).toHaveProperty('allowBlankPages');
    });

    it('PageBuilder should validate against PageBuilderConfigSchema', () => {
      expect(PageBuilder).toBeDefined();
      expect(() => PageBuilderConfigSchema.parse(PageBuilder)).not.toThrow();
      expect(PageBuilder).toHaveProperty('enabled');
    });

    it('CanvasSnap should validate against CanvasSnapSettingsSchema', () => {
      expect(CanvasSnap).toBeDefined();
      expect(() => CanvasSnapSettingsSchema.parse(CanvasSnap)).not.toThrow();
      expect(CanvasSnap).toHaveProperty('enabled');
      expect(CanvasSnap).toHaveProperty('gridSize');
    });

    it('ElementPalette should be an array of valid palette items', () => {
      expect(Array.isArray(ElementPalette)).toBe(true);
      expect(ElementPalette.length).toBeGreaterThanOrEqual(7);
      ElementPalette.forEach(item => {
        expect(() => ElementPaletteItemSchema.parse(item)).not.toThrow();
      });
    });

    it('ElementPalette should contain expected element types', () => {
      const types = ElementPalette.map(item => item.type);
      expect(types).toContain('button');
      expect(types).toContain('text');
      expect(types).toContain('form');
    });
  });

  // --- Feed Service Contract ---
  describe('Feed Service Contract', () => {
    it('FEED_ENABLED_OBJECTS should be a non-empty array', () => {
      expect(Array.isArray(FEED_ENABLED_OBJECTS)).toBe(true);
      expect(FEED_ENABLED_OBJECTS.length).toBeGreaterThanOrEqual(9);
    });

    it('FEED_ENABLED_OBJECTS should contain core CRM objects', () => {
      expect(FEED_ENABLED_OBJECTS).toContain('account');
      expect(FEED_ENABLED_OBJECTS).toContain('contact');
      expect(FEED_ENABLED_OBJECTS).toContain('opportunity');
    });

    it('DEFAULT_FEED_CONFIG should have config for each enabled object', () => {
      expect(DEFAULT_FEED_CONFIG).toBeDefined();
      for (const obj of FEED_ENABLED_OBJECTS) {
        expect(DEFAULT_FEED_CONFIG).toHaveProperty(obj);
        expect(DEFAULT_FEED_CONFIG[obj]).toHaveProperty('enabled');
      }
    });

    it('FEED_PERMISSION_RULES should be a non-empty array', () => {
      expect(Array.isArray(FEED_PERMISSION_RULES)).toBe(true);
      expect(FEED_PERMISSION_RULES.length).toBeGreaterThanOrEqual(6);
    });

    it('each permission rule should have action and requiredObjectPermission', () => {
      FEED_PERMISSION_RULES.forEach(rule => {
        expect(rule).toHaveProperty('action');
        expect(rule).toHaveProperty('requiredObjectPermission');
      });
    });

    it('AUTO_SUBSCRIPTION_RULES should be a non-empty array', () => {
      expect(Array.isArray(AUTO_SUBSCRIPTION_RULES)).toBe(true);
      expect(AUTO_SUBSCRIPTION_RULES.length).toBeGreaterThanOrEqual(9);
    });

    it('FeedServiceContract aggregate should contain all parts', () => {
      expect(FeedServiceContract).toBeDefined();
      expect(FeedServiceContract).toHaveProperty('enabledObjects');
      expect(FeedServiceContract).toHaveProperty('defaultConfig');
      expect(FeedServiceContract).toHaveProperty('permissionRules');
      expect(FeedServiceContract).toHaveProperty('autoSubscriptionRules');
    });
  });

  // --- System Metadata ---
  describe('System Metadata', () => {
    it('packageConventions should be defined', () => {
      expect(packageConventions).toBeDefined();
    });

    it('SYSTEM_FIELDS should contain standard system fields', () => {
      expect(SYSTEM_FIELDS).toBeDefined();
      expect(SYSTEM_FIELDS).toHaveProperty('id');
      expect(SYSTEM_FIELDS).toHaveProperty('createdAt');
      expect(SYSTEM_FIELDS).toHaveProperty('updatedAt');
      expect(SYSTEM_FIELDS).toHaveProperty('ownerId');
      expect(SYSTEM_FIELDS).toHaveProperty('tenantId');
    });

    it('SYSTEM_OBJECTS should contain standard system objects', () => {
      expect(SYSTEM_OBJECTS).toBeDefined();
      expect(SYSTEM_OBJECTS).toHaveProperty('user');
      expect(SYSTEM_OBJECTS).toHaveProperty('session');
      expect(SYSTEM_OBJECTS).toHaveProperty('metadata');
    });

    it('hotcrmCliConfig should validate against OclifPluginConfigSchema', () => {
      expect(hotcrmCliConfig).toBeDefined();
      expect(() => OclifPluginConfigSchema.parse(hotcrmCliConfig)).not.toThrow();
    });

    it('STANDARD_SORTS should have sort items that validate against SortItemSchema', () => {
      expect(STANDARD_SORTS).toBeDefined();
      const sortEntries = Object.values(STANDARD_SORTS);
      expect(sortEntries.length).toBeGreaterThanOrEqual(7);
      sortEntries.forEach(sort => {
        expect(() => SortItemSchema.parse(sort)).not.toThrow();
      });
    });

    it('SystemMetadata aggregate should contain all parts', () => {
      expect(SystemMetadata).toBeDefined();
      expect(SystemMetadata).toHaveProperty('packageConventions');
      expect(SystemMetadata).toHaveProperty('fields');
      expect(SystemMetadata).toHaveProperty('objects');
      expect(SystemMetadata).toHaveProperty('cliConfig');
      expect(SystemMetadata).toHaveProperty('sorts');
    });
  });

  // --- Navigation ---
  describe('Navigation', () => {
    describe('Action Nav Items', () => {
      const actions = [
        { name: 'QuickCreateAction', value: QuickCreateAction },
        { name: 'GlobalSearchAction', value: GlobalSearchAction },
        { name: 'ImportDataAction', value: ImportDataAction },
        { name: 'NotificationsAction', value: NotificationsAction },
      ];

      it.each(actions)('$name should validate against ActionNavItemSchema', ({ value }) => {
        expect(value).toBeDefined();
        expect(() => ActionNavItemSchema.parse(value)).not.toThrow();
      });

      it.each(actions)('$name should have label and type', ({ value }) => {
        expect(value).toHaveProperty('label');
        expect(value).toHaveProperty('type', 'action');
      });
    });

    describe('Report Nav Items', () => {
      const reports = [
        { name: 'PipelineReport', value: PipelineReport },
        { name: 'RevenueReport', value: RevenueReport },
        { name: 'ForecastReport', value: ForecastReport },
        { name: 'ActivityReport', value: ActivityReport },
      ];

      it.each(reports)('$name should validate against ReportNavItemSchema', ({ value }) => {
        expect(value).toBeDefined();
        expect(() => ReportNavItemSchema.parse(value)).not.toThrow();
      });
    });

    describe('Navigation Areas', () => {
      const areas = [
        { name: 'HeaderNavigation', value: HeaderNavigation },
        { name: 'SidebarNavigation', value: SidebarNavigation },
        { name: 'UtilityBarNavigation', value: UtilityBarNavigation },
      ];

      it.each(areas)('$name should validate against NavigationAreaSchema', ({ value }) => {
        expect(value).toBeDefined();
        expect(() => NavigationAreaSchema.parse(value)).not.toThrow();
      });

      it.each(areas)('$name should have id, label, and navigation', ({ value }) => {
        expect(value).toHaveProperty('id');
        expect(value).toHaveProperty('label');
        expect(value).toHaveProperty('navigation');
        expect(Array.isArray(value.navigation)).toBe(true);
      });
    });
  });
});
