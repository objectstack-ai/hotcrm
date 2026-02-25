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

/** Flexible logger interface compatible with pino but lenient on call signatures */
export interface Logger {
  fatal(msg: string, ...args: any[]): void;
  fatal(obj: unknown, msg?: string, ...args: any[]): void;
  error(msg: string, ...args: any[]): void;
  error(obj: unknown, msg?: string, ...args: any[]): void;
  warn(msg: string, ...args: any[]): void;
  warn(obj: unknown, msg?: string, ...args: any[]): void;
  info(msg: string, ...args: any[]): void;
  info(obj: unknown, msg?: string, ...args: any[]): void;
  debug(msg: string, ...args: any[]): void;
  debug(obj: unknown, msg?: string, ...args: any[]): void;
  trace(msg: string, ...args: any[]): void;
  trace(obj: unknown, msg?: string, ...args: any[]): void;
  child(bindings: Record<string, any>): Logger;
}

/**
 * Create a child logger scoped to a specific module.
 *
 * @param module  Hierarchical module name, e.g. 'crm:account' or 'ai:cache'
 * @param options Optional overrides
 */
export function createLogger(module: string, options?: LoggerOptions): Logger {
  const level = options?.level ?? (process.env.LOG_LEVEL as LogLevel) ?? 'info';
  return pino({ name: module, level }) as unknown as Logger;
}

/** Shared root logger instance */
export const logger: Logger = createLogger('hotcrm');
