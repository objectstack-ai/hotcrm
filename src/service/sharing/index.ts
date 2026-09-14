// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Service sharing barrel.
 *
 * The doctrine for this metadata type is written once, in
 * `src/sales/sharing/index.ts`; this file is the service package's half of
 * the same file-by-file registration.
 */

export {
  CaseDirectorSharingRule,
  CaseEscalationSharingRule,
  CaseUnassignedTriageSharingRule,
} from './case.sharing';
