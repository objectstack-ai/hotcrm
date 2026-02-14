import { describe, it, expect } from 'vitest';
import { Property } from '../../../src/property.object';
import { Listing } from '../../../src/listing.object';
import { Showing } from '../../../src/showing.object';
import { RealEstateOffer } from '../../../src/real_estate_offer.object';
import { Commission } from '../../../src/commission.object';
import { OpenHouse } from '../../../src/open_house.object';
import { Neighborhood } from '../../../src/neighborhood.object';

// ─── Property ──────────────────────────────────────────────────────────────────

describe('Property Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Property).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Property.name).toBe('property');
    expect(Property.label).toBe('Property');
  });

  it('should use snake_case name', () => {
    expect(Property.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Property.fields).toBeDefined();
    expect(Object.keys(Property.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Property.fields.name.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Property.fields.name.type).toBe('text');
    expect(Property.fields.address.type).toBe('textarea');
    expect(Property.fields.property_type.type).toBe('select');
    expect(Property.fields.bedrooms.type).toBe('number');
    expect(Property.fields.bathrooms.type).toBe('number');
    expect(Property.fields.sqft.type).toBe('number');
    expect(Property.fields.lot_size.type).toBe('number');
    expect(Property.fields.year_built.type).toBe('number');
    expect(Property.fields.features.type).toBe('textarea');
    expect(Property.fields.mls_number.type).toBe('text');
    expect(Property.fields.status.type).toBe('select');
    expect(Property.fields.listed_price.type).toBe('currency');
    expect(Property.fields.owner_id.type).toBe('lookup');
  });

  it('should have property_type select with valid options', () => {
    const values = Property.fields.property_type.options.map((o: any) => o.value);
    expect(values).toContain('residential');
    expect(values).toContain('commercial');
    expect(values).toContain('land');
    expect(values).toContain('industrial');
  });

  it('should have status select with valid options', () => {
    const values = Property.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('available');
    expect(values).toContain('pending');
    expect(values).toContain('sold');
    expect(values).toContain('off_market');
  });

  it('should default status to available', () => {
    expect(Property.fields.status.defaultValue).toBe('available');
  });

  it('should have owner_id lookup referencing contact', () => {
    expect(Property.fields.owner_id.type).toBe('lookup');
    expect(Property.fields.owner_id.reference).toBe('contact');
  });

  it('should have mls_number as unique', () => {
    expect(Property.fields.mls_number.unique).toBe(true);
  });
});

// ─── Listing ───────────────────────────────────────────────────────────────────

describe('Listing Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Listing).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Listing.name).toBe('listing');
    expect(Listing.label).toBe('Listing');
  });

  it('should use snake_case name', () => {
    expect(Listing.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Listing.fields).toBeDefined();
    expect(Object.keys(Listing.fields).length).toBeGreaterThan(0);
  });

  it('should have correct field types', () => {
    expect(Listing.fields.property_id.type).toBe('master_detail');
    expect(Listing.fields.list_price.type).toBe('currency');
    expect(Listing.fields.sold_price.type).toBe('currency');
    expect(Listing.fields.list_date.type).toBe('date');
    expect(Listing.fields.sold_date.type).toBe('date');
    expect(Listing.fields.days_on_market.type).toBe('number');
    expect(Listing.fields.listing_agent.type).toBe('lookup');
    expect(Listing.fields.listing_type.type).toBe('select');
    expect(Listing.fields.status.type).toBe('select');
    expect(Listing.fields.description.type).toBe('textarea');
  });

  it('should have property_id master_detail referencing property', () => {
    expect(Listing.fields.property_id.reference).toBe('property');
  });

  it('should have listing_agent lookup referencing contact', () => {
    expect(Listing.fields.listing_agent.reference).toBe('contact');
  });

  it('should have status select with valid options', () => {
    const values = Listing.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('active');
    expect(values).toContain('pending');
    expect(values).toContain('sold');
    expect(values).toContain('withdrawn');
    expect(values).toContain('expired');
  });

  it('should default status to active', () => {
    expect(Listing.fields.status.defaultValue).toBe('active');
  });

  it('should have listing_type select with valid options', () => {
    const values = Listing.fields.listing_type.options.map((o: any) => o.value);
    expect(values).toContain('exclusive');
    expect(values).toContain('open');
    expect(values).toContain('pocket');
  });
});

// ─── Showing ───────────────────────────────────────────────────────────────────

describe('Showing Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Showing).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Showing.name).toBe('showing');
    expect(Showing.label).toBe('Showing');
  });

  it('should use snake_case name', () => {
    expect(Showing.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Showing.fields).toBeDefined();
    expect(Object.keys(Showing.fields).length).toBeGreaterThan(0);
  });

  it('should have correct field types', () => {
    expect(Showing.fields.listing_id.type).toBe('master_detail');
    expect(Showing.fields.agent_id.type).toBe('lookup');
    expect(Showing.fields.buyer_contact_id.type).toBe('lookup');
    expect(Showing.fields.scheduled_date.type).toBe('datetime');
    expect(Showing.fields.feedback.type).toBe('textarea');
    expect(Showing.fields.rating.type).toBe('number');
    expect(Showing.fields.follow_up_status.type).toBe('select');
  });

  it('should have listing_id master_detail referencing listing', () => {
    expect(Showing.fields.listing_id.reference).toBe('listing');
  });

  it('should have follow_up_status select with valid options', () => {
    const values = Showing.fields.follow_up_status.options.map((o: any) => o.value);
    expect(values).toContain('pending');
    expect(values).toContain('completed');
    expect(values).toContain('not_interested');
  });

  it('should default follow_up_status to pending', () => {
    expect(Showing.fields.follow_up_status.defaultValue).toBe('pending');
  });
});

// ─── Real Estate Offer ─────────────────────────────────────────────────────────

describe('RealEstateOffer Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(RealEstateOffer).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(RealEstateOffer.name).toBe('real_estate_offer');
    expect(RealEstateOffer.label).toBe('Real Estate Offer');
  });

  it('should use snake_case name', () => {
    expect(RealEstateOffer.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(RealEstateOffer.fields).toBeDefined();
    expect(Object.keys(RealEstateOffer.fields).length).toBeGreaterThan(0);
  });

  it('should have correct field types', () => {
    expect(RealEstateOffer.fields.listing_id.type).toBe('master_detail');
    expect(RealEstateOffer.fields.buyer_id.type).toBe('lookup');
    expect(RealEstateOffer.fields.offer_amount.type).toBe('currency');
    expect(RealEstateOffer.fields.contingencies.type).toBe('textarea');
    expect(RealEstateOffer.fields.expiration_date.type).toBe('date');
    expect(RealEstateOffer.fields.status.type).toBe('select');
    expect(RealEstateOffer.fields.counter_offer_amount.type).toBe('currency');
    expect(RealEstateOffer.fields.earnest_money.type).toBe('currency');
    expect(RealEstateOffer.fields.closing_date.type).toBe('date');
  });

  it('should have listing_id master_detail referencing listing', () => {
    expect(RealEstateOffer.fields.listing_id.reference).toBe('listing');
  });

  it('should have status select with valid options', () => {
    const values = RealEstateOffer.fields.status.options.map((o: any) => o.value);
    expect(values).toContain('submitted');
    expect(values).toContain('accepted');
    expect(values).toContain('rejected');
    expect(values).toContain('counter');
    expect(values).toContain('expired');
    expect(values).toContain('withdrawn');
  });

  it('should default status to submitted', () => {
    expect(RealEstateOffer.fields.status.defaultValue).toBe('submitted');
  });

  it('should have offer_amount as required', () => {
    expect(RealEstateOffer.fields.offer_amount.required).toBe(true);
  });
});

// ─── Commission ────────────────────────────────────────────────────────────────

describe('Commission Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Commission).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Commission.name).toBe('commission');
    expect(Commission.label).toBe('Commission');
  });

  it('should use snake_case name', () => {
    expect(Commission.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Commission.fields).toBeDefined();
    expect(Object.keys(Commission.fields).length).toBeGreaterThan(0);
  });

  it('should have correct field types', () => {
    expect(Commission.fields.transaction_id.type).toBe('lookup');
    expect(Commission.fields.agent_id.type).toBe('lookup');
    expect(Commission.fields.commission_rate.type).toBe('percent');
    expect(Commission.fields.commission_amount.type).toBe('currency');
    expect(Commission.fields.split_type.type).toBe('select');
    expect(Commission.fields.payment_status.type).toBe('select');
    expect(Commission.fields.payment_date.type).toBe('date');
  });

  it('should have agent_id as required', () => {
    expect(Commission.fields.agent_id.required).toBe(true);
  });

  it('should have commission_amount as required', () => {
    expect(Commission.fields.commission_amount.required).toBe(true);
  });

  it('should have split_type select with valid options', () => {
    const values = Commission.fields.split_type.options.map((o: any) => o.value);
    expect(values).toContain('full');
    expect(values).toContain('co_listing');
    expect(values).toContain('referral');
  });

  it('should default split_type to full', () => {
    expect(Commission.fields.split_type.defaultValue).toBe('full');
  });

  it('should have payment_status select with valid options', () => {
    const values = Commission.fields.payment_status.options.map((o: any) => o.value);
    expect(values).toContain('pending');
    expect(values).toContain('paid');
    expect(values).toContain('partial');
  });

  it('should default payment_status to pending', () => {
    expect(Commission.fields.payment_status.defaultValue).toBe('pending');
  });

  it('should have transaction_id lookup referencing listing', () => {
    expect(Commission.fields.transaction_id.reference).toBe('listing');
  });
});

// ─── Open House ────────────────────────────────────────────────────────────────

describe('OpenHouse Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(OpenHouse).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(OpenHouse.name).toBe('open_house');
    expect(OpenHouse.label).toBe('Open House');
  });

  it('should use snake_case name', () => {
    expect(OpenHouse.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(OpenHouse.fields).toBeDefined();
    expect(Object.keys(OpenHouse.fields).length).toBeGreaterThan(0);
  });

  it('should have correct field types', () => {
    expect(OpenHouse.fields.listing_id.type).toBe('master_detail');
    expect(OpenHouse.fields.event_date.type).toBe('date');
    expect(OpenHouse.fields.time_start.type).toBe('text');
    expect(OpenHouse.fields.time_end.type).toBe('text');
    expect(OpenHouse.fields.attendee_count.type).toBe('number');
    expect(OpenHouse.fields.leads_generated.type).toBe('number');
    expect(OpenHouse.fields.notes.type).toBe('textarea');
  });

  it('should have listing_id master_detail referencing listing', () => {
    expect(OpenHouse.fields.listing_id.reference).toBe('listing');
  });

  it('should have event_date as required', () => {
    expect(OpenHouse.fields.event_date.required).toBe(true);
  });

  it('should default attendee_count to 0', () => {
    expect(OpenHouse.fields.attendee_count.defaultValue).toBe(0);
  });

  it('should default leads_generated to 0', () => {
    expect(OpenHouse.fields.leads_generated.defaultValue).toBe(0);
  });
});

// ─── Neighborhood ──────────────────────────────────────────────────────────────

describe('Neighborhood Object Spec Compliance', () => {
  it('should be defined', () => {
    expect(Neighborhood).toBeDefined();
  });

  it('should have correct object name and label', () => {
    expect(Neighborhood.name).toBe('neighborhood');
    expect(Neighborhood.label).toBe('Neighborhood');
  });

  it('should use snake_case name', () => {
    expect(Neighborhood.name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('should have fields defined', () => {
    expect(Neighborhood.fields).toBeDefined();
    expect(Object.keys(Neighborhood.fields).length).toBeGreaterThan(0);
  });

  it('should have required fields', () => {
    expect(Neighborhood.fields.name.required).toBe(true);
    expect(Neighborhood.fields.city.required).toBe(true);
    expect(Neighborhood.fields.state.required).toBe(true);
  });

  it('should have correct field types', () => {
    expect(Neighborhood.fields.name.type).toBe('text');
    expect(Neighborhood.fields.city.type).toBe('text');
    expect(Neighborhood.fields.state.type).toBe('text');
    expect(Neighborhood.fields.median_price.type).toBe('currency');
    expect(Neighborhood.fields.school_rating.type).toBe('number');
    expect(Neighborhood.fields.walk_score.type).toBe('number');
    expect(Neighborhood.fields.amenities.type).toBe('textarea');
  });
});
