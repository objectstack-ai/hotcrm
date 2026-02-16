/**
 * Portfolio Seed Data
 * Sample portfolio allocations across asset classes with rebalancing details
 */

export const PortfolioSeedData = [
  { name: 'Sullivan Growth Equities', account_name: 'Sullivan Family Trust', asset_class: 'equities', allocation_percentage: 55, current_value: 1347500, target_allocation: 60, last_rebalance_date: '2025-04-01', benchmark: 'S&P 500' },
  { name: 'Sullivan Fixed Income', account_name: 'Sullivan Family Trust', asset_class: 'fixed_income', allocation_percentage: 35, current_value: 857500, target_allocation: 30, last_rebalance_date: '2025-04-01', benchmark: 'Bloomberg US Aggregate Bond' },
  { name: 'Sullivan Cash Reserve', account_name: 'Sullivan Family Trust', asset_class: 'cash', allocation_percentage: 10, current_value: 245000, target_allocation: 10, last_rebalance_date: '2025-04-01', benchmark: 'US Treasury 3-Month' },
  { name: 'Ramirez Tech Growth', account_name: 'Ramirez Individual Brokerage', asset_class: 'equities', allocation_percentage: 80, current_value: 308000, target_allocation: 75, last_rebalance_date: '2025-03-15', benchmark: 'NASDAQ Composite' },
  { name: 'Ramirez Alternatives', account_name: 'Ramirez Individual Brokerage', asset_class: 'alternatives', allocation_percentage: 15, current_value: 57750, target_allocation: 20, last_rebalance_date: '2025-03-15', benchmark: 'HFRI Fund Weighted Composite' },
  { name: 'Ramirez Liquidity', account_name: 'Ramirez Individual Brokerage', asset_class: 'cash', allocation_percentage: 5, current_value: 19250, target_allocation: 5, last_rebalance_date: '2025-03-15', benchmark: 'US Treasury 3-Month' },
  { name: 'Chen Income Portfolio', account_name: 'Chen Retirement IRA', asset_class: 'fixed_income', allocation_percentage: 65, current_value: 767000, target_allocation: 65, last_rebalance_date: '2025-05-10', benchmark: 'Bloomberg US Aggregate Bond' },
  { name: 'Chen Dividend Equities', account_name: 'Chen Retirement IRA', asset_class: 'equities', allocation_percentage: 30, current_value: 354000, target_allocation: 30, last_rebalance_date: '2025-05-10', benchmark: 'Dow Jones US Select Dividend' },
];

export default PortfolioSeedData;
