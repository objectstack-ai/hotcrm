/**
 * Advisory Meeting Seed Data
 * Sample advisory meetings with summaries, action items, and follow-up scheduling
 */

export const AdvisorySeedData = [
  { client_name: 'Margaret Sullivan', advisor_name: 'Caroline Webb', meeting_date: '2025-04-10', meeting_type: 'annual_review', duration_minutes: 90, status: 'completed', summary: 'Reviewed trust performance and estate planning goals. Portfolio up 8.2% YTD. Discussed increasing fixed income allocation ahead of retirement.', next_steps: 'Draft updated estate plan, schedule meeting with tax advisor', follow_up_date: '2025-05-15' },
  { client_name: 'David Ramirez', advisor_name: 'Caroline Webb', meeting_date: '2025-06-05', meeting_type: 'portfolio_review', duration_minutes: 45, status: 'completed', summary: 'Quarterly portfolio review. Tech-heavy allocation outperforming but concentration risk noted. Recommended diversifying into international markets.', next_steps: 'Prepare rebalancing proposal with emerging market ETF options', follow_up_date: '2025-07-01' },
  { client_name: 'Priya Sharma', advisor_name: 'Nathan Cross', meeting_date: '2025-07-15', meeting_type: 'planning', duration_minutes: 60, status: 'scheduled', summary: null, next_steps: null, follow_up_date: null },
  { client_name: 'William Chen', advisor_name: 'Nathan Cross', meeting_date: '2025-05-20', meeting_type: 'annual_review', duration_minutes: 75, status: 'completed', summary: 'Retirement readiness assessment. On track for target retirement at age 62. Discussed Social Security timing strategy and Roth conversion ladder.', next_steps: 'Model Roth conversion scenarios, update retirement projection', follow_up_date: '2025-08-20' },
  { client_name: 'Jordan Blake', advisor_name: 'Caroline Webb', meeting_date: '2025-06-30', meeting_type: 'ad_hoc', duration_minutes: 30, status: 'cancelled', summary: null, next_steps: 'Reschedule after KYC re-verification is completed', follow_up_date: '2025-08-01' },
  { client_name: 'Margaret Sullivan', advisor_name: 'Caroline Webb', meeting_date: '2025-07-20', meeting_type: 'portfolio_review', duration_minutes: 60, status: 'scheduled', summary: null, next_steps: null, follow_up_date: null },
];

export default AdvisorySeedData;
