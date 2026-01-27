/**
 * @hotcrm/core - Core Engine and ObjectQL
 * 
 * This package provides the core functionality for HotCRM including:
 * - ObjectQL query engine
 * - Type definitions for @objectstack/spec
 */

export * from './objectql';

// Re-export type definitions from @objectstack/spec
export type { ObjectSchema, FieldSchema, HookSchema } from '@objectstack/spec/data';
export type { DashboardSchema } from '@objectstack/spec/ui';
