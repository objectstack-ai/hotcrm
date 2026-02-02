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

// Import organizational objects
import Department from './department.object';
import Position from './position.object';
import Employee from './employee.object';

// Import recruitment objects
import Recruitment from './recruitment.object';
import Candidate from './candidate.object';
import Application from './application.object';
import Interview from './interview.object';
import Offer from './offer.object';
import Onboarding from './onboarding.object';

// Import performance management objects
import PerformanceReview from './performance_review.object';
import Goal from './goal.object';

// Import learning & development objects
import Training from './training.object';
import Certification from './certification.object';

// Import time & attendance objects
import TimeOff from './time_off.object';
import Attendance from './attendance.object';

// Import payroll object
import Payroll from './payroll.object';

/**
 * HR Plugin Definition
 * 
 * Exports all HR/HCM-related business objects to be registered with the ObjectStack runtime
 */
export const HRPlugin: any = {
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

export default HRPlugin;
