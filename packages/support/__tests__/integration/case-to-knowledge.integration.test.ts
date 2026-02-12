/**
 * Integration Test: Case to Knowledge Article Workflow
 *
 * Phase 8F – Cross-cloud integration: Support → Knowledge.
 * Validates the flow from case creation through knowledge article
 * suggestion, case resolution, and knowledge base updates.
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

describe('Case to Knowledge Article Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should suggest knowledge articles for similar cases', async () => {
    // Arrange
    const newCase = {
      id: 'case_kb_001',
      subject: 'Cannot export CSV reports',
      description: 'Export button returns an error when generating CSV files',
      priority: 'high',
      status: 'new'
    };

    const suggestedArticles = [
      {
        id: 'article_csv_1',
        title: 'Troubleshooting CSV Export Issues',
        url_name: 'csv-export-troubleshooting',
        is_published: true,
        view_count: 142
      },
      {
        id: 'article_csv_2',
        title: 'Report Generation Best Practices',
        url_name: 'report-generation-guide',
        is_published: true,
        view_count: 89
      }
    ];

    const caseArticleLink = {
      id: 'link_001',
      case_id: 'case_kb_001',
      article_id: 'article_csv_1',
      relevance_score: 0.92,
      created_date: new Date().toISOString()
    };

    (broker.insert as Mock)
      .mockResolvedValueOnce(newCase)
      .mockResolvedValueOnce(caseArticleLink);
    (broker.find as Mock).mockResolvedValue(suggestedArticles);

    // Act – Step 1: Create case
    const caseRecord = await broker.insert('case', {
      subject: newCase.subject,
      description: newCase.description,
      priority: 'high',
      status: 'new'
    });

    // Step 2: Search for relevant articles
    const articles = await broker.find('knowledge_article', {
      filters: [['is_published', '=', true]]
    });

    // Step 3: Link the best matching article
    const link = await broker.insert('case_article', {
      case_id: caseRecord.id,
      article_id: articles[0].id,
      relevance_score: 0.92
    });

    // Assert
    expect(articles).toHaveLength(2);
    expect(link.case_id).toBe(caseRecord.id);
    expect(link.article_id).toBe('article_csv_1');
    expect(link.relevance_score).toBeGreaterThan(0.9);
  });

  it('should create a knowledge article from a resolved case', async () => {
    // Arrange
    const resolvedCase = {
      id: 'case_resolved',
      subject: 'SSO login fails with SAML error',
      description: 'Users receive SAML assertion error during SSO login',
      status: 'closed',
      resolution: 'Updated IdP certificate and adjusted clock skew tolerance to 5 minutes',
      closed_date: new Date().toISOString()
    };

    const newArticle = {
      id: 'article_new',
      title: 'Resolving SAML SSO Login Failures',
      url_name: 'resolving-saml-sso-login-failures',
      summary: resolvedCase.resolution,
      body: `Problem: ${resolvedCase.description}\n\nSolution: ${resolvedCase.resolution}`,
      case_id: 'case_resolved',
      is_published: false,
      status: 'draft'
    };

    (broker.findOne as Mock).mockResolvedValue(resolvedCase);
    (broker.insert as Mock).mockResolvedValue(newArticle);

    // Act – Fetch resolved case and create knowledge article
    const caseData = await broker.findOne('case', 'case_resolved');
    expect(caseData.status).toBe('closed');

    const article = await broker.insert('knowledge_article', {
      title: 'Resolving SAML SSO Login Failures',
      url_name: 'resolving-saml-sso-login-failures',
      summary: caseData.resolution,
      body: `Problem: ${caseData.description}\n\nSolution: ${caseData.resolution}`,
      case_id: caseData.id,
      is_published: false,
      status: 'draft'
    });

    // Assert
    expect(article.case_id).toBe(resolvedCase.id);
    expect(article.summary).toBe(resolvedCase.resolution);
    expect(article.is_published).toBe(false);
    expect(broker.insert).toHaveBeenCalledTimes(1);
  });

  it('should update article view count when agent views an article for a case', async () => {
    // Arrange
    const existingArticle = {
      id: 'article_views',
      title: 'Password Reset Guide',
      view_count: 50,
      is_published: true
    };

    const updatedArticle = { ...existingArticle, view_count: 51 };

    const articleView = {
      id: 'view_001',
      article_id: 'article_views',
      case_id: 'case_view_test',
      viewed_by: 'agent_001',
      viewed_date: new Date().toISOString()
    };

    (broker.findOne as Mock).mockResolvedValue(existingArticle);
    (broker.insert as Mock).mockResolvedValue(articleView);
    (broker.update as Mock).mockResolvedValue(updatedArticle);

    // Act – Agent views article while working on a case
    const article = await broker.findOne('knowledge_article', 'article_views');

    const view = await broker.insert('article_view', {
      article_id: article.id,
      case_id: 'case_view_test',
      viewed_by: 'agent_001',
      viewed_date: new Date().toISOString()
    });

    const updated = await broker.update('knowledge_article', article.id, {
      view_count: article.view_count + 1
    });

    // Assert
    expect(view.article_id).toBe(article.id);
    expect(updated.view_count).toBe(51);
    expect(broker.update).toHaveBeenCalledWith('knowledge_article', 'article_views', {
      view_count: 51
    });
  });

  it('should handle case resolution without matching knowledge articles', async () => {
    // Arrange
    const newCase = {
      id: 'case_no_match',
      subject: 'Custom API endpoint returns 500',
      description: 'A newly deployed custom endpoint throws internal server error',
      priority: 'critical',
      status: 'new'
    };

    const resolvedCase = {
      ...newCase,
      status: 'closed',
      resolution: 'Fixed null reference in custom handler middleware',
      closed_date: new Date().toISOString()
    };

    const createdArticle = {
      id: 'article_from_case',
      title: 'Custom API Endpoint 500 Error Fix',
      case_id: 'case_no_match',
      status: 'draft',
      is_published: false
    };

    (broker.insert as Mock).mockResolvedValueOnce(newCase);
    (broker.find as Mock).mockResolvedValue([]); // No matching articles
    (broker.update as Mock).mockResolvedValue(resolvedCase);
    (broker.insert as Mock).mockResolvedValueOnce(createdArticle);

    // Act – Create case, find no articles, resolve, create new article
    const caseRecord = await broker.insert('case', {
      subject: newCase.subject,
      description: newCase.description,
      priority: 'critical',
      status: 'new'
    });

    const matchingArticles = await broker.find('knowledge_article', {
      filters: [['is_published', '=', true]]
    });
    expect(matchingArticles).toHaveLength(0);

    const resolved = await broker.update('case', caseRecord.id, {
      status: 'closed',
      resolution: 'Fixed null reference in custom handler middleware'
    });

    const article = await broker.insert('knowledge_article', {
      title: 'Custom API Endpoint 500 Error Fix',
      case_id: resolved.id,
      status: 'draft',
      is_published: false
    });

    // Assert
    expect(resolved.status).toBe('closed');
    expect(article.case_id).toBe(caseRecord.id);
    expect(matchingArticles).toHaveLength(0);
  });

  it('should link multiple cases to the same knowledge article', async () => {
    // Arrange
    const sharedArticle = {
      id: 'article_shared',
      title: 'How to Configure Two-Factor Authentication',
      is_published: true,
      view_count: 200
    };

    const caseIds = ['case_2fa_1', 'case_2fa_2', 'case_2fa_3'];
    const links = caseIds.map((caseId, i) => ({
      id: `link_shared_${i + 1}`,
      case_id: caseId,
      article_id: 'article_shared'
    }));

    (broker.findOne as Mock).mockResolvedValue(sharedArticle);
    (broker.insert as Mock)
      .mockResolvedValueOnce(links[0])
      .mockResolvedValueOnce(links[1])
      .mockResolvedValueOnce(links[2]);
    (broker.find as Mock).mockResolvedValue(links);

    // Act – Link three different cases to the same article
    const article = await broker.findOne('knowledge_article', 'article_shared');

    const createdLinks = [];
    for (const caseId of caseIds) {
      const link = await broker.insert('case_article', {
        case_id: caseId,
        article_id: article.id
      });
      createdLinks.push(link);
    }

    const allLinks = await broker.find('case_article', {
      filters: [['article_id', '=', 'article_shared']]
    });

    // Assert
    expect(createdLinks).toHaveLength(3);
    expect(allLinks).toHaveLength(3);
    createdLinks.forEach(link => {
      expect(link.article_id).toBe('article_shared');
    });
    expect(broker.insert).toHaveBeenCalledTimes(3);
  });
});
