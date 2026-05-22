/**
 * Prescription Seed Data
 * Sample prescriptions with medication details, dosages, and pharmacy information
 */

export const PrescriptionSeedData = [
  { patient_id: 'Margaret Sullivan', medication: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', start_date: '2025-03-01', end_date: '2025-09-01', refills_remaining: 3, pharmacy: 'CVS Pharmacy - Main St', status: 'active' },
  { patient_id: 'David Ramirez', medication: 'Metformin', dosage: '500mg', frequency: 'Twice daily', start_date: '2025-04-15', end_date: '2025-10-15', refills_remaining: 5, pharmacy: 'Walgreens - Oak Ave', status: 'active' },
  { patient_id: 'Priya Sharma', medication: 'Amoxicillin', dosage: '250mg', frequency: 'Three times daily', start_date: '2025-06-01', end_date: '2025-06-14', refills_remaining: 0, pharmacy: 'Rite Aid - Elm Blvd', status: 'completed' },
  { patient_id: 'William Chen', medication: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', start_date: '2025-01-10', end_date: '2025-07-10', refills_remaining: 2, pharmacy: 'CVS Pharmacy - Main St', status: 'active' },
  { patient_id: 'Jordan Blake', medication: 'Sertraline', dosage: '50mg', frequency: 'Once daily in the morning', start_date: '2025-02-20', end_date: '2025-05-20', refills_remaining: 0, pharmacy: 'Walgreens - Oak Ave', status: 'cancelled' },
  { patient_id: 'Margaret Sullivan', medication: 'Omeprazole', dosage: '20mg', frequency: 'Once daily before breakfast', start_date: '2025-05-01', end_date: '2025-08-01', refills_remaining: 1, pharmacy: 'CVS Pharmacy - Main St', status: 'active' }
];

export default PrescriptionSeedData;
