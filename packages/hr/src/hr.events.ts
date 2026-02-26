/**
 * HR Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to HR domain changes.
 */
import { EventTypeDefinitionSchema } from '@objectstack/spec/kernel';

export const HREvents = {
  employeeOnboarded: EventTypeDefinitionSchema.parse({
    name: 'hr.employee.onboarded',
    description: 'Fired when a new employee completes onboarding',
  }),
  employeeTerminated: EventTypeDefinitionSchema.parse({
    name: 'hr.employee.terminated',
    description: 'Fired when an employee is terminated',
  }),
  candidateHired: EventTypeDefinitionSchema.parse({
    name: 'hr.candidate.hired',
    description: 'Fired when a candidate is hired and converted to employee',
  }),
  offerAccepted: EventTypeDefinitionSchema.parse({
    name: 'hr.offer.accepted',
    description: 'Fired when an offer letter is accepted by a candidate',
  }),
  performanceReviewCompleted: EventTypeDefinitionSchema.parse({
    name: 'hr.performance_review.completed',
    description: 'Fired when a performance review cycle is completed',
  }),
  timeOffApproved: EventTypeDefinitionSchema.parse({
    name: 'hr.time_off.approved',
    description: 'Fired when a time-off request is approved',
  }),
  payrollProcessed: EventTypeDefinitionSchema.parse({
    name: 'hr.payroll.processed',
    description: 'Fired when payroll is processed for a pay period',
  }),
};
