/**
 * Enrollment Seed Data
 * Sample course enrollments with grades, credits, and completion statuses
 */

export const EnrollmentSeedData = [
  { student_id: 'Olivia Watson', course_id: 'Data Structures & Algorithms', status: 'completed', grade: 'A', credits: 4 },
  { student_id: 'Olivia Watson', course_id: 'Operating Systems', status: 'enrolled', grade: null, credits: 3 },
  { student_id: 'Ethan Brooks', course_id: 'Thermodynamics II', status: 'completed', grade: 'B+', credits: 4 },
  { student_id: 'Ethan Brooks', course_id: 'Fluid Mechanics', status: 'enrolled', grade: null, credits: 3 },
  { student_id: 'Amara Osei', course_id: 'Molecular Biology', status: 'completed', grade: 'A-', credits: 4 },
  { student_id: 'Lucas Petrov', course_id: 'Principles of Marketing', status: 'withdrawn', grade: 'W', credits: 3 },
  { student_id: 'Mei Lin', course_id: 'Abnormal Psychology', status: 'failed', grade: 'F', credits: 3 },
  { student_id: 'Olivia Watson', course_id: 'Machine Learning', status: 'registered', grade: null, credits: 3 }
];

export default EnrollmentSeedData;
