import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn()
  }
}));

import { db } from '../../../src/db';
import knowledgeHooks from '../../../src/hooks/knowledge.hook';

vi.mock('@hotcrm/core', () => ({
  createLogger: () => ({
    info: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    debug: (...args: any[]) => console.debug(...args),
    fatal: (...args: any[]) => console.error(...args),
  }),
  logger: {
    info: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    debug: (...args: any[]) => console.debug(...args),
    fatal: (...args: any[]) => console.error(...args),
  },
}));

const [
  KnowledgeArticleScoringTrigger,
  KnowledgeArticleAIEnhancementTrigger,
  KnowledgeArticleWorkflowTrigger,
  KnowledgeArticleUsageTracker,
  KnowledgeArticleSearchAnalytics
] = knowledgeHooks;

// ─── KnowledgeArticleScoringTrigger ─────────────────────────────────────────

describe('KnowledgeArticleScoringTrigger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(KnowledgeArticleScoringTrigger.name).toBe('KnowledgeArticleScoringTrigger');
    expect(KnowledgeArticleScoringTrigger.object).toBe('knowledge_article');
    expect(KnowledgeArticleScoringTrigger.events).toEqual(['beforeInsert', 'beforeUpdate']);
  });

  it('should calculate quality score for a well-structured article', async () => {
    const article = {
      Title: 'A comprehensive guide to troubleshooting network issues',
      Summary: 'This article covers common network troubleshooting steps including DNS resolution, connectivity checks, and firewall configuration reviews.',
      Content: 'x'.repeat(600),
      Category: 'Technical',
      Keywords: 'network,dns,firewall,connectivity,troubleshooting',
      Tags: ['networking', 'troubleshooting', 'guide'],
      RelatedProductIds: 'prod_1',
      HasAttachments: true,
      Status: 'draft'
    };
    const ctx = { input: { doc: article }, previous: undefined };

    await KnowledgeArticleScoringTrigger.handler(ctx as any);

    expect(article.QualityScore).toBeDefined();
    expect(article.QualityScore).toBeGreaterThanOrEqual(80);
    expect(article.QualityScore).toBeLessThanOrEqual(100);
  });

  it('should calculate lower quality score for a minimal article', async () => {
    const article = {
      Title: 'Short',
      Status: 'draft'
    } as Record<string, any>;
    const ctx = { input: { doc: article }, previous: undefined };

    await KnowledgeArticleScoringTrigger.handler(ctx as any);

    expect(article.QualityScore).toBeDefined();
    expect(article.QualityScore).toBeLessThan(20);
  });

  it('should calculate popularity score only for Published articles', async () => {
    const article = {
      Title: 'Published article with views',
      Content: 'Some content here for testing purposes.',
      Status: 'Published',
      ViewCount: 200,
      HelpfulCount: 8,
      NotHelpfulCount: 2,
      CaseResolutionCount: 15,
      LastModifiedDate: new Date().toISOString()
    } as Record<string, any>;
    const ctx = { input: { doc: article }, previous: undefined };

    await KnowledgeArticleScoringTrigger.handler(ctx as any);

    expect(article.PopularityScore).toBeDefined();
    expect(article.PopularityScore).toBeGreaterThan(0);
  });

  it('should not calculate popularity score for Draft articles', async () => {
    const article = {
      Title: 'Draft article',
      Content: 'Some content.',
      Status: 'draft',
      ViewCount: 500
    } as Record<string, any>;
    const ctx = { input: { doc: article }, previous: undefined };

    await KnowledgeArticleScoringTrigger.handler(ctx as any);

    expect(article.PopularityScore).toBeUndefined();
  });

  it('should calculate helpfulness rating when helpful counts exist', async () => {
    const article = {
      Title: 'Helpful article test',
      Content: 'Content.',
      Status: 'draft',
      HelpfulCount: 75,
      NotHelpfulCount: 25
    } as Record<string, any>;
    const ctx = { input: { doc: article }, previous: undefined };

    await KnowledgeArticleScoringTrigger.handler(ctx as any);

    expect(article.HelpfulnessRating).toBe(75);
  });

  it('should not set helpfulness rating when total feedback is zero', async () => {
    const article = {
      Title: 'No feedback article',
      Content: 'Content.',
      Status: 'draft',
      HelpfulCount: 0,
      NotHelpfulCount: 0
    } as Record<string, any>;
    const ctx = { input: { doc: article }, previous: undefined };

    await KnowledgeArticleScoringTrigger.handler(ctx as any);

    expect(article.HelpfulnessRating).toBeUndefined();
  });

  it('should handle errors gracefully', async () => {
    const ctx = { input: { doc: null }, previous: undefined };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await KnowledgeArticleScoringTrigger.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[knowledge.hook] article scoring failed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

// ─── KnowledgeArticleAIEnhancementTrigger ───────────────────────────────────

describe('KnowledgeArticleAIEnhancementTrigger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(KnowledgeArticleAIEnhancementTrigger.name).toBe('KnowledgeArticleAIEnhancementTrigger');
    expect(KnowledgeArticleAIEnhancementTrigger.events).toEqual(['beforeInsert', 'beforeUpdate']);
  });

  it('should auto-categorize a how-to article on insert', async () => {
    const article = {
      Title: 'How to configure your email client',
      Content: 'This step by step tutorial shows how to set up email.',
      Category: 'Other'
    } as Record<string, any>;
    const ctx = {
      input: { doc: article },
      previous: undefined,
      db: { find: vi.fn().mockResolvedValue([]) }
    };

    await KnowledgeArticleAIEnhancementTrigger.handler(ctx as any);

    expect(article.AICategory).toBe('HowTo');
  });

  it('should classify troubleshooting articles correctly', async () => {
    const article = {
      Title: 'Troubleshoot login errors',
      Content: 'When you encounter an error during login, try these fix steps.',
      Category: 'Other'
    } as Record<string, any>;
    const ctx = {
      input: { doc: article },
      previous: undefined,
      db: { find: vi.fn().mockResolvedValue([]) }
    };

    await KnowledgeArticleAIEnhancementTrigger.handler(ctx as any);

    expect(article.AICategory).toBe('Troubleshooting');
  });

  it('should extract tags from article content', async () => {
    const article = {
      Title: 'Getting started with advanced walkthrough',
      Content: 'This step-by-step guide covers getting started basics and advanced techniques.',
      Category: 'Technical'
    } as Record<string, any>;
    const ctx = {
      input: { doc: article },
      previous: undefined,
      db: { find: vi.fn().mockResolvedValue([]) }
    };

    await KnowledgeArticleAIEnhancementTrigger.handler(ctx as any);

    expect(article.AITags).toBeDefined();
    expect(article.AITags).toContain('GettingStarted');
    expect(article.AITags).toContain('Advanced');
    expect(article.AITags).toContain('StepByStep');
  });

  it('should generate summary when not provided', async () => {
    const article = {
      Title: 'Test Article',
      Content: 'This is a test article with some content that should be summarized. '.repeat(10),
    } as Record<string, any>;
    const ctx = {
      input: { doc: article },
      previous: undefined,
      db: { find: vi.fn().mockResolvedValue([]) }
    };

    await KnowledgeArticleAIEnhancementTrigger.handler(ctx as any);

    expect(article.AISummary).toBeDefined();
    expect(article.AISummary.length).toBeLessThanOrEqual(203); // 200 + "..."
  });

  it('should not generate summary when one already exists', async () => {
    const article = {
      Title: 'Test Article',
      Content: 'Long content here. '.repeat(50),
      Summary: 'Existing summary'
    } as Record<string, any>;
    const ctx = {
      input: { doc: article },
      previous: undefined,
      db: { find: vi.fn().mockResolvedValue([]) }
    };

    await KnowledgeArticleAIEnhancementTrigger.handler(ctx as any);

    expect(article.AISummary).toBeUndefined();
  });

  it('should skip AI enhancement when content has not changed on update', async () => {
    const article = {
      Title: 'Unchanged Article',
      Content: 'Same content',
      Category: 'Other'
    } as Record<string, any>;
    const oldArticle = {
      Title: 'Unchanged Article',
      Content: 'Same content',
      Category: 'Other'
    };
    const ctx = {
      input: { doc: article },
      previous: oldArticle,
      db: { find: vi.fn().mockResolvedValue([]) }
    };

    await KnowledgeArticleAIEnhancementTrigger.handler(ctx as any);

    expect(article.AICategory).toBeUndefined();
    expect(article.AITags).toBeUndefined();
  });

  it('should run AI enhancement when content changes on update', async () => {
    const article = {
      Title: 'Updated FAQ Article',
      Content: 'New frequently asked questions content with faq section.',
      Category: 'Other'
    } as Record<string, any>;
    const oldArticle = {
      Title: 'Updated FAQ Article',
      Content: 'Old content here.',
      Category: 'Other'
    };
    const ctx = {
      input: { doc: article },
      previous: oldArticle,
      db: { find: vi.fn().mockResolvedValue([]) }
    };

    await KnowledgeArticleAIEnhancementTrigger.handler(ctx as any);

    expect(article.AICategory).toBe('FAQ');
  });

  it('should extract keywords from content', async () => {
    const article = {
      Title: 'Integration testing guide',
      Content: 'Integration testing integration testing integration. Technical details about integration approaches.',
      Category: 'Technical'
    } as Record<string, any>;
    const ctx = {
      input: { doc: article },
      previous: undefined,
      db: { find: vi.fn().mockResolvedValue([]) }
    };

    await KnowledgeArticleAIEnhancementTrigger.handler(ctx as any);

    expect(article.AIKeywords).toBeDefined();
    expect(article.AIKeywords).toContain('integration');
  });

  it('should find related articles when keywords exist', async () => {
    const relatedArticle = { id: 'art_related_1' };
    const article = {
      Title: 'Test related articles',
      Content: 'Testing related article discovery with keywords.',
      Category: 'Technical'
    } as Record<string, any>;
    const ctx = {
      input: { doc: article },
      previous: undefined,
      ql: { find: vi.fn().mockResolvedValue([relatedArticle]) }
    };

    await KnowledgeArticleAIEnhancementTrigger.handler(ctx as any);

    expect(article.RelatedArticleIds).toBeDefined();
    expect(article.RelatedArticleIds).toContain('art_related_1');
  });

  it('should handle errors gracefully', async () => {
    const ctx = { input: { doc: null }, previous: undefined };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await KnowledgeArticleAIEnhancementTrigger.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[knowledge.hook] AI enhancement failed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

// ─── KnowledgeArticleWorkflowTrigger ────────────────────────────────────────

describe('KnowledgeArticleWorkflowTrigger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(KnowledgeArticleWorkflowTrigger.name).toBe('KnowledgeArticleWorkflowTrigger');
    expect(KnowledgeArticleWorkflowTrigger.events).toEqual(['beforeUpdate']);
  });

  it('should track status change to Published and set PublishedDate', async () => {
    const article = {
      id: 'art_1',
      Status: 'Published',
      ArticleNumber: 'KA-001'
    } as Record<string, any>;
    const oldArticle = { Status: 'draft' };
    const ctx = {
      input: { doc: article },
      previous: oldArticle,
      user: { id: 'user_1' }
    };

    await KnowledgeArticleWorkflowTrigger.handler(ctx as any);

    expect(article.PublishedDate).toBeDefined();
    expect(article.PublishedByUserId).toBe('user_1');
  });

  it('should set NextReviewDate for Published articles without one', async () => {
    const article = {
      id: 'art_2',
      Status: 'Published',
      Category: 'Technical',
      ArticleNumber: 'KA-002'
    } as Record<string, any>;
    const oldArticle = { Status: 'draft' };
    const ctx = {
      input: { doc: article },
      previous: oldArticle,
      user: { id: 'user_1' }
    };

    await KnowledgeArticleWorkflowTrigger.handler(ctx as any);

    expect(article.NextReviewDate).toBeDefined();
    // Technical category = 6 months review
    const reviewDate = new Date(article.NextReviewDate);
    const now = new Date();
    const monthsDiff = (reviewDate.getFullYear() - now.getFullYear()) * 12 + (reviewDate.getMonth() - now.getMonth());
    expect(monthsDiff).toBe(6);
  });

  it('should set 3-month review for ReleaseNotes category', async () => {
    const article = {
      id: 'art_3',
      Status: 'Published',
      Category: 'ReleaseNotes',
      NextReviewDate: undefined
    } as Record<string, any>;
    const ctx = {
      input: { doc: article },
      previous: { Status: 'Published' },
      user: { id: 'user_1' }
    };

    await KnowledgeArticleWorkflowTrigger.handler(ctx as any);

    expect(article.NextReviewDate).toBeDefined();
    const reviewDate = new Date(article.NextReviewDate);
    const now = new Date();
    const monthsDiff = (reviewDate.getFullYear() - now.getFullYear()) * 12 + (reviewDate.getMonth() - now.getMonth());
    expect(monthsDiff).toBe(3);
  });

  it('should auto-archive old articles with low usage', async () => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 3);

    const article = {
      id: 'art_4',
      Status: 'Published',
      ArticleNumber: 'KA-004',
      PublishedDate: twoYearsAgo.toISOString(),
      ViewCountLast6Months: 5,
      HelpfulnessRating: 30
    } as Record<string, any>;
    const ctx = {
      input: { doc: article },
      previous: { Status: 'Published' },
      user: { id: 'user_1' }
    };

    await KnowledgeArticleWorkflowTrigger.handler(ctx as any);

    expect(article.Status).toBe('Archived');
    expect(article.ArchivedDate).toBeDefined();
    expect(article.ArchivedReason).toContain('Auto-archived');
  });

  it('should not auto-archive recent articles', async () => {
    const article = {
      id: 'art_5',
      Status: 'Published',
      ArticleNumber: 'KA-005',
      PublishedDate: new Date().toISOString(),
      ViewCountLast6Months: 5,
      HelpfulnessRating: 30
    } as Record<string, any>;
    const ctx = {
      input: { doc: article },
      previous: { Status: 'Published' },
      user: { id: 'user_1' }
    };

    await KnowledgeArticleWorkflowTrigger.handler(ctx as any);

    expect(article.Status).toBe('Published');
  });

  it('should track archiving status change', async () => {
    const article = {
      id: 'art_6',
      Status: 'Archived',
      ArticleNumber: 'KA-006'
    } as Record<string, any>;
    const oldArticle = { Status: 'Published' };
    const ctx = {
      input: { doc: article },
      previous: oldArticle,
      user: { id: 'user_2' }
    };

    await KnowledgeArticleWorkflowTrigger.handler(ctx as any);

    expect(article.ArchivedDate).toBeDefined();
    expect(article.ArchivedByUserId).toBe('user_2');
  });

  it('should handle errors gracefully', async () => {
    const ctx = {
      input: { doc: null },
      previous: { Status: 'draft' },
      user: { id: 'user_1' }
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await KnowledgeArticleWorkflowTrigger.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[knowledge.hook] workflow processing failed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

// ─── KnowledgeArticleUsageTracker ───────────────────────────────────────────

describe('KnowledgeArticleUsageTracker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(KnowledgeArticleUsageTracker.name).toBe('KnowledgeArticleUsageTracker');
    expect(KnowledgeArticleUsageTracker.object).toBe('case');
    expect(KnowledgeArticleUsageTracker.events).toEqual(['afterUpdate']);
  });

  it('should increment article usage when case is resolved with linked knowledge', async () => {
    const caseRecord = {
      CaseNumber: 'CS-001',
      Status: 'resolved',
      AIRelatedKnowledge: 'art_1, art_2'
    };
    const oldCase = { Status: 'open' };
    const mockDbFind = vi.fn()
      .mockResolvedValueOnce([{ id: 'art_1', CaseResolutionCount: 5 }])
      .mockResolvedValueOnce([{ id: 'art_2', CaseResolutionCount: 10 }]);
    const mockDbUpdate = vi.fn().mockResolvedValue({});
    const ctx = {
      result: caseRecord,
      previous: oldCase,
      ql: {
        find: mockDbFind,
        doc: { update: mockDbUpdate }
      }
    };

    await KnowledgeArticleUsageTracker.handler(ctx as any);

    expect(mockDbFind).toHaveBeenCalledTimes(2);
    expect(mockDbUpdate).toHaveBeenCalledTimes(2);
    expect(mockDbUpdate).toHaveBeenCalledWith('knowledge_article', 'art_1', expect.objectContaining({
      CaseResolutionCount: 6
    }));
    expect(mockDbUpdate).toHaveBeenCalledWith('knowledge_article', 'art_2', expect.objectContaining({
      CaseResolutionCount: 11
    }));
  });

  it('should not track when case is not resolved', async () => {
    const caseRecord = {
      CaseNumber: 'CS-002',
      Status: 'open',
      AIRelatedKnowledge: 'art_1'
    };
    const ctx = {
      result: caseRecord,
      previous: { Status: 'new' },
      ql: { find: vi.fn(), doc: { update: vi.fn() } }
    };

    await KnowledgeArticleUsageTracker.handler(ctx as any);

    expect(ctx.ql.find).not.toHaveBeenCalled();
  });

  it('should not track when case was already resolved', async () => {
    const caseRecord = {
      CaseNumber: 'CS-003',
      Status: 'resolved',
      AIRelatedKnowledge: 'art_1'
    };
    const ctx = {
      result: caseRecord,
      previous: { Status: 'resolved' },
      ql: { find: vi.fn(), doc: { update: vi.fn() } }
    };

    await KnowledgeArticleUsageTracker.handler(ctx as any);

    expect(ctx.ql.find).not.toHaveBeenCalled();
  });

  it('should not track when no knowledge articles are linked', async () => {
    const caseRecord = {
      CaseNumber: 'CS-004',
      Status: 'resolved'
    };
    const ctx = {
      result: caseRecord,
      previous: { Status: 'open' },
      db: { find: vi.fn(), doc: { update: vi.fn() } }
    };

    await KnowledgeArticleUsageTracker.handler(ctx as any);

    expect(ctx.db.find).not.toHaveBeenCalled();
  });

  it('should handle article not found during usage increment', async () => {
    const caseRecord = {
      CaseNumber: 'CS-005',
      Status: 'resolved',
      AIRelatedKnowledge: 'art_missing'
    };
    const mockDbFind = vi.fn().mockResolvedValueOnce([]);
    const mockDbUpdate = vi.fn();
    const ctx = {
      result: caseRecord,
      previous: { Status: 'open' },
      ql: {
        find: mockDbFind,
        doc: { update: mockDbUpdate }
      }
    };

    await KnowledgeArticleUsageTracker.handler(ctx as any);

    expect(mockDbFind).toHaveBeenCalled();
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const caseRecord = {
      CaseNumber: 'CS-ERR',
      Status: 'resolved',
      AIRelatedKnowledge: 'art_err'
    };
    const mockDbFind = vi.fn().mockRejectedValueOnce(new Error('DB error'));
    const ctx = {
      result: caseRecord,
      previous: { Status: 'open' },
      db: {
        find: mockDbFind,
        doc: { update: vi.fn() }
      }
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await KnowledgeArticleUsageTracker.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[knowledge.hook] incrementArticleUsage failed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

// ─── KnowledgeArticleSearchAnalytics ────────────────────────────────────────

describe('KnowledgeArticleSearchAnalytics', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(KnowledgeArticleSearchAnalytics.name).toBe('KnowledgeArticleSearchAnalytics');
    expect(KnowledgeArticleSearchAnalytics.object).toBe('knowledge_article');
    expect(KnowledgeArticleSearchAnalytics.events).toEqual(['afterFind']);
  });

  it('should log search analytics', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const ctx = {};
    await KnowledgeArticleSearchAnalytics.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith('📈 Search analytics tracked');

    consoleSpy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      throw new Error('Log failed');
    });

    const ctx = {};
    await KnowledgeArticleSearchAnalytics.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[knowledge.hook] search analytics failed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });
});
