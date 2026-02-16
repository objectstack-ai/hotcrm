/**
 * Real Estate Offer Seed Data
 * Sample offers with financial terms, contingencies, and closing details
 */

export const RealEstateOfferSeedData = [
  { property_address: '742 Evergreen Terrace, Austin, TX', buyer_name: 'Kevin Park', offer_amount: 610000, offer_date: '2025-06-25', status: 'submitted', contingencies: 'Inspection, Financing', closing_date: '2025-08-15', earnest_money: 12000 },
  { property_address: '1200 Lakeshore Dr Unit 8B, Chicago, IL', buyer_name: 'Lisa Nakamura', offer_amount: 470000, offer_date: '2025-06-19', status: 'countered', contingencies: 'Inspection, Appraisal', closing_date: '2025-08-01', earnest_money: 10000 },
  { property_address: '1200 Lakeshore Dr Unit 8B, Chicago, IL', buyer_name: 'Lisa Nakamura', offer_amount: 480000, offer_date: '2025-06-22', status: 'accepted', contingencies: 'Inspection', closing_date: '2025-08-10', earnest_money: 15000 },
  { property_address: '58 Birchwood Ct, Raleigh, NC', buyer_name: 'Robert Stein', offer_amount: 680000, offer_date: '2025-03-05', status: 'rejected', contingencies: 'Inspection, Financing, Sale of current home', closing_date: '2025-05-30', earnest_money: 8000 },
  { property_address: '330 Maple Row, Denver, CO', buyer_name: 'Brian Hoffmann', offer_amount: 530000, offer_date: '2025-07-02', status: 'withdrawn', contingencies: 'Financing', closing_date: '2025-09-01', earnest_money: 10000 },
];

export default RealEstateOfferSeedData;
