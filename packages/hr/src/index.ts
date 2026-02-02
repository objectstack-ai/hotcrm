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
export { Department } from './department.object';
export { Position } from './position.object';
export { Employee } from './employee.object';

// Export recruitment objects
export { Recruitment } from './recruitment.object';
export { Candidate } from './candidate.object';
export { Application } from './application.object';
export { Interview } from './interview.object';
export { Offer } from './offer.object';
export { Onboarding } from './onboarding.object';

// Export performance management objects
export { PerformanceReview } from './performance_review.object';
export { Goal } from './goal.object';

// Export learning & development objects
export { Training } from './training.object';
export { Certification } from './certification.object';

// Export time & attendance objects
export { TimeOff } from './time_off.object';
export { Attendance } from './attendance.object';

// Export payroll object
export { Payroll } from './payroll.object';

// Export plugin definition
export { HRPlugin } from './plugin';
