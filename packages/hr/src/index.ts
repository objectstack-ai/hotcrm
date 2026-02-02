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
export { default as Department } from './department.object';
export { default as Position } from './position.object';
export { default as Employee } from './employee.object';

// Export recruitment objects
export { default as Recruitment } from './recruitment.object';
export { default as Candidate } from './candidate.object';
export { default as Application } from './application.object';
export { default as Interview } from './interview.object';
export { default as Offer } from './offer.object';
export { default as Onboarding } from './onboarding.object';

// Export performance management objects
export { default as PerformanceReview } from './performance_review.object';
export { default as Goal } from './goal.object';

// Export learning & development objects
export { default as Training } from './training.object';
export { default as Certification } from './certification.object';

// Export time & attendance objects
export { default as TimeOff } from './time_off.object';
export { default as Attendance } from './attendance.object';

// Export payroll object
export { default as Payroll } from './payroll.object';

// Export plugin definition
export { default as HRPlugin } from './plugin';
