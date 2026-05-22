/**
 * Real Estate Offer Seed Data
 * Sample offers with financial terms, contingencies, and closing details
 */

export const RealEstateOfferSeedData = [
  { offer_amount: 610000, status: 'submitted', contingencies: 'Inspection, Financing', closing_date: '2025-08-15', earnest_money: 12000 },
  { offer_amount: 470000, status: 'countered', contingencies: 'Inspection, Appraisal', closing_date: '2025-08-01', earnest_money: 10000 },
  { offer_amount: 480000, status: 'accepted', contingencies: 'Inspection', closing_date: '2025-08-10', earnest_money: 15000 },
  { offer_amount: 680000, status: 'rejected', contingencies: 'Inspection, Financing, Sale of current home', closing_date: '2025-05-30', earnest_money: 8000 },
  { offer_amount: 530000, status: 'withdrawn', contingencies: 'Financing', closing_date: '2025-09-01', earnest_money: 10000 }
];

export default RealEstateOfferSeedData;
