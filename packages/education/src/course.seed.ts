/**
 * Course Seed Data
 * Sample courses across departments with scheduling and enrollment details
 */

export const CourseSeedData = [
  { course_code: 'CS-301', name: 'Data Structures & Algorithms', department: 'Computer Science', credits: 4, instructor: 'Dr. Richard Huang', max_enrollment: 40, current_enrollment: 38, schedule: 'Mon/Wed 10:00-11:30', room: 'Engineering Hall 201', status: 'active' },
  { course_code: 'CS-420', name: 'Machine Learning', department: 'Computer Science', credits: 3, instructor: 'Dr. Richard Huang', max_enrollment: 30, current_enrollment: 28, schedule: 'Tue/Thu 14:00-15:30', room: 'Engineering Hall 305', status: 'active' },
  { course_code: 'CS-350', name: 'Operating Systems', department: 'Computer Science', credits: 3, instructor: 'Dr. Anita Desai', max_enrollment: 35, current_enrollment: 32, schedule: 'Mon/Wed/Fri 09:00-10:00', room: 'Engineering Hall 110', status: 'active' },
  { course_code: 'ME-310', name: 'Thermodynamics II', department: 'Mechanical Engineering', credits: 4, instructor: 'Dr. Patricia Voss', max_enrollment: 35, current_enrollment: 30, schedule: 'Tue/Thu 09:00-10:30', room: 'Science Center 402', status: 'completed' },
  { course_code: 'ME-340', name: 'Fluid Mechanics', department: 'Mechanical Engineering', credits: 3, instructor: 'Dr. Patricia Voss', max_enrollment: 30, current_enrollment: 27, schedule: 'Mon/Wed 13:00-14:30', room: 'Science Center 310', status: 'active' },
  { course_code: 'BIO-405', name: 'Molecular Biology', department: 'Biology', credits: 4, instructor: 'Dr. Karen Mitchell', max_enrollment: 25, current_enrollment: 22, schedule: 'Tue/Thu 11:00-12:30', room: 'Life Sciences 204', status: 'completed' },
  { course_code: 'BUS-210', name: 'Principles of Marketing', department: 'Business Administration', credits: 3, instructor: 'Dr. James Thornton', max_enrollment: 50, current_enrollment: 0, schedule: 'Mon/Wed 15:00-16:30', room: 'Business School 101', status: 'cancelled' },
  { course_code: 'PSY-330', name: 'Abnormal Psychology', department: 'Psychology', credits: 3, instructor: 'Dr. Laura Bennett', max_enrollment: 45, current_enrollment: 42, schedule: 'Tue/Thu 16:00-17:30', room: 'Humanities 220', status: 'active' },
];

export default CourseSeedData;
