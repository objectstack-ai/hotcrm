import { describe, it, expect } from 'vitest';
import { EventTypeDefinitionSchema } from '@objectstack/spec/kernel';
import { CRMEvents } from '../../../src/crm.events';

describe('CRM Events Schema Compliance', () => {
  it('should be defined and non-empty', () => {
    expect(CRMEvents).toBeDefined();
    expect(Object.keys(CRMEvents).length).toBeGreaterThan(0);
  });

  it('each event should re-validate against EventTypeDefinitionSchema', () => {
    for (const [key, event] of Object.entries(CRMEvents)) {
      expect(() => EventTypeDefinitionSchema.parse(event), `Event "${key}" failed re-validation`).not.toThrow();
    }
  });

  it('each event should have required properties from schema', () => {
    for (const [, event] of Object.entries(CRMEvents)) {
      expect(event).toHaveProperty('name');
      expect(event).toHaveProperty('description');
      expect(event).toHaveProperty('version');
    }
  });

  it('event names should follow domain naming convention', () => {
    for (const [, event] of Object.entries(CRMEvents)) {
      expect(event.name).toMatch(/^crm\./);
    }
  });
});
