/**
 * Scholarship Seed Data
 * Sample scholarships with eligibility criteria, award amounts, and recipients
 */

export const ScholarshipSeedData = [
  { name: 'Dean\'s Excellence Award', type: 'merit', amount: 10000, eligibility_criteria: 'GPA 3.8 or above, full-time enrollment', status: 'awarded', academic_year: '2024-2025', recipient_name: 'Amara Osei', department: 'Biology' },
  { name: 'Future Innovators Grant', type: 'departmental', amount: 7500, eligibility_criteria: 'Junior or Senior in Computer Science, research project required', status: 'awarded', academic_year: '2024-2025', recipient_name: 'Olivia Watson', department: 'Computer Science' },
  { name: 'Access & Opportunity Fund', type: 'need_based', amount: 5000, eligibility_criteria: 'Demonstrated financial need, minimum GPA 2.5', status: 'open', academic_year: '2025-2026', recipient_name: null, department: null },
  { name: 'Varsity Achievement Scholarship', type: 'athletic', amount: 15000, eligibility_criteria: 'Varsity athlete, minimum GPA 3.0', status: 'closed', academic_year: '2023-2024', recipient_name: 'Ethan Brooks', department: 'Mechanical Engineering' },
  { name: 'Engineering Leadership Award', type: 'departmental', amount: 8000, eligibility_criteria: 'Engineering major, demonstrated leadership in student organizations', status: 'open', academic_year: '2025-2026', recipient_name: null, department: 'Mechanical Engineering' },
];

export default ScholarshipSeedData;
