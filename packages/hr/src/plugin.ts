/**
 * @hotcrm/hr - HR/HCM Plugin Definition
 * 
 * This plugin provides comprehensive Human Capital Management functionality including:
 * - Organizational Structure (Departments, Positions, Employees)
 * - Talent Acquisition (Recruitment, Candidates, Applications, Interviews, Offers, Onboarding)
 * - Performance Management (Performance Reviews, Goals/OKRs)
 * - Learning & Development (Training, Certifications)
 * - Time & Attendance (Time Off, Attendance)
 * - Compensation (Payroll)
 */

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import organizational objects
import { Department } from './department.object';
import { Position } from './position.object';
import { Employee } from './employee.object';

// Import recruitment objects
import { Recruitment } from './recruitment.object';
import { Candidate } from './candidate.object';
import { Application } from './application.object';
import { Interview } from './interview.object';
import { Offer } from './offer.object';
import { Onboarding } from './onboarding.object';

// Import performance management objects
import { PerformanceReview } from './performance_review.object';
import { Goal } from './goal.object';

// Import learning & development objects
import { Training } from './training.object';
import { Certification } from './certification.object';

// Import time & attendance objects
import { TimeOff } from './time_off.object';
import { Attendance } from './attendance.object';

// Import payroll object
import { Payroll } from './payroll.object';

// Import hooks
import { CandidateScoringTrigger, CandidateStatusChangeTrigger } from './hooks/candidate.hook';
import { EmployeeOnboardingTrigger, EmployeeStatusChangeTrigger, EmployeeDataValidationTrigger } from './hooks/employee.hook';
import { OfferCreationTrigger, OfferStatusChangeTrigger, OfferApprovalTrigger } from './hooks/offer.hook';
import { PerformanceReviewRatingTrigger, PerformanceReviewWorkflowTrigger } from './hooks/performance_review.hook';
import { ApplicationStatusWorkflowTrigger, ApplicationScreeningTrigger } from './hooks/application.hook';
import { InterviewSchedulingTrigger, InterviewFeedbackTrigger } from './hooks/interview.hook';
import { OnboardingChecklistTrigger, OnboardingProgressTrigger } from './hooks/onboarding.hook';
import { TimeOffBalanceValidationTrigger, TimeOffApprovalTrigger } from './hooks/time_off.hook';
import { RecruitmentPipelineValidationTrigger, RecruitmentMetricsTrigger } from './hooks/recruitment.hook';
import { PayrollCalculationValidationTrigger, PayrollApprovalTrigger } from './hooks/payroll.hook';
import { AttendanceValidationTrigger, AttendanceDuplicateCheckTrigger } from './hooks/attendance.hook';
import { GoalProgressTrackingTrigger, GoalAlignmentValidationTrigger } from './hooks/goal.hook';
import { CertificationExpirationValidationTrigger, CertificationRenewalReminderTrigger } from './hooks/certification.hook';
import { DepartmentManagerValidationTrigger, DepartmentHeadcountTrackingTrigger } from './hooks/department.hook';
import { PositionStatusChangeValidationTrigger, PositionVacancyTrackingTrigger } from './hooks/position.hook';
import { TrainingEnrollmentValidationTrigger, TrainingCompletionTrackingTrigger } from './hooks/training.hook';

// Import actions
import CandidateAIAction from './actions/candidate_ai.action';
import EmployeeAIAction from './actions/employee_ai.action';
import PerformanceAIAction from './actions/performance_ai.action';
import HRAnalyticsAction from './actions/hr_analytics.action';
import { HRWorkflows } from './hr.workflow';

/**
 * HR Plugin Definition
 * 
 * Exports all HR/HCM-related business objects to be registered with the ObjectStack runtime
 */
export const HRPlugin = {
  name: 'hr',
  label: 'Human Capital Management',
  version: '1.0.0',
  description: 'Complete HR/HCM solution - Employee lifecycle management from recruitment to retirement',
  
  // Plugin dependencies
  dependencies: [],
  
  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },
  
  // Actions provided by this plugin
  actions: {
    candidate_ai: CandidateAIAction,
    employee_ai: EmployeeAIAction,
    performance_ai: PerformanceAIAction,
    hr_analytics: HRAnalyticsAction,
  },

  // Triggers/Hooks
  triggers: {
    candidate_scoring: CandidateScoringTrigger,
    candidate_status_change: CandidateStatusChangeTrigger,
    employee_onboarding: EmployeeOnboardingTrigger,
    employee_status_change: EmployeeStatusChangeTrigger,
    employee_data_validation: EmployeeDataValidationTrigger,
    offer_creation: OfferCreationTrigger,
    offer_status_change: OfferStatusChangeTrigger,
    offer_approval: OfferApprovalTrigger,
    performance_review_rating: PerformanceReviewRatingTrigger,
    performance_review_workflow: PerformanceReviewWorkflowTrigger,
    application_status_workflow: ApplicationStatusWorkflowTrigger,
    application_screening: ApplicationScreeningTrigger,
    interview_scheduling: InterviewSchedulingTrigger,
    interview_feedback: InterviewFeedbackTrigger,
    onboarding_checklist: OnboardingChecklistTrigger,
    onboarding_progress: OnboardingProgressTrigger,
    time_off_balance_validation: TimeOffBalanceValidationTrigger,
    time_off_approval: TimeOffApprovalTrigger,
    recruitment_pipeline_validation: RecruitmentPipelineValidationTrigger,
    recruitment_metrics: RecruitmentMetricsTrigger,
    payroll_calculation_validation: PayrollCalculationValidationTrigger,
    payroll_approval: PayrollApprovalTrigger,
    attendance_validation: AttendanceValidationTrigger,
    attendance_duplicate_check: AttendanceDuplicateCheckTrigger,
    goal_progress_tracking: GoalProgressTrackingTrigger,
    goal_alignment_validation: GoalAlignmentValidationTrigger,
    certification_expiration_validation: CertificationExpirationValidationTrigger,
    certification_renewal_reminder: CertificationRenewalReminderTrigger,
    department_manager_validation: DepartmentManagerValidationTrigger,
    department_headcount_tracking: DepartmentHeadcountTrackingTrigger,
    position_status_change_validation: PositionStatusChangeValidationTrigger,
    position_vacancy_tracking: PositionVacancyTrackingTrigger,
    training_enrollment_validation: TrainingEnrollmentValidationTrigger,
    training_completion_tracking: TrainingCompletionTrackingTrigger,
  },

  // Workflows
  workflows: {
    onboarding_automation: HRWorkflows.onboardingAutomation,
    time_off_approval: HRWorkflows.timeOffApproval,
    time_off_auto_approval: HRWorkflows.timeOffAutoApproval,
    performance_review_cycle: HRWorkflows.performanceReviewCycle,
    performance_review_reminder: HRWorkflows.performanceReviewReminder,
  },

  // Business objects provided by this plugin
  objects: {
    // Organizational structure
    department: Department,
    position: Position,
    employee: Employee,
    
    // Talent acquisition
    recruitment: Recruitment,
    candidate: Candidate,
    application: Application,
    interview: Interview,
    offer: Offer,
    onboarding: Onboarding,
    
    // Performance management
    performance_review: PerformanceReview,
    goal: Goal,
    
    // Learning & development
    training: Training,
    certification: Certification,
    
    // Time & attendance
    time_off: TimeOff,
    attendance: Attendance,
    
    // Compensation
    payroll: Payroll,
  },
  
  // Navigation structure for this plugin
  navigation: [
    {
      type: 'group',
      label: 'Organization',
      children: [
        { type: 'object', object: 'employee' },
        { type: 'object', object: 'department' },
        { type: 'object', object: 'position' },
      ]
    },
    {
      type: 'group',
      label: 'Talent Acquisition',
      children: [
        { type: 'object', object: 'recruitment' },
        { type: 'object', object: 'candidate' },
        { type: 'object', object: 'application' },
        { type: 'object', object: 'interview' },
        { type: 'object', object: 'offer' },
        { type: 'object', object: 'onboarding' },
      ]
    },
    {
      type: 'group',
      label: 'Performance & Development',
      children: [
        { type: 'object', object: 'performance_review' },
        { type: 'object', object: 'goal' },
        { type: 'object', object: 'training' },
        { type: 'object', object: 'certification' },
      ]
    },
    {
      type: 'group',
      label: 'Time & Payroll',
      children: [
        { type: 'object', object: 'time_off' },
        { type: 'object', object: 'attendance' },
        { type: 'object', object: 'payroll' },
      ]
    }
  ]
};

/** Spec-validated plugin metadata */
export const HRPluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'hr',
  label: 'Human Capital Management',
  version: '1.0.0',
  description: 'Complete HR/HCM solution - Employee lifecycle management from recruitment to retirement',
});
