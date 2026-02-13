import { describe, it, expect } from 'vitest';
import { ConnectorSchema } from '@objectstack/spec/automation';
import { EmailConnector } from '../../../src/email_connector.connector';

describe('CRM Connector Metadata Compliance', () => {
  describe('EmailConnector', () => {
    it('should be defined', () => {
      expect(EmailConnector).toBeDefined();
    });

    it('should validate against ConnectorSchema', () => {
      expect(() => ConnectorSchema.parse(EmailConnector)).not.toThrow();
    });

    it('should have operations array', () => {
      expect(Array.isArray(EmailConnector.operations)).toBe(true);
      expect(EmailConnector.operations.length).toBeGreaterThan(0);
    });

    it('should have authentication config', () => {
      expect(EmailConnector.authentication).toBeDefined();
      expect(EmailConnector.authentication.type).toBe('oauth2');
    });

    it('should have triggers array', () => {
      expect(Array.isArray(EmailConnector.triggers)).toBe(true);
      expect(EmailConnector.triggers!.length).toBeGreaterThan(0);
    });
  });
});
