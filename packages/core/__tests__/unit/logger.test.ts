import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, logger } from '../../src/logger';

describe('Logger', () => {
  const originalEnv = process.env.LOG_LEVEL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalEnv;
    }
  });

  describe('createLogger', () => {
    it('should create a logger with the specified module name', () => {
      const log = createLogger('crm:account');
      // pino exposes bindings() which includes "name"
      expect((log as any).bindings().name).toBe('crm:account');
    });

    it('should default to info level', () => {
      const log = createLogger('test:module');
      expect(log.level).toBe('info');
    });

    it('should accept a custom level via options', () => {
      const log = createLogger('test:debug', { level: 'debug' });
      expect(log.level).toBe('debug');
    });

    it('should respect LOG_LEVEL env variable', () => {
      process.env.LOG_LEVEL = 'warn';
      const log = createLogger('test:env');
      expect(log.level).toBe('warn');
    });

    it('should prefer explicit option over env variable', () => {
      process.env.LOG_LEVEL = 'warn';
      const log = createLogger('test:override', { level: 'error' });
      expect(log.level).toBe('error');
    });
  });

  describe('logger (default instance)', () => {
    it('should be a valid pino logger', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should have name "hotcrm"', () => {
      expect((logger as any).bindings().name).toBe('hotcrm');
    });
  });

  describe('structured output', () => {
    it('should produce JSON output with structured data', () => {
      const chunks: string[] = [];
      const dest = {
        write(chunk: string) { chunks.push(chunk); },
      } as any;

      // Create a pino logger writing to our mock destination
      const pino = require('pino');
      const log = pino({ name: 'test:json', level: 'info' }, dest);
      log.info({ accountId: '123', score: 85 }, 'Account scored');

      expect(chunks.length).toBe(1);
      const parsed = JSON.parse(chunks[0]);
      expect(parsed.name).toBe('test:json');
      expect(parsed.accountId).toBe('123');
      expect(parsed.score).toBe(85);
      expect(parsed.msg).toBe('Account scored');
      expect(parsed.level).toBe(30); // pino info = 30
    });

    it('should not contain emoji in structured output', () => {
      const chunks: string[] = [];
      const dest = {
        write(chunk: string) { chunks.push(chunk); },
      } as any;

      const pino = require('pino');
      const log = pino({ name: 'test:no-emoji', level: 'info' }, dest);
      log.info('Account created successfully');

      const parsed = JSON.parse(chunks[0]);
      // Verify no emoji characters (common emoji ranges)
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
      expect(emojiRegex.test(parsed.msg)).toBe(false);
    });
  });
});
