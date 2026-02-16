/**
 * KYC (Know Your Customer) Seed Data
 * Sample verification records with risk levels and compliance status
 */

export const KycSeedData = [
  { client_name: 'Margaret Sullivan', verification_type: 'identity', status: 'verified', verification_date: '2024-06-15', expiry_date: '2026-06-15', verified_by: 'Caroline Webb', risk_level: 'low', notes: 'Government-issued ID and utility bill verified.' },
  { client_name: 'Margaret Sullivan', verification_type: 'source_of_funds', status: 'verified', verification_date: '2024-06-15', expiry_date: '2026-06-15', verified_by: 'Caroline Webb', risk_level: 'low', notes: 'Inheritance documentation and tax returns reviewed.' },
  { client_name: 'David Ramirez', verification_type: 'identity', status: 'verified', verification_date: '2025-01-10', expiry_date: '2027-01-10', verified_by: 'Nathan Cross', risk_level: 'low', notes: 'Passport and proof of address confirmed.' },
  { client_name: 'David Ramirez', verification_type: 'income', status: 'pending', verification_date: null, expiry_date: null, verified_by: null, risk_level: 'medium', notes: 'Awaiting latest pay stubs and W-2 forms.' },
  { client_name: 'Jordan Blake', verification_type: 'identity', status: 'expired', verification_date: '2022-11-01', expiry_date: '2024-11-01', verified_by: 'Caroline Webb', risk_level: 'high', notes: 'Verification expired. Account frozen pending re-verification.' },
  { client_name: 'Jordan Blake', verification_type: 'source_of_funds', status: 'rejected', verification_date: '2024-10-20', expiry_date: null, verified_by: 'Nathan Cross', risk_level: 'high', notes: 'Insufficient documentation provided for corporate fund origins.' },
  { client_name: 'Priya Sharma', verification_type: 'address', status: 'verified', verification_date: '2025-02-05', expiry_date: '2027-02-05', verified_by: 'Nathan Cross', risk_level: 'low', notes: 'Bank statement with current address verified.' },
  { client_name: 'William Chen', verification_type: 'identity', status: 'verified', verification_date: '2024-09-12', expiry_date: '2026-09-12', verified_by: 'Nathan Cross', risk_level: 'low', notes: 'Driver\'s license and Social Security verification completed.' },
];

export default KycSeedData;
