import {
  executeSmartBriefing,
  SmartBriefingRequest
} from '../../../src/actions/ai_smart_briefing.action';

import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    doc: {
      get: vi.fn()
    },
    find: vi.fn()
  }
}));

import { db } from '../../../src/db';

describe('AI Smart Briefing - executeSmartBriefing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a smart briefing for an account', async () => {
    (db.doc.get as Mock).mockResolvedValue({
      Name: 'Acme Corp',
      Industry: 'Technology',
      AnnualRevenue: 5000000,
      CustomerStatus: 'Active',
      Rating: 'Hot',
      Description: 'Enterprise software company',
      HealthScore: 85,
      SLATier: 'Premium'
    });
    (db.find as Mock)
      .mockResolvedValueOnce([
        { Type: 'meeting', Subject: 'Quarterly Review', ActivityDate: '2024-01-15', Status: 'completed', Description: 'Good meeting' }
      ])
      .mockResolvedValueOnce([
        { Subject: 'Follow up', SentDate: '2024-01-16', Direction: 'outbound', Body: 'Thank you for the meeting' }
      ])
      .mockResolvedValueOnce([
        { Name: 'Enterprise Deal', Stage: 'proposal', Amount: 100000, CloseDate: '2024-03-15', Probability: 60 }
      ]);

    const request: SmartBriefingRequest = { accountId: 'acc_001' };

    const result = await executeSmartBriefing(request);

    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(typeof result.summary).toBe('string');
    expect(result.nextSteps).toBeDefined();
    expect(Array.isArray(result.nextSteps)).toBe(true);
    expect(result.talkingPoints).toBeDefined();
    expect(Array.isArray(result.talkingPoints)).toBe(true);
    expect(['positive', 'neutral', 'negative']).toContain(result.sentiment);
    expect(result.engagementScore).toBeGreaterThanOrEqual(0);
    expect(result.engagementScore).toBeLessThanOrEqual(100);
    expect(result.metadata).toBeDefined();
    expect(result.metadata.generatedAt).toBeDefined();
  });

  it('should throw error when accountId is not provided', async () => {
    const request = { accountId: '' } as SmartBriefingRequest;

    await expect(executeSmartBriefing(request)).rejects.toThrow('accountId is required');
  });

  it('should throw error when account is not found', async () => {
    (db.doc.get as Mock).mockResolvedValue(null);

    const request: SmartBriefingRequest = { accountId: 'nonexistent' };

    await expect(executeSmartBriefing(request)).rejects.toThrow('Account not found: nonexistent');
  });

  it('should include metadata with activity and email counts', async () => {
    (db.doc.get as Mock).mockResolvedValue({
      Name: 'Beta Inc',
      Industry: 'Finance'
    });
    const mockActivities = [
      { Type: 'call', Subject: 'Check-in', ActivityDate: '2024-01-10', Status: 'completed' },
      { Type: 'email', Subject: 'Intro', ActivityDate: '2024-01-08', Status: 'completed' }
    ];
    const mockEmails = [
      { Subject: 'Pricing', SentDate: '2024-01-12', Direction: 'inbound', Body: 'Need pricing info' }
    ];
    (db.find as Mock)
      .mockResolvedValueOnce(mockActivities)
      .mockResolvedValueOnce(mockEmails)
      .mockResolvedValueOnce([]);

    const request: SmartBriefingRequest = { accountId: 'acc_002' };

    const result = await executeSmartBriefing(request);

    expect(result.metadata.activitiesAnalyzed).toBe(2);
    expect(result.metadata.emailsAnalyzed).toBe(1);
    expect(result.metadata.lastActivityDate).toBe('2024-01-10');
  });

  it('should handle missing activities and emails gracefully', async () => {
    (db.doc.get as Mock).mockResolvedValue({
      Name: 'Gamma LLC',
      Industry: 'Retail'
    });
    (db.find as Mock)
      .mockResolvedValueOnce([])   // activities
      .mockResolvedValueOnce([])   // emails
      .mockResolvedValueOnce([]);  // opportunities

    const request: SmartBriefingRequest = { accountId: 'acc_003' };

    const result = await executeSmartBriefing(request);

    expect(result).toBeDefined();
    expect(result.metadata.activitiesAnalyzed).toBe(0);
    expect(result.metadata.emailsAnalyzed).toBe(0);
    expect(result.metadata.lastActivityDate).toBe('N/A');
  });
});
