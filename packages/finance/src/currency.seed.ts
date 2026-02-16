/**
 * Currency Seed Data
 * Major world currencies with approximate exchange rates relative to USD.
 * These rates are initial seed values and should be updated via an exchange rate service in production.
 */

export const CurrencySeedData = [
  { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 1.0, is_active: true },
  { code: 'EUR', name: 'Euro', symbol: '€', exchange_rate: 0.92, is_active: true },
  { code: 'GBP', name: 'British Pound', symbol: '£', exchange_rate: 0.79, is_active: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', exchange_rate: 149.50, is_active: true },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', exchange_rate: 7.24, is_active: true },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', exchange_rate: 1.36, is_active: true },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', exchange_rate: 1.53, is_active: true },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', exchange_rate: 0.88, is_active: true },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', exchange_rate: 83.12, is_active: true },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', exchange_rate: 4.97, is_active: true },
];

export default CurrencySeedData;
