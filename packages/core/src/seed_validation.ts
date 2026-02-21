/**
 * Seed Data Validation Utility
 *
 * Validates seed data records against their expected field structure.
 * Since @objectstack/spec does not provide a SeedDataSchema, we validate
 * seed records by checking that they are arrays of non-null objects with
 * string keys, and optionally checking required field presence.
 */

export interface SeedValidationOptions {
  /** Minimum number of records expected */
  minRecords?: number;
  /** Required field names that must exist in each record */
  requiredFields?: string[];
  /** Optional: check that no record has null/undefined for required fields */
  strictRequired?: boolean;
}

export interface SeedValidationResult {
  valid: boolean;
  recordCount: number;
  errors: string[];
}

/**
 * Validates a seed data array against expected structure.
 */
export function validateSeedData(
  data: unknown,
  options: SeedValidationOptions = {}
): SeedValidationResult {
  const errors: string[] = [];
  const { minRecords = 1, requiredFields = [], strictRequired = false } = options;

  if (!Array.isArray(data)) {
    return { valid: false, recordCount: 0, errors: ['Seed data must be an array'] };
  }

  if (data.length < minRecords) {
    errors.push(`Expected at least ${minRecords} records, got ${data.length}`);
  }

  data.forEach((record, index) => {
    if (typeof record !== 'object' || record === null) {
      errors.push(`Record[${index}] is not a valid object`);
      return;
    }

    for (const field of requiredFields) {
      if (!(field in record)) {
        errors.push(`Record[${index}] missing required field: ${field}`);
      } else if (strictRequired && (record as Record<string, unknown>)[field] == null) {
        errors.push(`Record[${index}] has null/undefined for required field: ${field}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    recordCount: Array.isArray(data) ? data.length : 0,
    errors,
  };
}

/**
 * Validates that seed records only contain allowed field names.
 */
export function validateSeedFields(
  data: Record<string, unknown>[],
  allowedFields: string[]
): SeedValidationResult {
  const errors: string[] = [];
  const allowedSet = new Set(allowedFields);

  data.forEach((record, index) => {
    for (const key of Object.keys(record)) {
      if (!allowedSet.has(key)) {
        errors.push(`Record[${index}] has unexpected field: ${key}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    recordCount: data.length,
    errors,
  };
}
