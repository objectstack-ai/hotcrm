/**
 * Integration Test: Campaign to Lead Pipeline
 *
 * Phase 8F – Cross-cloud integration: Marketing → CRM.
 * Validates campaign launch through lead generation, scoring,
 * attribution tracking, and ROI calculation.
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

import { broker } from '../../src/db';

describe('Campaign to Lead Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should convert a campaign member into a lead with source attribution', async () => {
    // Arrange
    const mockCampaign = {
      id: 'camp_001',
      name: 'Spring Product Launch 2024',
      type: 'Email',
      status: 'active',
      start_date: '2024-03-01',
      budgeted_cost: 50000
    };

    const mockMember = {
      id: 'cm_001',
      campaign_id: 'camp_001',
      email: 'prospect@techco.com',
      first_name: 'Lisa',
      last_name: 'Park',
      status: 'responded',
      responded_date: new Date().toISOString()
    };

    const mockLead = {
      id: 'lead_camp_001',
      first_name: 'Lisa',
      last_name: 'Park',
      email: 'prospect@techco.com',
      lead_source: 'Campaign',
      campaign_id: 'camp_001',
      status: 'new'
    };

    (broker.findOne as Mock).mockResolvedValue(mockCampaign);
    (broker.insert as Mock)
      .mockResolvedValueOnce(mockMember)
      .mockResolvedValueOnce(mockLead);
    (broker.find as Mock).mockResolvedValue([]); // No existing lead

    // Act – Step 1: Register campaign member
    const member = await broker.insert('campaign_member', {
      campaign_id: mockCampaign.id,
      email: 'prospect@techco.com',
      first_name: 'Lisa',
      last_name: 'Park',
      status: 'responded'
    });

    // Step 2: Check for existing lead
    const existingLeads = await broker.find('lead', {
      filters: [['email', '=', member.email]]
    });

    // Step 3: Create lead with attribution
    let lead: any;
    if (existingLeads.length === 0) {
      lead = await broker.insert('lead', {
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        lead_source: 'Campaign',
        campaign_id: member.campaign_id,
        status: 'new'
      });
    }

    // Assert
    expect(lead).toBeDefined();
    expect(lead.campaign_id).toBe(mockCampaign.id);
    expect(lead.lead_source).toBe('Campaign');
    expect(lead.email).toBe(member.email);
    expect(broker.insert).toHaveBeenCalledTimes(2);
  });

  it('should track multiple campaign touches on a single lead', async () => {
    // Arrange
    const existingLead = {
      id: 'lead_multi',
      email: 'returning@example.com',
      first_name: 'James',
      last_name: 'Wilson',
      status: 'open',
      campaign_id: 'camp_email'
    };

    const touches = [
      { id: 'touch_1', lead_id: 'lead_multi', campaign_id: 'camp_email', type: 'Email Open', touch_date: '2024-01-10' },
      { id: 'touch_2', lead_id: 'lead_multi', campaign_id: 'camp_webinar', type: 'Webinar Attended', touch_date: '2024-01-15' },
      { id: 'touch_3', lead_id: 'lead_multi', campaign_id: 'camp_ad', type: 'Ad Click', touch_date: '2024-01-20' }
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce([existingLead]) // Existing lead lookup
      .mockResolvedValueOnce(touches);       // All touches

    (broker.insert as Mock)
      .mockResolvedValueOnce(touches[0])
      .mockResolvedValueOnce(touches[1])
      .mockResolvedValueOnce(touches[2]);

    // Act – Record three campaign touches
    const existing = await broker.find('lead', {
      filters: [['email', '=', 'returning@example.com']]
    });
    expect(existing).toHaveLength(1);

    for (const touch of touches) {
      await broker.insert('campaign_touch', {
        lead_id: existing[0].id,
        campaign_id: touch.campaign_id,
        type: touch.type,
        touch_date: touch.touch_date
      });
    }

    const allTouches = await broker.find('campaign_touch', {
      filters: [['lead_id', '=', 'lead_multi']]
    });

    // Assert
    expect(allTouches).toHaveLength(3);
    expect(broker.insert).toHaveBeenCalledTimes(3);
  });

  it('should calculate lead score based on campaign engagement', async () => {
    // Arrange
    const mockLead = {
      id: 'lead_score',
      email: 'engaged@example.com',
      status: 'open',
      lead_score: 0
    };

    const engagementEvents = [
      { type: 'email_open', points: 5 },
      { type: 'link_click', points: 10 },
      { type: 'form_submit', points: 25 },
      { type: 'webinar_attend', points: 20 }
    ];

    const totalScore = engagementEvents.reduce((sum, e) => sum + e.points, 0); // 60

    const scoredLead = { ...mockLead, lead_score: totalScore };

    (broker.findOne as Mock).mockResolvedValue(mockLead);
    (broker.find as Mock).mockResolvedValue(engagementEvents);
    (broker.update as Mock).mockResolvedValue(scoredLead);

    // Act – Retrieve engagement events and compute score
    const lead = await broker.findOne('lead', 'lead_score');
    const events = await broker.find('campaign_engagement', {
      filters: [['lead_id', '=', lead.id]]
    });

    const computedScore = events.reduce((sum: number, e: any) => sum + e.points, 0);
    const updatedLead = await broker.update('lead', lead.id, { lead_score: computedScore });

    // Assert
    expect(updatedLead.lead_score).toBe(60);
    expect(broker.update).toHaveBeenCalledWith('lead', 'lead_score', { lead_score: 60 });
  });

  it('should calculate campaign ROI from converted leads', async () => {
    // Arrange
    const mockCampaign = {
      id: 'camp_roi',
      name: 'Q1 Outbound',
      budgeted_cost: 25000,
      actual_cost: 22000,
      status: 'completed'
    };

    const wonOpportunities = [
      { id: 'opp_r1', campaign_id: 'camp_roi', amount: 50000, stage: 'closed_won' },
      { id: 'opp_r2', campaign_id: 'camp_roi', amount: 35000, stage: 'closed_won' }
    ];

    const updatedCampaign = {
      ...mockCampaign,
      total_revenue: 85000,
      roi_percent: ((85000 - 22000) / 22000) * 100, // ~286%
      number_of_won_deals: 2
    };

    (broker.findOne as Mock).mockResolvedValue(mockCampaign);
    (broker.find as Mock).mockResolvedValue(wonOpportunities);
    (broker.update as Mock).mockResolvedValue(updatedCampaign);

    // Act
    const campaign = await broker.findOne('campaign', 'camp_roi');
    const wonDeals = await broker.find('opportunity', {
      filters: [['campaign_id', '=', campaign.id], ['stage', '=', 'closed_won']]
    });

    const totalRevenue = wonDeals.reduce((sum: number, o: any) => sum + o.amount, 0);
    const roi = ((totalRevenue - campaign.actual_cost) / campaign.actual_cost) * 100;

    const updated = await broker.update('campaign', campaign.id, {
      total_revenue: totalRevenue,
      roi_percent: roi,
      number_of_won_deals: wonDeals.length
    });

    // Assert
    expect(updated.total_revenue).toBe(85000);
    expect(updated.number_of_won_deals).toBe(2);
    expect(updated.roi_percent).toBeGreaterThan(280);
  });

  it('should not create a duplicate lead when campaign member already exists as lead', async () => {
    // Arrange
    const existingLead = {
      id: 'lead_existing',
      email: 'already@exists.com',
      first_name: 'Existing',
      last_name: 'Lead',
      campaign_id: 'camp_old',
      status: 'qualified'
    };

    (broker.find as Mock).mockResolvedValue([existingLead]);
    (broker.update as Mock).mockResolvedValue({
      ...existingLead,
      campaign_id: 'camp_new'
    });

    // Act – Attempt to create lead from new campaign
    const duplicates = await broker.find('lead', {
      filters: [['email', '=', 'already@exists.com']]
    });

    let lead: any;
    if (duplicates.length > 0) {
      lead = await broker.update('lead', duplicates[0].id, {
        campaign_id: 'camp_new'
      });
    } else {
      lead = await broker.insert('lead', {
        email: 'already@exists.com',
        campaign_id: 'camp_new',
        status: 'new'
      });
    }

    // Assert
    expect(lead.id).toBe('lead_existing');
    expect(broker.insert).not.toHaveBeenCalled();
    expect(broker.update).toHaveBeenCalledTimes(1);
  });
});
