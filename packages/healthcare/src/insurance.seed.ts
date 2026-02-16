/**
 * Insurance Seed Data
 * Sample insurance plans with coverage details and financial limits
 */

export const InsuranceSeedData = [
  { plan_name: 'Blue Advantage PPO', provider: 'Blue Cross Blue Shield', type: 'ppo', group_number: 'GRP-88201', member_id_prefix: 'BCBS', coverage_start: '2025-01-01', coverage_end: '2025-12-31', copay_amount: 30, deductible: 1500, out_of_pocket_max: 6000, is_active: true },
  { plan_name: 'Aetna Select HMO', provider: 'Aetna', type: 'hmo', group_number: 'GRP-44310', member_id_prefix: 'AET', coverage_start: '2025-01-01', coverage_end: '2025-12-31', copay_amount: 20, deductible: 1000, out_of_pocket_max: 4500, is_active: true },
  { plan_name: 'Kaiser Gold EPO', provider: 'Kaiser Permanente', type: 'epo', group_number: 'GRP-72105', member_id_prefix: 'KP', coverage_start: '2025-01-01', coverage_end: '2025-12-31', copay_amount: 25, deductible: 1250, out_of_pocket_max: 5500, is_active: true },
  { plan_name: 'UHC Choice Plus POS', provider: 'UnitedHealthcare', type: 'pos', group_number: 'GRP-59820', member_id_prefix: 'UHC', coverage_start: '2024-07-01', coverage_end: '2025-06-30', copay_amount: 35, deductible: 2000, out_of_pocket_max: 7500, is_active: false },
  { plan_name: 'Cigna Open Access Plus', provider: 'Cigna', type: 'ppo', group_number: 'GRP-63417', member_id_prefix: 'CGN', coverage_start: '2025-01-01', coverage_end: '2025-12-31', copay_amount: 40, deductible: 2500, out_of_pocket_max: 8000, is_active: true },
];

export default InsuranceSeedData;
