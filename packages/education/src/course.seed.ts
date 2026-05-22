/**
 * Course Seed Data
 * Sample courses across departments with scheduling and enrollment details
 */

export const CourseSeedData = [
  { course_code: 'CS-301', name: 'Data Structures & Algorithms', department: 'Computer Science', credits: 4, schedule: 'Mon/Wed 10:00-11:30', status: 'active' },
  { course_code: 'CS-420', name: 'Machine Learning', department: 'Computer Science', credits: 3, schedule: 'Tue/Thu 14:00-15:30', status: 'active' },
  { course_code: 'CS-350', name: 'Operating Systems', department: 'Computer Science', credits: 3, schedule: 'Mon/Wed/Fri 09:00-10:00', status: 'active' },
  { course_code: 'ME-310', name: 'Thermodynamics II', department: 'Mechanical Engineering', credits: 4, schedule: 'Tue/Thu 09:00-10:30', status: 'completed' },
  { course_code: 'ME-340', name: 'Fluid Mechanics', department: 'Mechanical Engineering', credits: 3, schedule: 'Mon/Wed 13:00-14:30', status: 'active' },
  { course_code: 'BIO-405', name: 'Molecular Biology', department: 'Biology', credits: 4, schedule: 'Tue/Thu 11:00-12:30', status: 'completed' },
  { course_code: 'BUS-210', name: 'Principles of Marketing', department: 'Business Administration', credits: 3, schedule: 'Mon/Wed 15:00-16:30', status: 'cancelled' },
  { course_code: 'PSY-330', name: 'Abnormal Psychology', department: 'Psychology', credits: 3, schedule: 'Tue/Thu 16:00-17:30', status: 'active' }
];

export default CourseSeedData;
