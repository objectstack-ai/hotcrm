import {
  recommendArticles,
  autoTagArticle,
  scoreArticleQuality,
  ArticleRecommendationRequest,
  AutoTaggingRequest,
  QualityScoringRequest
} from '../../../src/actions/knowledge_ai.action';

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

describe('Knowledge AI Actions - recommendArticles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should recommend articles based on case query', async () => {
    // Arrange
    const mockCase = {
      subject: 'Unable to login to dashboard',
      description: 'Getting authentication error when trying to access dashboard',
      type: 'Technical Issue',
      priority: 'High'
    };

    const mockArticles = [
      {
        id: 'article_1',
        title: 'Troubleshooting Login Issues',
        summary: 'How to resolve common login and authentication problems',
        is_published: true,
        url_name: 'troubleshooting-login',
        article_type: 'How-To'
      },
      {
        id: 'article_2',
        title: 'Dashboard Access Guide',
        summary: 'Step-by-step guide to accessing the dashboard',
        is_published: true,
        url_name: 'dashboard-access',
        article_type: 'How-To'
      }
    ];

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.find as jest.Mock).mockResolvedValue(mockArticles);

    const request: ArticleRecommendationRequest = {
      caseId: 'case_123',
      limit: 5
    };

    // Act
    const result = await recommendArticles(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.articles).toBeDefined();
    expect(Array.isArray(result.articles)).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);
  });

  it('should rank articles by relevance score', async () => {
    // Arrange
    const mockArticles = [
      { id: '1', title: 'API Integration', summary: 'API guide', is_published: true },
      { id: '2', title: 'Getting Started', summary: 'Intro guide', is_published: true },
      { id: '3', title: 'API Best Practices', summary: 'Advanced API', is_published: true }
    ];

    (db.find as jest.Mock).mockResolvedValue(mockArticles);

    const request: ArticleRecommendationRequest = {
      query: 'API integration issues',
      limit: 3
    };

    // Act
    const result = await recommendArticles(request);

    // Assert
    expect(result.articles.length).toBeLessThanOrEqual(3);
    result.articles.forEach(article => {
      expect(article.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(article.relevanceScore).toBeLessThanOrEqual(100);
    });
    
    // Verify sorted by relevance
    for (let i = 1; i < result.articles.length; i++) {
      expect(result.articles[i - 1].relevanceScore).toBeGreaterThanOrEqual(
        result.articles[i].relevanceScore
      );
    }
  });

  it('should include search metadata', async () => {
    // Arrange
    (db.find as jest.Mock).mockResolvedValue([
      { id: '1', title: 'Test Article', summary: 'Test', is_published: true }
    ]);

    const request: ArticleRecommendationRequest = {
      query: 'test query'
    };

    // Act
    const result = await recommendArticles(request);

    // Assert
    expect(result.metadata).toBeDefined();
    expect(result.metadata.totalMatches).toBeGreaterThanOrEqual(0);
    expect(result.metadata.searchTime).toBeGreaterThan(0);
    expect(result.metadata.algorithmUsed).toBeDefined();
  });

  it('should handle requests with case ID', async () => {
    // Arrange
    const mockCase = {
      subject: 'Payment processing error',
      description: 'Error occurs during checkout',
      type: 'Bug Report'
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: ArticleRecommendationRequest = {
      caseId: 'case_456'
    };

    // Act
    const result = await recommendArticles(request);

    // Assert
    expect(db.doc.get).toHaveBeenCalledWith('case', 'case_456', expect.anything());
    expect(result).toBeDefined();
  });

  it('should throw error when neither caseId nor query provided', async () => {
    // Arrange
    const request: ArticleRecommendationRequest = {};

    // Act & Assert
    await expect(recommendArticles(request)).rejects.toThrow();
  });
});

describe('Knowledge AI Actions - autoTagArticle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate tags for article content', async () => {
    // Arrange
    const mockArticle = {
      title: 'CRM Integration API Guide',
      summary: 'Learn how to integrate with our CRM API',
      body: 'This guide explains the CRM API integration process including authentication and data sync.',
      article_type: null
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockArticle);

    const request: AutoTaggingRequest = {
      articleId: 'article_123'
    };

    // Act
    const result = await autoTagArticle(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.tags).toBeDefined();
    expect(Array.isArray(result.tags)).toBe(true);
    expect(result.tags.length).toBeGreaterThan(0);
  });

  it('should categorize tags by type', async () => {
    // Arrange
    const mockArticle = {
      title: 'Troubleshooting Mobile App Errors',
      summary: 'Fix common mobile app bugs',
      body: 'Guide to debugging mobile application issues',
      article_type: 'Troubleshooting'
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockArticle);

    const request: AutoTaggingRequest = {
      articleId: 'article_456'
    };

    // Act
    const result = await autoTagArticle(request);

    // Assert
    result.tags.forEach(tag => {
      expect(tag.tag).toBeDefined();
      expect(tag.confidence).toBeGreaterThanOrEqual(0);
      expect(tag.confidence).toBeLessThanOrEqual(100);
      expect(['product', 'feature', 'issue-type', 'topic']).toContain(tag.category);
    });
  });

  it('should suggest article type when missing', async () => {
    // Arrange
    const mockArticle = {
      title: 'How to Setup Email Integration',
      summary: 'Step by step guide',
      body: 'Follow these steps to integrate email',
      article_type: null
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockArticle);

    const request: AutoTaggingRequest = {
      articleId: 'article_789'
    };

    // Act
    const result = await autoTagArticle(request);

    // Assert
    expect(result.suggestedType).toBeDefined();
    expect(result.suggestedType).toBe('How-To');
  });

  it('should return categories for the article', async () => {
    // Arrange
    const mockArticle = {
      title: 'Security Best Practices',
      summary: 'Security guidelines',
      body: 'Security configuration and authentication setup',
      article_type: 'General'
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockArticle);

    const request: AutoTaggingRequest = {
      articleId: 'article_sec'
    };

    // Act
    const result = await autoTagArticle(request);

    // Assert
    expect(result.categories).toBeDefined();
    expect(Array.isArray(result.categories)).toBe(true);
  });
});

describe('Knowledge AI Actions - scoreArticleQuality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate overall quality score', async () => {
    // Arrange
    const mockArticle = {
      title: 'Complete Guide to Feature X',
      summary: 'This is a comprehensive guide that covers all aspects of Feature X including setup, configuration, and best practices.',
      body: 'Long detailed content here...'.repeat(50),
      view_count: 500,
      helpful_count: 45,
      not_helpful_count: 5
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockArticle);

    const request: QualityScoringRequest = {
      articleId: 'article_quality'
    };

    // Act
    const result = await scoreArticleQuality(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    expect(result.qualityScore).toBeLessThanOrEqual(100);
    expect(result.rating).toBeDefined();
    expect(['excellent', 'good', 'fair', 'poor']).toContain(result.rating);
  });

  it('should score component dimensions', async () => {
    // Arrange
    const mockArticle = {
      title: 'Test Article',
      summary: 'Test summary',
      body: 'Test content',
      view_count: 100,
      helpful_count: 10,
      not_helpful_count: 2
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockArticle);

    const request: QualityScoringRequest = {
      articleId: 'article_comp'
    };

    // Act
    const result = await scoreArticleQuality(request);

    // Assert
    expect(result.components).toBeDefined();
    expect(result.components.completeness).toBeDefined();
    expect(result.components.clarity).toBeDefined();
    expect(result.components.accuracy).toBeDefined();
    expect(result.components.relevance).toBeDefined();
    expect(result.components.helpfulness).toBeDefined();
  });

  it('should identify quality issues', async () => {
    // Arrange
    const mockArticle = {
      title: 'Short Article',
      summary: 'Too short',
      body: 'Not enough content',
      view_count: 10,
      helpful_count: 1,
      not_helpful_count: 5
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockArticle);

    const request: QualityScoringRequest = {
      articleId: 'article_issues'
    };

    // Act
    const result = await scoreArticleQuality(request);

    // Assert
    expect(result.issues).toBeDefined();
    expect(Array.isArray(result.issues)).toBe(true);
    result.issues.forEach(issue => {
      expect(issue.severity).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(issue.severity);
      expect(issue.issue).toBeDefined();
      expect(issue.suggestion).toBeDefined();
    });
  });

  it('should provide improvement recommendations', async () => {
    // Arrange
    const mockArticle = {
      title: 'Basic Article',
      summary: 'A simple summary that needs improvement',
      body: 'Some basic content',
      view_count: 30,
      helpful_count: 5,
      not_helpful_count: 5
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockArticle);

    const request: QualityScoringRequest = {
      articleId: 'article_improve'
    };

    // Act
    const result = await scoreArticleQuality(request);

    // Assert
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should handle articles with no user feedback', async () => {
    // Arrange
    const mockArticle = {
      title: 'New Article',
      summary: 'Recently published article with good content that explains the topic well.',
      body: 'Detailed content...'.repeat(20),
      view_count: 0,
      helpful_count: null,
      not_helpful_count: null
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockArticle);

    const request: QualityScoringRequest = {
      articleId: 'article_new'
    };

    // Act
    const result = await scoreArticleQuality(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.qualityScore).toBeGreaterThanOrEqual(0);
  });

  it('should rate high-quality articles as excellent', async () => {
    // Arrange
    const mockArticle = {
      title: 'Comprehensive Guide to Advanced Features',
      summary: 'This comprehensive guide covers everything you need to know about advanced features, including detailed explanations and examples.',
      body: 'Very detailed and comprehensive content with examples, screenshots, and step-by-step instructions. '.repeat(100),
      view_count: 1000,
      helpful_count: 95,
      not_helpful_count: 5
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockArticle);

    const request: QualityScoringRequest = {
      articleId: 'article_excellent'
    };

    // Act
    const result = await scoreArticleQuality(request);

    // Assert
    expect(result.qualityScore).toBeGreaterThan(80);
    expect(result.rating).toBe('excellent');
  });
});
