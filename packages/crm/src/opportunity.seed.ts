/**
 * Opportunity Seed Data
 * Sample sales opportunities across pipeline stages
 */

export const OpportunitySeedData = [
  { name: 'Acme Corp - Enterprise Platform', account_id: 'Acme Corporation', stage: 'negotiation', amount: 250000, close_date: '2025-09-15', probability: 75, type: 'new_business', next_step: 'Final contract review with legal' },
  { name: 'GlobalTech - Cloud Migration', account_id: 'GlobalTech Solutions', stage: 'closed_won', amount: 480000, close_date: '2025-06-30', probability: 100, type: 'new_business', next_step: 'Kickoff meeting scheduled' },
  { name: 'Summit Financial - Annual Renewal', account_id: 'Summit Financial Group', stage: 'value_proposition', amount: 320000, close_date: '2025-11-01', probability: 60, type: 'renewal', next_step: 'Present ROI analysis to CFO' },
  { name: 'MedVita - Patient Portal', account_id: 'MedVita Health Systems', stage: 'qualification', amount: 175000, close_date: '2025-12-15', probability: 30, type: 'new_business', next_step: 'Schedule technical deep dive' },
  { name: 'EduPrime - LMS Integration', account_id: 'EduPrime Learning', stage: 'prospecting', amount: 95000, close_date: '2026-02-28', probability: 15, type: 'new_business', next_step: 'Send introductory proposal' },
  { name: 'GreenLeaf - Supply Chain Suite', account_id: 'GreenLeaf Manufacturing', stage: 'needs_analysis', amount: 550000, close_date: '2025-10-31', probability: 45, type: 'new_business', next_step: 'Conduct requirements workshop' },
  { name: 'BrightPath - Content Platform', account_id: 'BrightPath Media', stage: 'closed_won', amount: 120000, close_date: '2025-05-15', probability: 100, type: 'new_business', next_step: 'Implementation in progress' },
  { name: 'NovaStar - Field Operations', account_id: 'NovaStar Energy', stage: 'negotiation', amount: 890000, close_date: '2025-08-31', probability: 80, type: 'new_business', next_step: 'Finalize pricing and SLA terms' },
  { name: 'Pacific Retail - POS Upgrade', account_id: 'Pacific Retail Holdings', stage: 'value_proposition', amount: 210000, close_date: '2025-11-30', probability: 50, type: 'new_business', next_step: 'Demo at flagship store' },
  { name: 'Horizon RE - Property Management', account_id: 'Horizon Real Estate Group', stage: 'qualification', amount: 165000, close_date: '2026-01-15', probability: 25, type: 'new_business', next_step: 'Gather detailed requirements' },
  { name: 'Acme Corp - Support Expansion', account_id: 'Acme Corporation', stage: 'closed_won', amount: 85000, close_date: '2025-07-01', probability: 100, type: 'existing_business', next_step: 'Onboard additional support agents' },
  { name: 'GlobalTech - Security Add-on', account_id: 'GlobalTech Solutions', stage: 'needs_analysis', amount: 145000, close_date: '2025-10-15', probability: 40, type: 'existing_business', next_step: 'Security audit with IT team' },
  { name: 'Summit Financial - Data Analytics', account_id: 'Summit Financial Group', stage: 'prospecting', amount: 275000, close_date: '2026-03-31', probability: 10, type: 'new_business', next_step: 'Initial discovery call' },
  { name: 'NovaStar - Annual Renewal', account_id: 'NovaStar Energy', stage: 'value_proposition', amount: 420000, close_date: '2025-12-31', probability: 65, type: 'renewal', next_step: 'Review usage metrics and propose tier upgrade' },
  { name: 'GreenLeaf - Quality Module', account_id: 'GreenLeaf Manufacturing', stage: 'closed_lost', amount: 190000, close_date: '2025-04-30', probability: 0, type: 'existing_business', next_step: 'None - lost to competitor' }
];

export default OpportunitySeedData;
