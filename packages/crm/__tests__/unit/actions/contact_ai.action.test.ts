import {
  enrichContact,
  detectBuyingIntent,
  analyzeSentiment,
  ContactEnrichmentRequest,
  BuyingIntentRequest,
  SentimentAnalysisRequest
} from '../../../src/actions/contact_ai.action';

// Mock the db module
jest.mock('../../../src/db', () => ({
  db: {
    doc: {
      get: jest.fn()
    },
    find: jest.fn()
  }
}));

import { db } from '../../../src/db';

describe('Contact AI Actions - enrichContact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should enrich contact with missing data', async () => {
    // Arrange
    const mockContact = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      title: null,
      phone: null,
      mobile_phone: null
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockContact);

    const request: ContactEnrichmentRequest = {
      contactId: 'contact_123'
    };

    // Act
    const result = await enrichContact(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.enrichedData).toBeDefined();
    expect(result.fieldsUpdated).toBeDefined();
    expect(result.fieldsUpdated.length).toBeGreaterThan(0);
  });

  it('should calculate data quality score', async () => {
    // Arrange
    const mockContact = {
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      title: 'Director',
      phone: '+1-555-1234',
      mobile_phone: '+1-555-5678'
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockContact);

    const request: ContactEnrichmentRequest = {
      contactId: 'contact_123'
    };

    // Act
    const result = await enrichContact(request);

    // Assert
    expect(result.dataQuality).toBeGreaterThanOrEqual(0);
    expect(result.dataQuality).toBeLessThanOrEqual(100);
  });

  it('should show completeness improvement', async () => {
    // Arrange
    const mockContact = {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      title: null
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockContact);

    const request: ContactEnrichmentRequest = {
      contactId: 'contact_123',
      sources: ['linkedin', 'twitter']
    };

    // Act
    const result = await enrichContact(request);

    // Assert
    expect(result.completeness).toBeDefined();
    expect(result.completeness.before).toBeDefined();
    expect(result.completeness.after).toBeGreaterThanOrEqual(result.completeness.before);
  });

  it('should include confidence scores for enriched fields', async () => {
    // Arrange
    const mockContact = {
      first_name: 'Alice',
      last_name: 'Johnson',
      email: 'alice@company.com'
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockContact);

    const request: ContactEnrichmentRequest = {
      contactId: 'contact_123'
    };

    // Act
    const result = await enrichContact(request);

    // Assert
    expect(result.confidence).toBeDefined();
    Object.values(result.confidence).forEach(score => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it('should respect source filters', async () => {
    // Arrange
    const mockContact = {
      first_name: 'Bob',
      last_name: 'Wilson',
      email: 'bob@example.com'
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockContact);

    const request: ContactEnrichmentRequest = {
      contactId: 'contact_123',
      sources: ['linkedin']
    };

    // Act
    const result = await enrichContact(request);

    // Assert
    expect(result.enrichedData).toBeDefined();
    if (result.enrichedData.linkedin_url) {
      expect(result.enrichedData.linkedin_url).toContain('linkedin.com');
    }
  });
});

describe('Contact AI Actions - detectBuyingIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate intent score based on activities', async () => {
    // Arrange
    const mockContact = {
      first_name: 'Chris',
      last_name: 'Anderson',
      email: 'chris@company.com',
      account_id: 'acc_123'
    };

    const mockActivities = [
      { type: 'email', activity_date: new Date().toISOString() },
      { type: 'email', activity_date: new Date().toISOString() },
      { type: 'Meeting', activity_date: new Date().toISOString() }
    ];

    const mockOpportunities = [
      { 
        contact_id: 'contact_123', 
        is_closed: false,
        created_date: new Date().toISOString()
      }
    ];

    (db.doc.get as jest.Mock).mockResolvedValue(mockContact);
    (db.find as jest.Mock)
      .mockResolvedValueOnce(mockActivities)
      .mockResolvedValueOnce(mockOpportunities);

    const request: BuyingIntentRequest = {
      contactId: 'contact_123',
      lookbackDays: 30
    };

    // Act
    const result = await detectBuyingIntent(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.intentScore).toBeGreaterThanOrEqual(0);
    expect(result.intentScore).toBeLessThanOrEqual(100);
    expect(result.intentLevel).toBeDefined();
  });

  it('should identify high intent contacts', async () => {
    // Arrange
    const mockContact = {
      first_name: 'Diana',
      last_name: 'Prince',
      email: 'diana@company.com',
      account_id: 'acc_456'
    };

    const mockActivities = Array(10).fill({
      type: 'email',
      activity_date: new Date().toISOString()
    }).concat([
      { type: 'Meeting', activity_date: new Date().toISOString() },
      { type: 'Meeting', activity_date: new Date().toISOString() }
    ]);

    const mockOpportunities = [
      {
        contact_id: 'contact_456',
        is_closed: false,
        created_date: new Date().toISOString()
      }
    ];

    (db.doc.get as jest.Mock).mockResolvedValue(mockContact);
    (db.find as jest.Mock)
      .mockResolvedValueOnce(mockActivities)
      .mockResolvedValueOnce(mockOpportunities);

    const request: BuyingIntentRequest = {
      contactId: 'contact_456'
    };

    // Act
    const result = await detectBuyingIntent(request);

    // Assert
    expect(result.intentLevel).toMatch(/hot|very-hot/);
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it('should provide buying signals with weights', async () => {
    // Arrange
    const mockContact = { email: 'test@example.com' };
    (db.doc.get as jest.Mock).mockResolvedValue(mockContact);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: BuyingIntentRequest = {
      contactId: 'contact_123'
    };

    // Act
    const result = await detectBuyingIntent(request);

    // Assert
    expect(result.signals).toBeDefined();
    result.signals.forEach(signal => {
      expect(signal.signal).toBeDefined();
      expect(signal.weight).toBeGreaterThanOrEqual(0);
      expect(signal.timestamp).toBeDefined();
      expect(signal.description).toBeDefined();
    });
  });

  it('should recommend next action based on intent level', async () => {
    // Arrange
    const mockContact = { email: 'test@example.com' };
    (db.doc.get as jest.Mock).mockResolvedValue(mockContact);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: BuyingIntentRequest = {
      contactId: 'contact_123'
    };

    // Act
    const result = await detectBuyingIntent(request);

    // Assert
    expect(result.nextAction).toBeDefined();
    expect(result.nextAction.action).toBeDefined();
    expect(result.nextAction.priority).toBeDefined();
    expect(result.nextAction.timing).toBeDefined();
  });

  it('should handle lookback period parameter', async () => {
    // Arrange
    const mockContact = { email: 'test@example.com', account_id: 'acc_123' };
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const mockActivities = [
      { type: 'email', activity_date: oldDate }
    ];

    (db.doc.get as jest.Mock).mockResolvedValue(mockContact);
    (db.find as jest.Mock)
      .mockResolvedValueOnce(mockActivities)
      .mockResolvedValueOnce([]);

    const request: BuyingIntentRequest = {
      contactId: 'contact_123',
      lookbackDays: 30
    };

    // Act
    const result = await detectBuyingIntent(request);

    // Assert
    expect(result).toBeDefined();
    expect(db.find).toHaveBeenCalled();
  });
});

describe('Contact AI Actions - analyzeSentiment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect positive sentiment', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      emailContent: 'This is excellent! I love the product. Thank you so much for the great support.'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.sentiment).toMatch(/positive|very-positive/);
    expect(result.score).toBeGreaterThan(0);
  });

  it('should detect negative sentiment', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      emailContent: 'I am disappointed and frustrated with this issue. This is a serious problem.'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.sentiment).toMatch(/negative|very-negative/);
    expect(result.score).toBeLessThan(0);
  });

  it('should detect neutral sentiment', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      emailContent: 'I received your email. Please send me the documentation.'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.sentiment).toBe('neutral');
    expect(result.score).toBeGreaterThanOrEqual(-20);
    expect(result.score).toBeLessThanOrEqual(20);
  });

  it('should detect emotions in text', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      emailContent: 'I am excited about this opportunity! Great work team.'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.emotions).toBeDefined();
    expect(Array.isArray(result.emotions)).toBe(true);
    result.emotions.forEach(emotion => {
      expect(emotion.emotion).toBeDefined();
      expect(emotion.intensity).toBeGreaterThanOrEqual(0);
    });
  });

  it('should detect urgency level', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      emailContent: 'This is urgent! We need this ASAP. Critical issue that needs immediate attention.'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.urgency).toMatch(/high|critical/);
  });

  it('should recommend response tone', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      emailContent: 'I am very unhappy with the service. This problem needs to be fixed.'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.responseTone).toBeDefined();
    expect(typeof result.responseTone).toBe('string');
    expect(result.responseTone.length).toBeGreaterThan(0);
  });

  it('should return confidence score', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      emailContent: 'Thank you for your help.'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('should extract key phrases', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      emailContent: 'Please provide pricing information for the enterprise plan.'
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result.keyPhrases).toBeDefined();
    expect(Array.isArray(result.keyPhrases)).toBe(true);
  });

  it('should handle empty email content', async () => {
    // Arrange
    const request: SentimentAnalysisRequest = {
      emailContent: ''
    };

    // Act
    const result = await analyzeSentiment(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.sentiment).toBeDefined();
  });
});
