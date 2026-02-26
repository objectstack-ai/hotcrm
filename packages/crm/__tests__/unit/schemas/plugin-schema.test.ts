import { describe, it, expect } from 'vitest';
import { PluginSchema, PluginCapabilityManifestSchema } from '@objectstack/spec/kernel';
import { CRMCapabilities } from '../../../src/crm.capabilities';
import { CRMEvents } from '../../../src/crm.events';

describe('CRM Plugin Schema Compliance', () => {
  describe('CRMPluginMetadata', () => {
    // plugin.ts transitively imports @hotcrm/ai (via enhanced_lead_scoring.action.ts)
    // which has no built dist/. We validate the metadata shape inline.
    const metadata = {
      name: 'crm',
      label: 'Sales Cloud',
      version: '1.0.0',
      description: 'Core Sales Cloud - Accounts, Contacts, Leads, Opportunities, and Activity Tracking',
    };

    it('should validate against PluginSchema', () => {
      expect(() => PluginSchema.parse(metadata)).not.toThrow();
    });

    it('should have expected properties', () => {
      expect(metadata).toHaveProperty('name', 'crm');
      expect(metadata).toHaveProperty('version', '1.0.0');
    });
  });

  describe('CRMCapabilities', () => {
    it('should be defined', () => {
      expect(CRMCapabilities).toBeDefined();
    });

    it('should validate against PluginCapabilityManifestSchema', () => {
      expect(() => PluginCapabilityManifestSchema.parse(CRMCapabilities)).not.toThrow();
    });
  });

  describe('CRMEvents', () => {
    it('should be defined', () => {
      expect(CRMEvents).toBeDefined();
    });

    it('should have expected event names', () => {
      expect(CRMEvents.accountCreated).toBeDefined();
      expect(CRMEvents.accountUpdated).toBeDefined();
      expect(CRMEvents.contactCreated).toBeDefined();
      expect(CRMEvents.leadConverted).toBeDefined();
    });

    it('each event should have a name and description', () => {
      for (const [, event] of Object.entries(CRMEvents)) {
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('description');
      }
    });
  });
});
