import {
  CrossFieldValidationSchema,
  ConditionalValidationSchema,
} from '@objectstack/spec/data';
import type { z } from 'zod';

type CrossFieldValidation = z.infer<typeof CrossFieldValidationSchema>;
type ConditionalValidation = z.infer<typeof ConditionalValidationSchema>;

/**
 * Opportunity: close_date required when stage is closed_won or closed_lost
 */
export const opportunityCloseDateRequired: ConditionalValidation =
  ConditionalValidationSchema.parse({
    name: 'opportunity_close_date_required',
    message: 'Close date is required when opportunity is closed (won or lost)',
    type: 'conditional',
    when: "stage == 'closed_won' || stage == 'closed_lost'",
    then: {
      type: 'cross_field',
      name: 'close_date_not_null',
      message: 'Close date must be set for closed opportunities',
      condition: 'close_date != null',
      fields: ['close_date', 'stage'],
    },
  });

/**
 * Opportunity: amount must be > 0 when stage is not prospecting
 */
export const opportunityAmountPositive: ConditionalValidation =
  ConditionalValidationSchema.parse({
    name: 'opportunity_amount_positive',
    message: 'Amount must be greater than zero for non-prospecting stages',
    type: 'conditional',
    when: "stage != 'prospecting'",
    then: {
      type: 'cross_field',
      name: 'amount_greater_than_zero',
      message: 'Amount must be positive when stage is beyond prospecting',
      condition: 'amount > 0',
      fields: ['amount', 'stage'],
    },
  });

/**
 * Lead: at least one of email or phone is required
 */
export const leadContactInfoRequired: CrossFieldValidation =
  CrossFieldValidationSchema.parse({
    name: 'lead_contact_info_required',
    message: 'At least one contact method (email or phone) is required',
    type: 'cross_field',
    condition: 'email != null || phone != null',
    fields: ['email', 'phone'],
    severity: 'error',
  });

/**
 * Case: resolution is required when status is closed
 */
export const caseResolutionRequired: ConditionalValidation =
  ConditionalValidationSchema.parse({
    name: 'case_resolution_required',
    message: 'Resolution is required when closing a case',
    type: 'conditional',
    when: "status == 'closed'",
    then: {
      type: 'cross_field',
      name: 'resolution_not_null',
      message: 'Resolution must be provided before closing a case',
      condition: 'resolution != null',
      fields: ['resolution', 'status'],
    },
  });

/**
 * Contact: account_id is required when is_decision_maker is true
 */
export const contactDecisionMakerAccount: ConditionalValidation =
  ConditionalValidationSchema.parse({
    name: 'contact_decision_maker_account',
    message: 'Account is required for decision makers',
    type: 'conditional',
    when: 'is_decision_maker == true',
    then: {
      type: 'cross_field',
      name: 'account_id_not_null',
      message: 'Decision makers must be associated with an account',
      condition: 'account_id != null',
      fields: ['account_id', 'is_decision_maker'],
    },
  });

export const crossFieldValidations = {
  opportunityCloseDateRequired,
  opportunityAmountPositive,
  leadContactInfoRequired,
  caseResolutionRequired,
  contactDecisionMakerAccount,
};

export default crossFieldValidations;
