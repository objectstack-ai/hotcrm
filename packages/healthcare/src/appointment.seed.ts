/**
 * Appointment Seed Data
 * Sample appointments with various types, statuses, and providers
 */

export const AppointmentSeedData = [
  { patient_name: 'Margaret Sullivan', provider_name: 'Dr. James Carter', appointment_date: '2025-07-14', appointment_time: '09:00', duration_minutes: 30, type: 'in_person', status: 'confirmed', reason: 'Annual physical exam', location: 'Main Campus - Room 204' },
  { patient_name: 'David Ramirez', provider_name: 'Dr. Susan Lee', appointment_date: '2025-07-14', appointment_time: '10:30', duration_minutes: 45, type: 'telehealth', status: 'scheduled', reason: 'Follow-up on blood work results', location: 'Virtual - Telehealth Portal' },
  { patient_name: 'Priya Sharma', provider_name: 'Dr. Michael Torres', appointment_date: '2025-07-15', appointment_time: '14:00', duration_minutes: 30, type: 'follow_up', status: 'completed', reason: 'Post-surgery follow-up', location: 'Orthopedics Wing - Room 310' },
  { patient_name: 'William Chen', provider_name: 'Dr. James Carter', appointment_date: '2025-07-16', appointment_time: '11:00', duration_minutes: 60, type: 'in_person', status: 'cancelled', reason: 'Cardiac evaluation', location: 'Cardiology Center - Suite 102' },
  { patient_name: 'Jordan Blake', provider_name: 'Dr. Susan Lee', appointment_date: '2025-07-17', appointment_time: '08:30', duration_minutes: 30, type: 'in_person', status: 'no_show', reason: 'Routine check-up', location: 'Main Campus - Room 118' },
  { patient_name: 'Margaret Sullivan', provider_name: 'Dr. Michael Torres', appointment_date: '2025-07-18', appointment_time: '15:30', duration_minutes: 45, type: 'telehealth', status: 'scheduled', reason: 'Medication review', location: 'Virtual - Telehealth Portal' },
];

export default AppointmentSeedData;
