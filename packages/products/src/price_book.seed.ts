/**
 * Price Book Seed Data
 * Standard and promotional price book definitions
 */

export const PriceBookSeedData = [
  { name: 'Standard Price Book', description: 'Default price book containing list prices for all active products', is_standard: true, is_active: true, currency: 'USD', effective_date: '2025-01-01' },
  { name: 'Partner Discount Price Book', description: 'Discounted pricing tier for certified channel partners and resellers', is_standard: false, is_active: true, currency: 'USD', effective_date: '2025-04-01' },
];

export default PriceBookSeedData;
