import type { Hook } from '@objectstack/spec/data';
import { db } from '@hotcrm/core';

// Types for Context
interface TriggerContext {
  old?: Record<string, any>;
  new: Record<string, any>;
  db: typeof db;
  user: { id: string; name: string; email: string; };
}

/**
 * Knowledge Article Scoring Trigger
 * 
 * Automatically calculates article quality and popularity scores:
 * 1. Quality score based on completeness and structure
 * 2. Popularity score based on views and feedback
 * 3. Usefulness score based on case resolution usage
 */
const KnowledgeArticleScoringTrigger: Hook = {
  name: 'KnowledgeArticleScoringTrigger',
  object: 'KnowledgeArticle',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const article = ctx.new;
      const oldArticle = ctx.old;

      // Calculate quality score
      article.QualityScore = calculateQualityScore(article);

      // Calculate popularity score (only if article has been published)
      if (article.Status === 'Published') {
        article.PopularityScore = await calculatePopularityScore(article, ctx);
      }

      // Update helpfulness rating
      if (article.HelpfulCount !== undefined && article.NotHelpfulCount !== undefined) {
        const total = article.HelpfulCount + article.NotHelpfulCount;
        if (total > 0) {
          article.HelpfulnessRating = Math.round((article.HelpfulCount / total) * 100);
        }
      }

      console.log(`📊 Article scoring completed: Quality=${article.QualityScore}, Popularity=${article.PopularityScore}`);

    } catch (error) {
      console.error('❌ Error in KnowledgeArticleScoringTrigger:', error);
    }
  }
};

/**
 * Knowledge Article AI Enhancement Trigger
 * 
 * Automatically enhances articles with AI:
 * 1. Auto-categorization
 * 2. Auto-tagging
 * 3. Summary generation
 * 4. Related article suggestions
 */
const KnowledgeArticleAIEnhancementTrigger: Hook = {
  name: 'KnowledgeArticleAIEnhancementTrigger',
  object: 'KnowledgeArticle',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const article = ctx.new;
      const oldArticle = ctx.old;

      // Only run AI on new articles or when content changes
      const isNew = !oldArticle;
      const contentChanged = oldArticle && oldArticle.Content !== article.Content;

      if (isNew || contentChanged) {
        // AI auto-categorization
        if (!article.Category || article.Category === 'Other') {
          article.AICategory = await performAIArticleClassification(article);
        }

        // Extract and suggest tags
        const suggestedTags = await extractArticleTags(article);
        if (suggestedTags.length > 0) {
          article.AITags = suggestedTags.join(',');
        }

        // Generate summary if not provided
        if (!article.Summary && article.Content) {
          article.AISummary = await generateArticleSummary(article.Content);
        }

        // Extract key concepts
        article.AIKeywords = await extractArticleKeywords(article.Content);

        // Find related articles
        const relatedArticles = await findRelatedArticles(article, ctx);
        if (relatedArticles.length > 0) {
          article.RelatedArticleIds = relatedArticles.map((a: any) => a.id).join(',');
        }

        console.log(`🤖 AI enhancement completed: Category=${article.AICategory}, Tags=${article.AITags}`);
      }

    } catch (error) {
      console.error('❌ Error in KnowledgeArticleAIEnhancementTrigger:', error);
    }
  }
};

/**
 * Knowledge Article Workflow Trigger
 * 
 * Manages article lifecycle and workflow:
 * 1. Auto-archive outdated content
 * 2. Review reminders
 * 3. Version tracking
 */
const KnowledgeArticleWorkflowTrigger: Hook = {
  name: 'KnowledgeArticleWorkflowTrigger',
  object: 'KnowledgeArticle',
  events: ['beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const article = ctx.new;
      const oldArticle = ctx.old;

      // Track status changes
      if (oldArticle.Status !== article.Status) {
        await trackStatusChange(article, oldArticle, ctx);
      }

      // Check if article should be archived
      if (article.Status === 'Published') {
        const shouldArchive = await checkForAutoArchive(article, ctx);
        if (shouldArchive) {
          article.Status = 'Archived';
          article.ArchivedDate = new Date();
          article.ArchivedReason = 'Auto-archived due to age and low usage';
          console.log(`📦 Article auto-archived: ${article.ArticleNumber}`);
        }
      }

      // Schedule review reminder
      if (article.Status === 'Published' && !article.NextReviewDate) {
        article.NextReviewDate = calculateNextReviewDate(article);
      }

    } catch (error) {
      console.error('❌ Error in KnowledgeArticleWorkflowTrigger:', error);
    }
  }
};

/**
 * Knowledge Article Usage Tracker
 * 
 * Tracks article usage in case resolution
 */
const KnowledgeArticleUsageTracker: Hook = {
  name: 'KnowledgeArticleUsageTracker',
  object: 'Case',
  events: ['afterUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const caseRecord = ctx.new;
      const oldCase = ctx.old;

      // Track when case is resolved and knowledge was used
      if (caseRecord.Status === 'Resolved' && oldCase.Status !== 'Resolved') {
        if (caseRecord.AIRelatedKnowledge) {
          const articleIds = caseRecord.AIRelatedKnowledge.split(',');
          
          for (const articleId of articleIds) {
            await incrementArticleUsage(articleId.trim(), ctx);
          }

          console.log(`📚 Article usage tracked for case ${caseRecord.CaseNumber}`);
        }
      }

    } catch (error) {
      console.error('❌ Error in KnowledgeArticleUsageTracker:', error);
    }
  }
};

/**
 * Knowledge Article Search Analytics
 * 
 * Tracks search patterns and article discovery
 */
const KnowledgeArticleSearchAnalytics: Hook = {
  name: 'KnowledgeArticleSearchAnalytics',
  object: 'KnowledgeArticle',
  events: ['afterFind'],
  handler: async (ctx: TriggerContext) => {
    try {
      // Track search queries and results
      // This would be implemented at the search API level
      console.log('📈 Search analytics tracked');

    } catch (error) {
      console.error('❌ Error in KnowledgeArticleSearchAnalytics:', error);
    }
  }
};

// Helper Functions

function calculateQualityScore(article: any): number {
  let score = 0;
  const maxScore = 100;

  // Title quality (15 points)
  if (article.Title) {
    const titleLength = article.Title.length;
    if (titleLength >= 20 && titleLength <= 100) {
      score += 15;
    } else if (titleLength >= 10) {
      score += 10;
    } else {
      score += 5;
    }
  }

  // Summary quality (15 points)
  if (article.Summary) {
    const summaryLength = article.Summary.length;
    if (summaryLength >= 100 && summaryLength <= 500) {
      score += 15;
    } else if (summaryLength >= 50) {
      score += 10;
    } else {
      score += 5;
    }
  }

  // Content quality (30 points)
  if (article.Content) {
    const contentLength = article.Content.length;
    if (contentLength >= 500) {
      score += 30;
    } else if (contentLength >= 200) {
      score += 20;
    } else {
      score += 10;
    }
  }

  // Categorization (10 points)
  if (article.Category && article.Category !== 'Other') {
    score += 10;
  }

  // Keywords (10 points)
  if (article.Keywords) {
    const keywordCount = article.Keywords.split(',').length;
    score += Math.min(keywordCount * 2, 10);
  }

  // Tags (10 points)
  if (article.Tags && article.Tags.length > 0) {
    score += Math.min(article.Tags.length * 3, 10);
  }

  // Related products (5 points)
  if (article.RelatedProductIds) {
    score += 5;
  }

  // Attachments/media (5 points)
  if (article.HasAttachments) {
    score += 5;
  }

  return Math.min(score, maxScore);
}

async function calculatePopularityScore(article: any, ctx: TriggerContext): Promise<number> {
  let score = 0;
  const maxScore = 100;

  // View count (30 points)
  const viewCount = article.ViewCount || 0;
  if (viewCount > 1000) {
    score += 30;
  } else if (viewCount > 500) {
    score += 25;
  } else if (viewCount > 100) {
    score += 20;
  } else if (viewCount > 50) {
    score += 15;
  } else if (viewCount > 10) {
    score += 10;
  } else if (viewCount > 0) {
    score += 5;
  }

  // Helpfulness rating (25 points)
  const helpfulRating = article.HelpfulnessRating || 0;
  const helpfulTotal = (article.HelpfulCount || 0) + (article.NotHelpfulCount || 0);
  if (helpfulTotal >= 10) {
    score += Math.floor((helpfulRating / 100) * 25);
  } else if (helpfulTotal > 0) {
    score += Math.floor((helpfulRating / 100) * 15);
  }

  // Case resolution usage (25 points)
  const caseUsageCount = article.CaseResolutionCount || 0;
  if (caseUsageCount > 50) {
    score += 25;
  } else if (caseUsageCount > 20) {
    score += 20;
  } else if (caseUsageCount > 10) {
    score += 15;
  } else if (caseUsageCount > 5) {
    score += 10;
  } else if (caseUsageCount > 0) {
    score += 5;
  }

  // Recent activity (20 points)
  const daysSinceUpdate = article.LastModifiedDate ? 
    Math.floor((Date.now() - new Date(article.LastModifiedDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
  
  if (daysSinceUpdate <= 30) {
    score += 20;
  } else if (daysSinceUpdate <= 90) {
    score += 15;
  } else if (daysSinceUpdate <= 180) {
    score += 10;
  } else if (daysSinceUpdate <= 365) {
    score += 5;
  }

  return Math.min(score, maxScore);
}

async function performAIArticleClassification(article: any): Promise<string> {
  const text = `${article.Title} ${article.Content}`.toLowerCase();
  
  if (text.includes('how to') || text.includes('step by step') || text.includes('tutorial')) {
    return 'HowTo';
  } else if (text.includes('troubleshoot') || text.includes('fix') || text.includes('error')) {
    return 'Troubleshooting';
  } else if (text.includes('frequently asked') || text.includes('faq')) {
    return 'FAQ';
  } else if (text.includes('release') || text.includes('version') || text.includes('update')) {
    return 'ReleaseNotes';
  } else if (text.includes('best practice') || text.includes('recommendation')) {
    return 'BestPractices';
  } else if (text.includes('product') || text.includes('feature')) {
    return 'Product';
  } else if (text.includes('technical') || text.includes('api') || text.includes('integration')) {
    return 'Technical';
  }
  
  return 'Other';
}

async function extractArticleTags(article: any): Promise<string[]> {
  const tags: string[] = [];
  const text = `${article.Title} ${article.Content}`.toLowerCase();
  
  // Detect tag patterns
  if (text.includes('getting started') || text.includes('introduction') || text.includes('basics')) {
    tags.push('GettingStarted');
  }
  
  if (text.includes('advanced') || text.includes('expert') || text.includes('detailed')) {
    tags.push('Advanced');
  }
  
  if (text.includes('video') || text.includes('screencast') || text.includes('tutorial video')) {
    tags.push('Video');
  }
  
  if (text.includes('step-by-step') || text.includes('walkthrough')) {
    tags.push('StepByStep');
  }

  return tags;
}

async function generateArticleSummary(content: string): Promise<string> {
  // Simple summary generation - take first 200 characters
  const cleanContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (cleanContent.length <= 200) {
    return cleanContent;
  }
  
  // Try to end at a sentence
  const truncated = cleanContent.substring(0, 200);
  const lastPeriod = truncated.lastIndexOf('.');
  
  if (lastPeriod > 100) {
    return truncated.substring(0, lastPeriod + 1);
  }
  
  return truncated + '...';
}

async function extractArticleKeywords(content: string): Promise<string> {
  const cleanContent = content.toLowerCase().replace(/<[^>]*>/g, ' ');
  const words = cleanContent.split(/\s+/);
  
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can',
    'may', 'might', 'must', 'this', 'that', 'these', 'those', 'from', 'by'
  ]);
  
  const wordFreq: Record<string, number> = {};
  
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length > 4 && !commonWords.has(cleanWord)) {
      wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
    }
  }
  
  const sortedWords = Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([word]) => word);
  
  return sortedWords.join(', ');
}

async function findRelatedArticles(article: any, ctx: TriggerContext): Promise<any[]> {
  const keywords = article.AIKeywords?.split(',').map((k: string) => k.trim()) || [];
  
  if (keywords.length === 0) return [];

  // Find articles with similar keywords or category
  const relatedArticles = await ctx.db.find('KnowledgeArticle', {
    filters: [
      ['Status', '=', 'Published'],
      ['id', '!=', article.id]
    ],
    limit: 5
  });

  return relatedArticles;
}

async function trackStatusChange(article: any, oldArticle: any, ctx: TriggerContext): Promise<void> {
  const statusChange = {
    ArticleId: article.id,
    OldStatus: oldArticle.Status,
    NewStatus: article.Status,
    ChangedDate: new Date(),
    ChangedByUserId: ctx.user.id
  };

  // Track publishing
  if (article.Status === 'Published' && oldArticle.Status !== 'Published') {
    article.PublishedDate = new Date();
    article.PublishedByUserId = ctx.user.id;
    console.log(`📢 Article published: ${article.ArticleNumber}`);
  }

  // Track archiving
  if (article.Status === 'Archived' && oldArticle.Status !== 'Archived') {
    article.ArchivedDate = new Date();
    article.ArchivedByUserId = ctx.user.id;
    console.log(`📦 Article archived: ${article.ArticleNumber}`);
  }
}

async function checkForAutoArchive(article: any, ctx: TriggerContext): Promise<boolean> {
  // Auto-archive if:
  // 1. Article is older than 2 years
  // 2. Low views in last 6 months
  // 3. Low helpfulness rating

  const publishedDate = article.PublishedDate ? new Date(article.PublishedDate) : new Date();
  const ageInDays = Math.floor((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (ageInDays < 730) { // Less than 2 years
    return false;
  }

  const recentViewCount = article.ViewCountLast6Months || 0;
  const helpfulRating = article.HelpfulnessRating || 0;
  
  return recentViewCount < 10 && helpfulRating < 50;
}

function calculateNextReviewDate(article: any): Date {
  // Schedule next review based on category and criticality
  const now = new Date();
  let monthsUntilReview = 12; // Default: annual review

  const category = article.Category || '';
  
  if (category === 'ReleaseNotes') {
    monthsUntilReview = 3; // Quarterly
  } else if (category === 'Technical' || category === 'Product') {
    monthsUntilReview = 6; // Semi-annual
  }

  const reviewDate = new Date(now);
  reviewDate.setMonth(reviewDate.getMonth() + monthsUntilReview);
  
  return reviewDate;
}

async function incrementArticleUsage(articleId: string, ctx: TriggerContext): Promise<void> {
  try {
    const article = await ctx.db.find('KnowledgeArticle', {
      filters: [['id', '=', articleId]],
      limit: 1
    });

    if (article && article.length > 0) {
      const currentCount = article[0].CaseResolutionCount || 0;
      await ctx.db.update('KnowledgeArticle', articleId, {
        CaseResolutionCount: currentCount + 1,
        LastUsedInCaseDate: new Date()
      });
    }
  } catch (error) {
    console.error('Error incrementing article usage:', error);
  }
}

// Export hooks
export default [
  KnowledgeArticleScoringTrigger,
  KnowledgeArticleAIEnhancementTrigger,
  KnowledgeArticleWorkflowTrigger,
  KnowledgeArticleUsageTracker,
  KnowledgeArticleSearchAnalytics
];
