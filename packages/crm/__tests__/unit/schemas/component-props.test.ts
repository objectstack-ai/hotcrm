import { describe, it, expect } from 'vitest';
import { AccountPage } from '../../../src/account.page';

describe('CRM Component Properties Compliance', () => {
  describe('record:highlights components', () => {
    it('AccountPage highlights should have fields array', () => {
      const highlights = AccountPage.regions
        .flatMap((r: any) => r.components)
        .find((c: any) => c.type === 'record:highlights');
      expect(highlights).toBeDefined();
      expect(highlights.properties.fields).toBeDefined();
      expect(Array.isArray(highlights.properties.fields)).toBe(true);
    });
  });

  describe('record:details components', () => {
    it('AccountPage details should have fields and columns', () => {
      const details = AccountPage.regions
        .flatMap((r: any) => r.components)
        .find((c: any) => c.type === 'record:details');
      expect(details).toBeDefined();
      expect(details.properties.fields).toBeDefined();
      expect(details.properties.columns).toBeDefined();
    });
  });

  describe('ai:chat_window components', () => {
    it('should have mode property', () => {
      const aiChat = AccountPage.regions
        .flatMap((r: any) => r.components)
        .find((c: any) => c.type === 'ai:chat_window');
      expect(aiChat).toBeDefined();
      expect(aiChat.properties.mode).toBe('sidebar');
    });
  });

  describe('record:related_list components', () => {
    it('should have object and columns properties', () => {
      const relatedList = AccountPage.regions
        .flatMap((r: any) => r.components)
        .find((c: any) => c.type === 'record:related_list');
      expect(relatedList).toBeDefined();
      expect(relatedList.properties.object).toBeDefined();
      expect(relatedList.properties.columns).toBeDefined();
    });
  });

  describe('page:tabs components', () => {
    it('should have tabs property', () => {
      const tabs = AccountPage.regions
        .flatMap((r: any) => r.components)
        .find((c: any) => c.type === 'page:tabs');
      expect(tabs).toBeDefined();
      expect(tabs.properties.tabs).toBeDefined();
    });
  });
});
