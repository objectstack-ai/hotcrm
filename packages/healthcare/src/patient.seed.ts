/**
 * Patient Seed Data
 * Sample patients with demographics, medical details, and emergency contacts
 */

export const PatientSeedData = [
  { first_name: 'Margaret', last_name: 'Sullivan', date_of_birth: '1958-04-12', gender: 'female', email: 'margaret.sullivan@example.com', phone: '+1-617-555-0101', medical_record_number: 'MRN-100201', insurance_provider: 'Blue Cross Blue Shield', primary_physician: 'Dr. James Carter', allergies: 'Penicillin, Sulfa', status: 'active', emergency_contact_name: 'Robert Sullivan', emergency_contact_phone: '+1-617-555-0102' },
  { first_name: 'David', last_name: 'Ramirez', date_of_birth: '1985-09-23', gender: 'male', email: 'david.ramirez@example.com', phone: '+1-312-555-0201', medical_record_number: 'MRN-100302', insurance_provider: 'Aetna', primary_physician: 'Dr. Susan Lee', allergies: 'None', status: 'active', emergency_contact_name: 'Elena Ramirez', emergency_contact_phone: '+1-312-555-0202' },
  { first_name: 'Priya', last_name: 'Sharma', date_of_birth: '1992-01-07', gender: 'female', email: 'priya.sharma@example.com', phone: '+1-415-555-0301', medical_record_number: 'MRN-100403', insurance_provider: 'Kaiser Permanente', primary_physician: 'Dr. Michael Torres', allergies: 'Latex, Ibuprofen', status: 'active', emergency_contact_name: 'Anil Sharma', emergency_contact_phone: '+1-415-555-0302' },
  { first_name: 'William', last_name: 'Chen', date_of_birth: '1971-11-30', gender: 'male', email: 'william.chen@example.com', phone: '+1-206-555-0401', medical_record_number: 'MRN-100504', insurance_provider: 'UnitedHealthcare', primary_physician: 'Dr. James Carter', allergies: 'Aspirin', status: 'discharged', emergency_contact_name: 'Linda Chen', emergency_contact_phone: '+1-206-555-0402' },
  { first_name: 'Jordan', last_name: 'Blake', date_of_birth: '2000-06-15', gender: 'other', email: 'jordan.blake@example.com', phone: '+1-503-555-0501', medical_record_number: 'MRN-100605', insurance_provider: 'Cigna', primary_physician: 'Dr. Susan Lee', allergies: 'None', status: 'inactive', emergency_contact_name: 'Teresa Blake', emergency_contact_phone: '+1-503-555-0502' },
];

export default PatientSeedData;
