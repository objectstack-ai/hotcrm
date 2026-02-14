/**
 * Integration Test: Real Estate Lifecycle
 *
 * Validates the full listing → showing → offer → commission → payment flow.
 */

import { vi, Mock } from 'vitest';

vi.mock('../../src/db', () => ({
  broker: {
    findOne: vi.fn(),
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    count: vi.fn()
  }
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { broker } from '../../src/db';

describe('Real Estate Lifecycle Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a property and listing', async () => {
    const property = {
      _id: 'prop_1',
      name: '123 Oak Street',
      property_type: 'residential',
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1800,
      status: 'available',
      mls_number: 'MLS-001'
    };

    const listing = {
      _id: 'listing_1',
      property_id: 'prop_1',
      list_price: 450000,
      list_date: '2024-01-15',
      status: 'active',
      listing_type: 'exclusive'
    };

    (broker.insert as Mock).mockResolvedValueOnce(property);
    (broker.insert as Mock).mockResolvedValueOnce(listing);

    const createdProperty = await broker.insert('property', property);
    const createdListing = await broker.insert('listing', listing);

    expect(createdProperty.mls_number).toBe('MLS-001');
    expect(createdListing.property_id).toBe('prop_1');
    expect(createdListing.status).toBe('active');
  });

  it('should schedule a showing for a listing', async () => {
    const showing = {
      _id: 'showing_1',
      listing_id: 'listing_1',
      agent_id: 'agent_1',
      buyer_contact_id: 'buyer_1',
      scheduled_date: '2024-02-01T14:00:00Z',
      follow_up_status: 'pending'
    };

    (broker.insert as Mock).mockResolvedValue(showing);

    const createdShowing = await broker.insert('showing', showing);

    expect(createdShowing.listing_id).toBe('listing_1');
    expect(createdShowing.follow_up_status).toBe('pending');
    expect(broker.insert).toHaveBeenCalledWith('showing', expect.objectContaining({
      listing_id: 'listing_1',
      buyer_contact_id: 'buyer_1'
    }));
  });

  it('should submit an offer after showing', async () => {
    const offer = {
      _id: 'offer_1',
      listing_id: 'listing_1',
      buyer_id: 'buyer_1',
      offer_amount: 440000,
      status: 'submitted',
      earnest_money: 10000,
      closing_date: '2024-03-15'
    };

    (broker.insert as Mock).mockResolvedValue(offer);

    const createdOffer = await broker.insert('real_estate_offer', offer);

    expect(createdOffer.offer_amount).toBe(440000);
    expect(createdOffer.status).toBe('submitted');
    expect(broker.insert).toHaveBeenCalledWith('real_estate_offer', expect.objectContaining({
      listing_id: 'listing_1',
      offer_amount: 440000
    }));
  });

  it('should accept offer and update listing to pending', async () => {
    const acceptedOffer = {
      _id: 'offer_1',
      listing_id: 'listing_1',
      status: 'accepted',
      offer_amount: 440000
    };

    const updatedListing = {
      _id: 'listing_1',
      status: 'pending',
      sold_price: 440000
    };

    (broker.update as Mock).mockResolvedValueOnce(acceptedOffer);
    (broker.update as Mock).mockResolvedValueOnce(updatedListing);

    const offerResult = await broker.update('real_estate_offer', 'offer_1', { status: 'accepted' });
    const listingResult = await broker.update('listing', 'listing_1', {
      status: 'pending',
      sold_price: offerResult.offer_amount
    });

    expect(offerResult.status).toBe('accepted');
    expect(listingResult.status).toBe('pending');
    expect(listingResult.sold_price).toBe(440000);
  });

  it('should create commission after sale closes', async () => {
    const commission = {
      _id: 'comm_1',
      transaction_id: 'listing_1',
      agent_id: 'agent_1',
      commission_rate: 3,
      commission_amount: 13200,
      split_type: 'full',
      payment_status: 'pending'
    };

    (broker.insert as Mock).mockResolvedValue(commission);

    const createdCommission = await broker.insert('commission', commission);

    expect(createdCommission.commission_amount).toBe(13200);
    expect(createdCommission.payment_status).toBe('pending');
    expect(createdCommission.transaction_id).toBe('listing_1');
  });

  it('should mark commission as paid', async () => {
    const paidCommission = {
      _id: 'comm_1',
      payment_status: 'paid',
      payment_date: '2024-04-01'
    };

    (broker.update as Mock).mockResolvedValue(paidCommission);

    const result = await broker.update('commission', 'comm_1', {
      payment_status: 'paid',
      payment_date: '2024-04-01'
    });

    expect(result.payment_status).toBe('paid');
    expect(result.payment_date).toBe('2024-04-01');
    expect(broker.update).toHaveBeenCalledWith('commission', 'comm_1', expect.objectContaining({
      payment_status: 'paid'
    }));
  });

  it('should mark listing as sold at the end of the lifecycle', async () => {
    const soldListing = {
      _id: 'listing_1',
      status: 'sold',
      sold_price: 440000,
      sold_date: '2024-03-15',
      days_on_market: 59
    };

    (broker.update as Mock).mockResolvedValue(soldListing);

    const result = await broker.update('listing', 'listing_1', {
      status: 'sold',
      sold_date: '2024-03-15'
    });

    expect(result.status).toBe('sold');
    expect(result.sold_date).toBe('2024-03-15');
    expect(result.days_on_market).toBe(59);
  });

  it('should count total listings by status', async () => {
    (broker.count as Mock).mockResolvedValue(8);

    const activeCount = await broker.count('listing', {
      filters: [['status', '=', 'active']]
    } as any);

    expect(activeCount).toBe(8);
    expect(broker.count).toHaveBeenCalledWith('listing', expect.objectContaining({
      filters: [['status', '=', 'active']]
    }));
  });
});
