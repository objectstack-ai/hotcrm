import {
  extractEmailSignature,
  enrichLead,
  routeLead,
  generateNurturingRecommendations,
  EmailSignatureRequest,
  LeadEnrichmentRequest,
  LeadRoutingRequest,
  LeadNurturingRequest
} from '../../../src/actions/lead_ai.action';

import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    doc: {
      get: vi.fn(),
      update: vi.fn()
    },
    find: vi.fn()
  }
}));

import { db } from '../../../src/db';

describe('Lead AI Actions - extractEmailSignature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract contact data from email body', async () => {
    const request: EmailSignatureRequest = {
      emailBody: 'Best regards,\nJohn Doe\nVP of Sales, Acme Corp\n+1 (555) 123-4567\njohn.doe@acme.com'
    };

    const result = await extractEmailSignature(request);

    expect(result).toBeDefined();
    expect(result.extractedData).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.leadUpdated).toBe(false);
  });

  it('should auto-update lead when leadId is provided and confidence is high', async () => {
    (db.doc.update as Mock).mockResolvedValue({});

    const request: EmailSignatureRequest = {
      emailBody: 'Best regards,\nJohn Doe\nVP of Sales\njohn.doe@acme.com',
      leadId: 'lead_001'
    };

    const result = await extractEmailSignature(request);

    expect(result.leadUpdated).toBe(true);
    expect(db.doc.update).toHaveBeenCalledWith('Lead', 'lead_001', expect.any(Object));
  });

  it('should return confidence scores for each extracted field', async () => {
    const request: EmailSignatureRequest = {
      emailBody: 'John Doe\njohn@acme.com'
    };

    const result = await extractEmailSignature(request);

    expect(result.confidence).toBeDefined();
    Object.values(result.confidence).forEach(score => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});

describe('Lead AI Actions - enrichLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enrich lead with company data from email domain', async () => {
    const request: LeadEnrichmentRequest = {
      emailDomain: 'acme.com'
    };

    const result = await enrichLead(request);

    expect(result).toBeDefined();
    expect(result.companyData).toBeDefined();
    expect(result.socialProfiles).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata.source).toBe('AI Enrichment');
  });

  it('should throw error when no domain is available', async () => {
    (db.doc.get as Mock).mockResolvedValue({ Email: null });

    const request: LeadEnrichmentRequest = {
      leadId: 'lead_001'
    };

    await expect(enrichLead(request)).rejects.toThrow('Email domain is required for enrichment');
  });

  it('should fetch domain from lead record when leadId provided', async () => {
    (db.doc.get as Mock).mockResolvedValue({ Email: 'john@acme.com' });
    (db.doc.update as Mock).mockResolvedValue({});

    const request: LeadEnrichmentRequest = {
      leadId: 'lead_001'
    };

    const result = await enrichLead(request);

    expect(db.doc.get).toHaveBeenCalledWith('Lead', 'lead_001', { fields: ['email'] });
    expect(result.companyData).toBeDefined();
    expect(db.doc.update).toHaveBeenCalledWith('Lead', 'lead_001', expect.any(Object));
  });
});

describe('Lead AI Actions - routeLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should recommend a sales rep and auto-assign the lead', async () => {
    (db.doc.get as Mock).mockResolvedValue({
      Company: 'Acme Corp',
      Industry: 'technology',
      State: 'CA',
      Country: 'US',
      LeadScore: 80,
      AnnualRevenue: 5000000
    });
    (db.doc.update as Mock).mockResolvedValue({});

    const request: LeadRoutingRequest = { leadId: 'lead_001' };

    const result = await routeLead(request);

    expect(result).toBeDefined();
    expect(result.recommendedOwner).toBeDefined();
    expect(result.recommendedOwner.userId).toBeDefined();
    expect(result.recommendedOwner.matchScore).toBeGreaterThan(0);
    expect(result.assigned).toBe(true);
    expect(db.doc.update).toHaveBeenCalledWith('Lead', 'lead_001', expect.objectContaining({
      OwnerId: expect.any(String)
    }));
  });

  it('should provide alternative recommendations with reasoning', async () => {
    (db.doc.get as Mock).mockResolvedValue({
      Industry: 'technology',
      State: 'CA'
    });
    (db.doc.update as Mock).mockResolvedValue({});

    const request: LeadRoutingRequest = { leadId: 'lead_002' };

    const result = await routeLead(request);

    expect(result.alternatives).toBeDefined();
    expect(Array.isArray(result.alternatives)).toBe(true);
    expect(result.reasoning).toBeDefined();
    expect(result.reasoning.industryMatch).toBeGreaterThanOrEqual(0);
    expect(result.reasoning.geographyMatch).toBeGreaterThanOrEqual(0);
  });
});

describe('Lead AI Actions - generateNurturingRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate personalized nurturing recommendations', async () => {
    (db.doc.get as Mock).mockResolvedValue({
      FirstName: 'John',
      LastName: 'Doe',
      Company: 'Acme Corp',
      Industry: 'technology',
      Title: 'VP of Sales',
      LeadScore: 75,
      Status: 'working',
      LeadSource: 'Website'
    });
    (db.find as Mock).mockResolvedValue([
      { Type: 'email', Subject: 'Follow up', ActivityDate: '2024-01-15' }
    ]);

    const request: LeadNurturingRequest = { leadId: 'lead_001' };

    const result = await generateNurturingRecommendations(request);

    expect(result).toBeDefined();
    expect(result.nextBestAction).toBeDefined();
    expect(result.nextBestAction.action).toBeDefined();
    expect(result.nextBestAction.priority).toBeDefined();
    expect(result.emailTemplate).toBeDefined();
    expect(result.emailTemplate.subject).toBeDefined();
    expect(result.optimalContactTime).toBeDefined();
    expect(result.contentRecommendations).toBeDefined();
    expect(Array.isArray(result.contentRecommendations)).toBe(true);
  });

  it('should include content recommendations with relevance scores', async () => {
    (db.doc.get as Mock).mockResolvedValue({
      FirstName: 'Jane',
      LastName: 'Smith',
      Company: 'Tech Co',
      Industry: 'technology',
      Title: 'Director',
      LeadScore: 60,
      Status: 'new',
      LeadSource: 'Referral'
    });
    (db.find as Mock).mockResolvedValue([]);

    const request: LeadNurturingRequest = { leadId: 'lead_002' };

    const result = await generateNurturingRecommendations(request);

    expect(result.contentRecommendations.length).toBeGreaterThan(0);
    result.contentRecommendations.forEach(rec => {
      expect(rec.type).toBeDefined();
      expect(rec.title).toBeDefined();
      expect(rec.relevance).toBeGreaterThanOrEqual(0);
      expect(rec.relevance).toBeLessThanOrEqual(100);
    });
  });
});
