/**
 * @hotcrm/core - Core Engine and ObjectQL
 * 
 * This package provides the core functionality for HotCRM including:
 * - ObjectQL query engine
 * - Type definitions for @objectstack/spec
 */

export * from './objectql';

// Re-export type definitions for @objectstack/spec
// Note: These are defined in objectstack-spec.d.ts
export type { ObjectSchema, FieldSchema, HookSchema } from '@objectstack/spec/data';
export type { DashboardSchema } from '@objectstack/spec/ui';
