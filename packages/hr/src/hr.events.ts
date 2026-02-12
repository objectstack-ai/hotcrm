/**
 * HR Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to HR domain changes.
 */

export const HREvents = {
  employeeOnboarded: {
    name: 'hr.employee.onboarded',
    type: 'domain' as const,
    description: 'Fired when a new employee completes onboarding',
  },
  employeeTerminated: {
    name: 'hr.employee.terminated',
    type: 'domain' as const,
    description: 'Fired when an employee is terminated',
  },
  candidateHired: {
    name: 'hr.candidate.hired',
    type: 'domain' as const,
    description: 'Fired when a candidate is hired and converted to employee',
  },
  offerAccepted: {
    name: 'hr.offer.accepted',
    type: 'domain' as const,
    description: 'Fired when an offer letter is accepted by a candidate',
  },
  performanceReviewCompleted: {
    name: 'hr.performance_review.completed',
    type: 'domain' as const,
    description: 'Fired when a performance review cycle is completed',
  },
  timeOffApproved: {
    name: 'hr.time_off.approved',
    type: 'domain' as const,
    description: 'Fired when a time-off request is approved',
  },
  payrollProcessed: {
    name: 'hr.payroll.processed',
    type: 'domain' as const,
    description: 'Fired when payroll is processed for a pay period',
  },
};
