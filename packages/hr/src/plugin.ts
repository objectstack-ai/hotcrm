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

// Import translations
import { HRTranslations } from './translations/index.js';

// Import organizational objects
import { Department } from './department.object.js';
import { Position } from './position.object.js';
import { Employee } from './employee.object.js';

// Import recruitment objects
import { Recruitment } from './recruitment.object.js';
import { Candidate } from './candidate.object.js';
import { Application } from './application.object.js';
import { Interview } from './interview.object.js';
import { Offer } from './offer.object.js';
import { Onboarding } from './onboarding.object.js';

// Import performance management objects
import { PerformanceReview } from './performance_review.object.js';
import { Goal } from './goal.object.js';

// Import learning & development objects
import { Training } from './training.object.js';
import { Certification } from './certification.object.js';

// Import time & attendance objects
import { TimeOff } from './time_off.object.js';
import { Attendance } from './attendance.object.js';

// Import payroll object
import { Payroll } from './payroll.object.js';

// Import benefits & compensation objects
import { Benefit } from './benefit.object.js';
import { CompensationPlan } from './compensation_plan.object.js';

// Import hooks
import { CandidateScoringTrigger, CandidateStatusChangeTrigger } from './hooks/candidate.hook.js';
import { EmployeeOnboardingTrigger, EmployeeStatusChangeTrigger, EmployeeDataValidationTrigger } from './hooks/employee.hook.js';
import { OfferCreationTrigger, OfferStatusChangeTrigger, OfferApprovalTrigger } from './hooks/offer.hook.js';
import { PerformanceReviewRatingTrigger, PerformanceReviewWorkflowTrigger } from './hooks/performance_review.hook.js';
import { ApplicationStatusWorkflowTrigger, ApplicationScreeningTrigger } from './hooks/application.hook.js';
import { InterviewSchedulingTrigger, InterviewFeedbackTrigger } from './hooks/interview.hook.js';
import { OnboardingChecklistTrigger, OnboardingProgressTrigger } from './hooks/onboarding.hook.js';
import { TimeOffBalanceValidationTrigger, TimeOffApprovalTrigger } from './hooks/time_off.hook.js';
import { RecruitmentPipelineValidationTrigger, RecruitmentMetricsTrigger } from './hooks/recruitment.hook.js';
import { PayrollCalculationValidationTrigger, PayrollApprovalTrigger } from './hooks/payroll.hook.js';
import { AttendanceValidationTrigger, AttendanceDuplicateCheckTrigger } from './hooks/attendance.hook.js';
import { GoalProgressTrackingTrigger, GoalAlignmentValidationTrigger } from './hooks/goal.hook.js';
import { CertificationExpirationValidationTrigger, CertificationRenewalReminderTrigger } from './hooks/certification.hook.js';
import { DepartmentManagerValidationTrigger, DepartmentHeadcountTrackingTrigger } from './hooks/department.hook.js';
import { PositionStatusChangeValidationTrigger, PositionVacancyTrackingTrigger } from './hooks/position.hook.js';
import { TrainingEnrollmentValidationTrigger, TrainingCompletionTrackingTrigger } from './hooks/training.hook.js';
import { BenefitEnrollmentValidationTrigger, BenefitExpirationCheckTrigger } from './hooks/benefit.hook.js';
import { CompensationPlanValidationTrigger, CompensationPlanApprovalTrigger } from './hooks/compensation_plan.hook.js';

// Import datasets
import { DepartmentDataset } from './department.dataset.js';
import { EmployeeDataset } from './employee.dataset.js';
import { JobPostingDataset } from './job_posting.dataset.js';

// Import actions
import CandidateAIAction from './actions/candidate_ai.action.js';
import EmployeeAIAction from './actions/employee_ai.action.js';
import PerformanceAIAction from './actions/performance_ai.action.js';
import HRAnalyticsAction from './actions/hr_analytics.action.js';
import { HRWorkflows } from './hr.workflow.js';

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
    benefit_enrollment_validation: BenefitEnrollmentValidationTrigger,
    benefit_expiration_check: BenefitExpirationCheckTrigger,
    compensation_plan_validation: CompensationPlanValidationTrigger,
    compensation_plan_approval: CompensationPlanApprovalTrigger,
  },

  // Workflows
  workflows: {
    onboarding_automation: HRWorkflows.onboardingAutomation,
    time_off_approval: HRWorkflows.timeOffApproval,
    time_off_auto_approval: HRWorkflows.timeOffAutoApproval,
    performance_review_cycle: HRWorkflows.performanceReviewCycle,
    performance_review_reminder: HRWorkflows.performanceReviewReminder,
  },

  // Seed data (DatasetSchema)
  data: [
    DepartmentDataset,
    EmployeeDataset,
    JobPostingDataset,
  ],

  // Translations (i18n)
  translations: [HRTranslations],

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

    // Benefits & Compensation
    benefit: Benefit,
    compensation_plan: CompensationPlan,
  },
  
  // Apps provided by this plugin
  apps: [
    {
      name: 'hr',
      label: 'Human Capital Management',
      navigation: [
        {
          id: 'organization',
          type: 'group',
          label: 'Organization',
          children: [
            { id: 'employee', label: 'Employee', type: 'object', objectName: 'employee' },
            { id: 'department', label: 'Department', type: 'object', objectName: 'department' },
            { id: 'position', label: 'Position', type: 'object', objectName: 'position' },
          ]
        },
        {
          id: 'talent_acquisition',
          type: 'group',
          label: 'Talent Acquisition',
          children: [
            { id: 'recruitment', label: 'Recruitment', type: 'object', objectName: 'recruitment' },
            { id: 'candidate', label: 'Candidate', type: 'object', objectName: 'candidate' },
            { id: 'application', label: 'Application', type: 'object', objectName: 'application' },
            { id: 'interview', label: 'Interview', type: 'object', objectName: 'interview' },
            { id: 'offer', label: 'Offer', type: 'object', objectName: 'offer' },
            { id: 'onboarding', label: 'Onboarding', type: 'object', objectName: 'onboarding' },
          ]
        },
        {
          id: 'performance_and_development',
          type: 'group',
          label: 'Performance & Development',
          children: [
            { id: 'performance_review', label: 'Performance Review', type: 'object', objectName: 'performance_review' },
            { id: 'goal', label: 'Goal', type: 'object', objectName: 'goal' },
            { id: 'training', label: 'Training', type: 'object', objectName: 'training' },
            { id: 'certification', label: 'Certification', type: 'object', objectName: 'certification' },
          ]
        },
        {
          id: 'time_and_payroll',
          type: 'group',
          label: 'Time & Payroll',
          children: [
            { id: 'time_off', label: 'Time Off', type: 'object', objectName: 'time_off' },
            { id: 'attendance', label: 'Attendance', type: 'object', objectName: 'attendance' },
            { id: 'payroll', label: 'Payroll', type: 'object', objectName: 'payroll' },
          ]
        },
        {
          id: 'benefits_and_compensation',
          type: 'group',
          label: 'Benefits & Compensation',
          children: [
            { id: 'benefit', label: 'Benefit', type: 'object', objectName: 'benefit' },
            { id: 'compensation_plan', label: 'Compensation Plan', type: 'object', objectName: 'compensation_plan' },
          ]
        },
        {
          id: 'views_and_dashboards',
          type: 'group',
          label: 'Views & Dashboards',
          children: [
            { id: 'recruitment_kanban', label: 'Recruitment Pipeline', type: 'object', objectName: 'candidate', viewName: 'recruitment_kanban' },
            { id: 'hr_dashboard', label: 'HR Dashboard', type: 'dashboard', dashboardName: 'hr_dashboard' },
          ]
        }
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
