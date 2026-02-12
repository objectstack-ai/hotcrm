import {
  DataQualityRulesSchema,
  FormatValidationSchema,
  CrossFieldValidationSchema,
} from '@objectstack/spec/data';
import type { z } from 'zod';

type FormatValidation = z.infer<typeof FormatValidationSchema>;
type CrossFieldValidation = z.infer<typeof CrossFieldValidationSchema>;
type DataQualityRules = z.infer<typeof DataQualityRulesSchema>;

// ---------------------------------------------------------------------------
// Email Format Validations
// ---------------------------------------------------------------------------

export const emailFormatValidation: FormatValidation =
  FormatValidationSchema.parse({
    name: 'email_format',
    message: 'Email address must be in a valid format (e.g., user@example.com)',
    type: 'format',
    field: 'email',
    format: 'email',
    severity: 'error',
  });

export const workEmailFormatValidation: FormatValidation =
  FormatValidationSchema.parse({
    name: 'work_email_format',
    message: 'Work email must be in a valid format',
    type: 'format',
    field: 'work_email',
    format: 'email',
    severity: 'error',
  });

// ---------------------------------------------------------------------------
// Phone Number Normalization Rules
// ---------------------------------------------------------------------------

export const phoneFormatValidation: FormatValidation =
  FormatValidationSchema.parse({
    name: 'phone_format',
    message: 'Phone number must be in a valid format',
    type: 'format',
    field: 'phone',
    format: 'phone',
    severity: 'warning',
  });

export const mobilePhoneFormatValidation: FormatValidation =
  FormatValidationSchema.parse({
    name: 'mobile_phone_format',
    message: 'Mobile phone number must be in a valid format',
    type: 'format',
    field: 'mobile_phone',
    format: 'phone',
    severity: 'warning',
  });

// ---------------------------------------------------------------------------
// Address Standardization Rules
// ---------------------------------------------------------------------------

export const websiteUrlValidation: FormatValidation =
  FormatValidationSchema.parse({
    name: 'website_url_format',
    message: 'Website URL must be valid (e.g., https://example.com)',
    type: 'format',
    field: 'website',
    format: 'url',
    severity: 'warning',
  });

export const addressFieldsRequired: CrossFieldValidation =
  CrossFieldValidationSchema.parse({
    name: 'address_completeness',
    message:
      'When a street address is provided, city and country are also required',
    type: 'cross_field',
    condition:
      'billing_street == null || (billing_city != null && billing_country != null)',
    fields: ['billing_street', 'billing_city', 'billing_country'],
    severity: 'warning',
  });

export const shippingAddressConsistency: CrossFieldValidation =
  CrossFieldValidationSchema.parse({
    name: 'shipping_address_completeness',
    message:
      'When a shipping street is provided, city and country are also required',
    type: 'cross_field',
    condition:
      'shipping_street == null || (shipping_city != null && shipping_country != null)',
    fields: ['shipping_street', 'shipping_city', 'shipping_country'],
    severity: 'warning',
  });

// ---------------------------------------------------------------------------
// Duplicate Detection Rules
// ---------------------------------------------------------------------------

export const accountDuplicateDetection: CrossFieldValidation =
  CrossFieldValidationSchema.parse({
    name: 'account_duplicate_detection',
    message:
      'A matching account with the same name and website may already exist',
    type: 'cross_field',
    condition: 'name != null && website != null',
    fields: ['name', 'website'],
    severity: 'warning',
  });

export const contactDuplicateDetection: CrossFieldValidation =
  CrossFieldValidationSchema.parse({
    name: 'contact_duplicate_detection',
    message:
      'A matching contact with the same email may already exist',
    type: 'cross_field',
    condition: 'email != null',
    fields: ['first_name', 'last_name', 'email'],
    severity: 'warning',
  });

export const leadDuplicateDetection: CrossFieldValidation =
  CrossFieldValidationSchema.parse({
    name: 'lead_duplicate_detection',
    message:
      'A matching lead with the same email or company and name may already exist',
    type: 'cross_field',
    condition: 'email != null || (company != null && last_name != null)',
    fields: ['email', 'company', 'first_name', 'last_name'],
    severity: 'warning',
  });

// ---------------------------------------------------------------------------
// Data Quality Thresholds
// ---------------------------------------------------------------------------

export const accountDataQuality: DataQualityRules =
  DataQualityRulesSchema.parse({
    uniqueness: true,
    completeness: 0.85,
  });

export const contactDataQuality: DataQualityRules =
  DataQualityRulesSchema.parse({
    uniqueness: true,
    completeness: 0.9,
  });

export const leadDataQuality: DataQualityRules =
  DataQualityRulesSchema.parse({
    uniqueness: true,
    completeness: 0.75,
  });

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const formatValidations = {
  emailFormatValidation,
  workEmailFormatValidation,
  phoneFormatValidation,
  mobilePhoneFormatValidation,
  websiteUrlValidation,
};

export const addressValidations = {
  addressFieldsRequired,
  shippingAddressConsistency,
};

export const duplicateDetectionRules = {
  accountDuplicateDetection,
  contactDuplicateDetection,
  leadDuplicateDetection,
};

export const dataQualityThresholds = {
  accountDataQuality,
  contactDataQuality,
  leadDataQuality,
};

export const dataQualityRules = {
  formatValidations,
  addressValidations,
  duplicateDetectionRules,
  dataQualityThresholds,
};

export default dataQualityRules;
