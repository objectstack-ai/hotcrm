/**
 * KYC (Know Your Customer) Seed Data
 * Sample verification records with risk levels and compliance status
 */

export const KycSeedData = [
  { expiry_date: '2026-06-15', verified_by: 'Caroline Webb', risk_level: 'low', notes: 'Government-issued ID and utility bill verified.' },
  { expiry_date: '2026-06-15', verified_by: 'Caroline Webb', risk_level: 'low', notes: 'Inheritance documentation and tax returns reviewed.' },
  { expiry_date: '2027-01-10', verified_by: 'Nathan Cross', risk_level: 'low', notes: 'Passport and proof of address confirmed.' },
  { expiry_date: null, verified_by: null, risk_level: 'medium', notes: 'Awaiting latest pay stubs and W-2 forms.' },
  { expiry_date: '2024-11-01', verified_by: 'Caroline Webb', risk_level: 'high', notes: 'Verification expired. Account frozen pending re-verification.' },
  { expiry_date: null, verified_by: 'Nathan Cross', risk_level: 'high', notes: 'Insufficient documentation provided for corporate fund origins.' },
  { expiry_date: '2027-02-05', verified_by: 'Nathan Cross', risk_level: 'low', notes: 'Bank statement with current address verified.' },
  { expiry_date: '2026-09-12', verified_by: 'Nathan Cross', risk_level: 'low', notes: 'Driver\'s license and Social Security verification completed.' }
];

export default KycSeedData;
