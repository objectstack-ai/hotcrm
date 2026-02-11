import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    doc: {
      get: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    find: vi.fn()
  }
}));

import { db } from '../../../src/db';
import {
  autoCategorizeCase,
  assignCaseIntelligently,
  searchKnowledgeBase,
  predictSLABreach,
  analyzeSentiment,
  AutoCategorizationRequest,
  IntelligentAssignmentRequest,
  KnowledgeBaseRequest,
  SLABreachPredictionRequest,
  SentimentAnalysisRequest
} from '../../../src/actions/case_ai.action';

describe('Case AI - autoCategorizeCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should categorize a case by caseId', async () => {
    (db.doc.get as Mock).mockResolvedValueOnce({
      Subject: 'API integration failing',
      Description: 'Our Salesforce sync stopped working after the latest update'
    });
    (db.doc.update as Mock).mockResolvedValueOnce({});

    const result = await autoCategorizeCase({ caseId: 'case_001' });

    expect(result.caseType).toBeDefined();
    expect(result.product).toBeDefined();
    expect(result.issueType).toBeDefined();
    expect(['bug', 'feature_request', 'question', 'configuration', 'performance']).toContain(result.issueType);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.updated).toBe(true);
  });

  it('should categorize case from subject and description directly', async () => {
    const result = await autoCategorizeCase({
      subject: 'Cannot export reports',
      description: 'The export button is not working in the analytics dashboard'
    });

    expect(result.caseType).toBeDefined();
    expect(result.priority).toBeDefined();
    expect(['low', 'medium', 'high', 'critical']).toContain(result.priority);
    expect(result.updated).toBe(false);
  });

  it('should throw error when no case info is provided', async () => {
    await expect(autoCategorizeCase({})).rejects.toThrow(
      'Either caseId or both subject and description must be provided'
    );
  });

  it('should assign severity level', async () => {
    const result = await autoCategorizeCase({
      subject: 'System down',
      description: 'Production environment is completely unavailable'
    });

    expect(result.severity).toBeDefined();
    expect(['sev-1', 'sev-2', 'sev-3', 'sev-4']).toContain(result.severity);
  });

  it('should recommend a queue for routing', async () => {
    (db.doc.get as Mock).mockResolvedValueOnce({
      Subject: 'Need help with reports',
      Description: 'How do I create custom dashboards?'
    });
    (db.doc.update as Mock).mockResolvedValueOnce({});

    const result = await autoCategorizeCase({ caseId: 'case_002' });

    expect(result.queue).toBeDefined();
    expect(typeof result.queue).toBe('string');
  });
});

describe('Case AI - assignCaseIntelligently', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should recommend an agent for a case', async () => {
    (db.doc.get as Mock)
      .mockResolvedValueOnce({
        Subject: 'Sales Cloud bug',
        Description: 'Opportunities not saving',
        Type: 'Bug Report',
        Product: 'Sales Cloud',
        Priority: 'high',
        Severity: 'sev-2'
      })
      .mockResolvedValueOnce({ OwnerId: null }); // not assigned yet

    (db.doc.update as Mock).mockResolvedValueOnce({});

    const result = await assignCaseIntelligently({ caseId: 'case_010' });

    expect(result.recommendedAgent).toBeDefined();
    expect(result.recommendedAgent.userId).toBeDefined();
    expect(result.recommendedAgent.matchScore).toBeGreaterThan(0);
    expect(result.assigned).toBe(true);
  });

  it('should provide alternative agents', async () => {
    (db.doc.get as Mock)
      .mockResolvedValueOnce({
        Subject: 'Marketing issue',
        Description: 'Email campaigns failing',
        Type: 'Technical Issue',
        Product: 'Marketing Cloud',
        Priority: 'medium',
        Severity: 'sev-3'
      })
      .mockResolvedValueOnce({ OwnerId: null });

    (db.doc.update as Mock).mockResolvedValueOnce({});

    const result = await assignCaseIntelligently({ caseId: 'case_011' });

    expect(result.alternatives).toBeDefined();
    expect(Array.isArray(result.alternatives)).toBe(true);
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it('should include reasoning breakdown', async () => {
    (db.doc.get as Mock)
      .mockResolvedValueOnce({
        Subject: 'Performance problem',
        Description: 'Dashboard loading slowly',
        Type: 'Performance Problem',
        Product: 'Analytics',
        Priority: 'high',
        Severity: 'sev-2'
      })
      .mockResolvedValueOnce({ OwnerId: null });

    (db.doc.update as Mock).mockResolvedValueOnce({});

    const result = await assignCaseIntelligently({ caseId: 'case_012' });

    expect(result.reasoning).toBeDefined();
    expect(result.reasoning.skillMatch).toBeGreaterThanOrEqual(0);
    expect(result.reasoning.workloadScore).toBeGreaterThanOrEqual(0);
    expect(result.reasoning.successRateScore).toBeGreaterThanOrEqual(0);
    expect(result.reasoning.availabilityScore).toBeGreaterThanOrEqual(0);
  });

  it('should not reassign already-assigned cases', async () => {
    (db.doc.get as Mock)
      .mockResolvedValueOnce({
        Subject: 'Test case',
        Description: 'Already assigned',
        Type: 'Bug Report',
        Product: 'CRM Core',
        Priority: 'low',
        Severity: 'sev-4'
      })
      .mockResolvedValueOnce({ OwnerId: 'agent_existing' }); // already assigned

    const result = await assignCaseIntelligently({ caseId: 'case_013' });

    expect(result.assigned).toBe(false);
    expect(db.doc.update).not.toHaveBeenCalled();
  });

  it('should auto-assign unassigned cases', async () => {
    (db.doc.get as Mock)
      .mockResolvedValueOnce({
        Subject: 'New bug',
        Description: 'Something broken',
        Type: 'Bug Report',
        Product: 'Sales Cloud',
        Priority: 'medium',
        Severity: 'sev-3'
      })
      .mockResolvedValueOnce({ OwnerId: null });

    (db.doc.update as Mock).mockResolvedValueOnce({});

    const result = await assignCaseIntelligently({ caseId: 'case_014' });

    expect(result.assigned).toBe(true);
    expect(db.doc.update).toHaveBeenCalledWith(
      'Case', 'case_014',
      expect.objectContaining({ OwnerId: expect.any(String) })
    );
  });
});

describe('Case AI - searchKnowledgeBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return relevant articles for a query', async () => {
    const result = await searchKnowledgeBase({ query: 'API authentication error' });

    expect(result.articles).toBeDefined();
    expect(result.articles.length).toBeGreaterThan(0);
    result.articles.forEach(a => {
      expect(a.articleId).toBeDefined();
      expect(a.title).toBeDefined();
      expect(a.relevanceScore).toBeGreaterThanOrEqual(0);
    });
  });

  it('should generate a suggested response using RAG', async () => {
    const result = await searchKnowledgeBase({ query: 'How to fix sync issues' });

    expect(result.suggestedResponse).toBeDefined();
    expect(result.suggestedResponse.response).toBeDefined();
    expect(result.suggestedResponse.confidence).toBeGreaterThanOrEqual(0);
    expect(result.suggestedResponse.sources.length).toBeGreaterThan(0);
  });

  it('should search by caseId', async () => {
    (db.doc.get as Mock).mockResolvedValueOnce({
      Subject: 'API token expired',
      Description: 'Getting 401 errors when calling the REST API'
    });

    const result = await searchKnowledgeBase({ caseId: 'case_020' });

    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.relatedTopics).toBeDefined();
  });

  it('should throw error when neither query nor caseId is provided', async () => {
    await expect(searchKnowledgeBase({})).rejects.toThrow(
      'Either caseId or query must be provided'
    );
  });

  it('should return related topics', async () => {
    const result = await searchKnowledgeBase({ query: 'data integration troubleshooting' });

    expect(result.relatedTopics).toBeDefined();
    expect(Array.isArray(result.relatedTopics)).toBe(true);
    expect(result.relatedTopics.length).toBeGreaterThan(0);
  });
});

describe('Case AI - predictSLABreach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should predict SLA breach probability', async () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

    (db.doc.get as Mock)
      .mockResolvedValueOnce({
        CreatedDate: hoursAgo(20),
        Priority: 'high',
        Severity: 'sev-2',
        Status: 'open',
        Type: 'Bug Report',
        Product: 'Sales Cloud',
        OwnerId: 'agent_001',
        FirstResponseDate: hoursAgo(18)
      });

    (db.find as Mock).mockResolvedValueOnce([]); // activities

    // Second get for escalation check
    (db.doc.get as Mock).mockResolvedValueOnce({ IsEscalated: false });
    (db.doc.update as Mock).mockResolvedValueOnce({});

    const result = await predictSLABreach({ caseId: 'case_030' });

    expect(result.breachProbability).toBeGreaterThanOrEqual(0);
    expect(result.breachProbability).toBeLessThanOrEqual(100);
    expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
  });

  it('should include SLA status for response and resolution', async () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

    (db.doc.get as Mock).mockResolvedValueOnce({
      CreatedDate: hoursAgo(2),
      Priority: 'medium',
      Severity: 'sev-3',
      Status: 'open',
      Type: 'Question',
      Product: 'CRM Core',
      OwnerId: 'agent_001',
      FirstResponseDate: hoursAgo(1)
    });
    (db.find as Mock).mockResolvedValueOnce([
      { ActivityDate: hoursAgo(0.5) }
    ]);

    const result = await predictSLABreach({ caseId: 'case_031' });

    expect(result.slaStatus).toBeDefined();
    expect(result.slaStatus.responseTimeSLA).toBeDefined();
    expect(result.slaStatus.resolutionTimeSLA).toBeDefined();
    expect(['met', 'at_risk', 'breached']).toContain(result.slaStatus.responseTimeSLA.status);
  });

  it('should identify risk factors', async () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

    (db.doc.get as Mock).mockResolvedValueOnce({
      CreatedDate: hoursAgo(22),
      Priority: 'high',
      Severity: 'sev-2',
      Status: 'open',
      Type: 'Bug Report',
      Product: 'Sales Cloud',
      OwnerId: 'agent_001'
    });
    (db.find as Mock).mockResolvedValueOnce([]);
    (db.doc.get as Mock).mockResolvedValueOnce({ IsEscalated: false });
    (db.doc.update as Mock).mockResolvedValueOnce({});

    const result = await predictSLABreach({ caseId: 'case_032' });

    expect(result.riskFactors).toBeDefined();
    expect(result.riskFactors.length).toBeGreaterThan(0);
    result.riskFactors.forEach(f => {
      expect(f.factor).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(f.impact);
    });
  });

  it('should provide recommendations to prevent breach', async () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

    (db.doc.get as Mock).mockResolvedValueOnce({
      CreatedDate: hoursAgo(3),
      Priority: 'critical',
      Severity: 'sev-1',
      Status: 'open',
      Type: 'Performance Problem',
      Product: 'CRM Core',
      OwnerId: 'agent_001',
      FirstResponseDate: hoursAgo(2.5)
    });
    (db.find as Mock).mockResolvedValueOnce([]);
    (db.doc.get as Mock).mockResolvedValueOnce({ IsEscalated: false });
    (db.doc.update as Mock).mockResolvedValueOnce({});

    const result = await predictSLABreach({ caseId: 'case_033' });

    expect(result.recommendations).toBeDefined();
    expect(result.recommendations.length).toBeGreaterThan(0);
    result.recommendations.forEach(r => {
      expect(r.action).toBeDefined();
      expect(r.expectedImpact).toBeDefined();
    });
  });

  it('should suggest escalation for high breach probability', async () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

    (db.doc.get as Mock).mockResolvedValueOnce({
      CreatedDate: hoursAgo(23),
      Priority: 'high',
      Severity: 'sev-2',
      Status: 'open',
      Type: 'Bug Report',
      Product: 'Sales Cloud',
      OwnerId: 'agent_001'
    });
    (db.find as Mock).mockResolvedValueOnce([]);
    (db.doc.get as Mock).mockResolvedValueOnce({ IsEscalated: false });
    (db.doc.update as Mock).mockResolvedValueOnce({});

    const result = await predictSLABreach({ caseId: 'case_034' });

    expect(result.escalationSuggested).toBeDefined();
    expect(typeof result.escalationSuggested).toBe('boolean');
  });
});

describe('Case AI - analyzeSentiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should analyze sentiment from direct text', async () => {
    const result = await analyzeSentiment({
      text: 'I am extremely frustrated with your service. This is the third time my issue has not been resolved!'
    });

    expect(result.sentiment).toBeDefined();
    expect(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']).toContain(result.sentiment);
    expect(result.sentimentScore).toBeGreaterThanOrEqual(-100);
    expect(result.sentimentScore).toBeLessThanOrEqual(100);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it('should detect emotions with intensity', async () => {
    const result = await analyzeSentiment({
      text: 'This is unacceptable! I need this fixed IMMEDIATELY or we are cancelling our subscription!'
    });

    expect(result.emotions).toBeDefined();
    expect(Array.isArray(result.emotions)).toBe(true);
    expect(result.emotions.length).toBeGreaterThan(0);
    result.emotions.forEach(e => {
      expect(['anger', 'frustration', 'satisfaction', 'confusion', 'urgency', 'gratitude']).toContain(e.emotion);
      expect(e.intensity).toBeGreaterThanOrEqual(0);
      expect(e.intensity).toBeLessThanOrEqual(100);
    });
  });

  it('should assess customer health', async () => {
    const result = await analyzeSentiment({
      text: 'We are considering switching to a competitor because of ongoing issues.'
    });

    expect(result.customerHealth).toBeDefined();
    expect(result.customerHealth.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.customerHealth.healthScore).toBeLessThanOrEqual(100);
    expect(['low', 'medium', 'high']).toContain(result.customerHealth.riskLevel);
    expect(typeof result.customerHealth.churnRisk).toBe('boolean');
  });

  it('should analyze sentiment from caseId', async () => {
    (db.doc.get as Mock)
      .mockResolvedValueOnce({
        Subject: 'Great support experience',
        Description: 'Thank you for resolving my issue so quickly!'
      })
      .mockResolvedValueOnce({ Priority: 'low', IsEscalated: false }); // for priority check

    (db.find as Mock).mockResolvedValueOnce([]); // comments
    (db.doc.update as Mock).mockResolvedValueOnce({});

    const result = await analyzeSentiment({ caseId: 'case_040' });

    expect(result.sentiment).toBeDefined();
    expect(result.recommendedTone).toBeDefined();
    expect(['empathetic', 'professional', 'urgent', 'apologetic', 'celebratory']).toContain(result.recommendedTone);
  });

  it('should throw error when no input is provided', async () => {
    await expect(analyzeSentiment({})).rejects.toThrow(
      'Either caseId or text must be provided'
    );
  });
});
