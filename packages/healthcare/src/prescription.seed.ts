/**
 * Prescription Seed Data
 * Sample prescriptions with medication details, dosages, and pharmacy information
 */

export const PrescriptionSeedData = [
  { patient_name: 'Margaret Sullivan', medication_name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', prescribing_physician: 'Dr. James Carter', start_date: '2025-03-01', end_date: '2025-09-01', refills_remaining: 3, pharmacy: 'CVS Pharmacy - Main St', status: 'active' },
  { patient_name: 'David Ramirez', medication_name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', prescribing_physician: 'Dr. Susan Lee', start_date: '2025-04-15', end_date: '2025-10-15', refills_remaining: 5, pharmacy: 'Walgreens - Oak Ave', status: 'active' },
  { patient_name: 'Priya Sharma', medication_name: 'Amoxicillin', dosage: '250mg', frequency: 'Three times daily', prescribing_physician: 'Dr. Michael Torres', start_date: '2025-06-01', end_date: '2025-06-14', refills_remaining: 0, pharmacy: 'Rite Aid - Elm Blvd', status: 'completed' },
  { patient_name: 'William Chen', medication_name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', prescribing_physician: 'Dr. James Carter', start_date: '2025-01-10', end_date: '2025-07-10', refills_remaining: 2, pharmacy: 'CVS Pharmacy - Main St', status: 'active' },
  { patient_name: 'Jordan Blake', medication_name: 'Sertraline', dosage: '50mg', frequency: 'Once daily in the morning', prescribing_physician: 'Dr. Susan Lee', start_date: '2025-02-20', end_date: '2025-05-20', refills_remaining: 0, pharmacy: 'Walgreens - Oak Ave', status: 'cancelled' },
  { patient_name: 'Margaret Sullivan', medication_name: 'Omeprazole', dosage: '20mg', frequency: 'Once daily before breakfast', prescribing_physician: 'Dr. James Carter', start_date: '2025-05-01', end_date: '2025-08-01', refills_remaining: 1, pharmacy: 'CVS Pharmacy - Main St', status: 'active' },
];

export default PrescriptionSeedData;
