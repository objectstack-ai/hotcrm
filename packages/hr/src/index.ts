/**
 * @hotcrm/hr - Human Capital Management Module
 * 
 * This package contains all HR/HCM-related business objects for managing the complete employee lifecycle:
 * 
 * **Organizational Structure:**
 * - Department: Organizational units and hierarchy
 * - Position: Job positions and roles
 * - Employee: Employee master data
 * 
 * **Talent Acquisition:**
 * - Recruitment: Hiring pipeline and job requisitions
 * - Candidate: Job applicants
 * - Application: Job applications
 * - Interview: Interview scheduling and feedback
 * - Offer: Job offers
 * - Onboarding: New employee onboarding
 * 
 * **Performance Management:**
 * - PerformanceReview: Performance evaluations
 * - Goal: OKRs and personal goals
 * 
 * **Learning & Development:**
 * - Training: Training programs
 * - Certification: Professional certifications
 * 
 * **Time & Attendance:**
 * - TimeOff: Leave/time-off management
 * - Attendance: Time tracking and attendance
 * 
 * **Compensation:**
 * - Payroll: Payroll and compensation tracking
 */

// Export organizational objects
export { Department } from './department.object.js';
export { Position } from './position.object.js';
export { Employee } from './employee.object.js';

// Export recruitment objects
export { Recruitment } from './recruitment.object.js';
export { Candidate } from './candidate.object.js';
export { Application } from './application.object.js';
export { Interview } from './interview.object.js';
export { Offer } from './offer.object.js';
export { Onboarding } from './onboarding.object.js';

// Export performance management objects
export { PerformanceReview } from './performance_review.object.js';
export { Goal } from './goal.object.js';

// Export learning & development objects
export { Training } from './training.object.js';
export { Certification } from './certification.object.js';

// Export time & attendance objects
export { TimeOff } from './time_off.object.js';
export { Attendance } from './attendance.object.js';

// Export payroll object
export { Payroll } from './payroll.object.js';

// Export AI Agents
export { RecruitmentAssistantAgent } from './recruitment_assistant.agent.js';
export { PerformanceCoachAgent } from './performance_coach.agent.js';

// Export workflows
export { HRWorkflows } from './hr.workflow.js';

// Export plugin definition
export { HRPlugin } from './plugin.js';

// Export translations
export { HRTranslations } from './translations/index.js';
