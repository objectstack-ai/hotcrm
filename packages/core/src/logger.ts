/**
 * Structured Logger — pino-based logging for HotCRM
 *
 * Provides leveled, machine-parseable logging (debug/info/warn/error).
 * All hook, action, and service files should use this instead of console.log.
 *
 * Usage:
 *   import { createLogger } from '@hotcrm/core';
 *   const logger = createLogger('crm:account');
 *   logger.info({ accountId }, 'Account created');
 *   logger.error({ err }, 'Failed to update account');
 */

import pino from 'pino';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

export interface LoggerOptions {
  /** Minimum log level (default: from LOG_LEVEL env or 'info') */
  level?: LogLevel;
}

/**
 * Create a child logger scoped to a specific module.
 *
 * @param module  Hierarchical module name, e.g. 'crm:account' or 'ai:cache'
 * @param options Optional overrides
 */
export function createLogger(module: string, options?: LoggerOptions): pino.Logger {
  const level = options?.level ?? (process.env.LOG_LEVEL as LogLevel) ?? 'info';
  return pino({ name: module, level });
}

/** Shared root logger instance */
export const logger: pino.Logger = createLogger('hotcrm');
