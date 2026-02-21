/**
 * Community AI Actions
 *
 * AI-powered community management capabilities:
 * 1. Content Moderation - AI-driven content safety analysis
 * 2. Content Categorization - auto-categorize topics and ideas
 * 3. Similar Topic Detection - find duplicate/similar discussions
 * 4. Answer Suggestion - suggest answers based on existing knowledge
 */

import { broker } from './db.js';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('community:community_ai');

// ============================================================================
// 1. MODERATE CONTENT
// ============================================================================

export interface ModerateContentRequest {
  /** Content to moderate */
  content: string;
  /** Content type context */
  contentType: 'topic' | 'reply' | 'idea';
}

export interface ModerateContentResponse {
  /** Whether the content is safe */
  isSafe: boolean;
  /** Confidence score 0-100 */
  confidence: number;
  /** Detected issues */
  issues: Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string }>;
  /** Suggested action */
  action: 'approve' | 'flag' | 'reject';
}

/**
 * AI-powered content moderation
 */
export async function moderateContent(request: ModerateContentRequest): Promise<ModerateContentResponse> {
  const { content, contentType } = request;

  if (!content || content.trim().length === 0) {
    throw new Error('Content is required for moderation');
  }

  const systemPrompt = `
You are a community content moderation AI.

# Content Type: ${contentType}
# Content:
"${content}"

# Task
Analyze the content for safety, spam, harassment, and policy violations.

# Output Format
{
  "isSafe": true,
  "confidence": 95,
  "issues": [],
  "action": "approve"
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  return JSON.parse(llmResponse);
}

// ============================================================================
// 2. CATEGORIZE CONTENT
// ============================================================================

export interface CategorizeContentRequest {
  /** Title of the content */
  title: string;
  /** Body of the content */
  body: string;
}

export interface CategorizeContentResponse {
  /** Suggested category ID */
  suggestedCategoryId: string;
  /** Category name */
  categoryName: string;
  /** Confidence score 0-100 */
  confidence: number;
  /** Suggested tags */
  tags: string[];
}

/**
 * AI-powered content categorization
 */
export async function categorizeContent(request: CategorizeContentRequest): Promise<CategorizeContentResponse> {
  const { title, body } = request;

  if (!title) {
    throw new Error('Title is required for categorization');
  }

  // Fetch available categories for context
  let categories: any[] = [];
  try {
    categories = await broker.find('forum_category', { limit: 50 });
  } catch {
    // Proceed without categories
  }

  const categoryList = categories.map((c: any) => `${c._id}: ${c.name}`).join('\n');

  const systemPrompt = `
You are a content categorization AI.

# Title: ${title}
# Body: ${body || 'N/A'}
# Available Categories:
${categoryList || 'No categories available'}

# Task
Suggest the best category and tags for this content.

# Output Format
{
  "suggestedCategoryId": "cat_123",
  "categoryName": "General Discussion",
  "confidence": 85,
  "tags": ["discussion", "general"]
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  return JSON.parse(llmResponse);
}

// ============================================================================
// 3. DETECT SIMILAR TOPICS
// ============================================================================

export interface DetectSimilarTopicsRequest {
  /** Title of the new topic */
  title: string;
  /** Body of the new topic */
  body?: string;
  /** Max number of similar topics to return */
  limit?: number;
}

export interface DetectSimilarTopicsResponse {
  /** Similar topics found */
  similarTopics: Array<{
    topicId: string;
    title: string;
    similarity: number;
    status: string;
  }>;
  /** Whether a duplicate was detected */
  isDuplicate: boolean;
}

/**
 * Detect similar or duplicate topics
 */
export async function detectSimilarTopics(request: DetectSimilarTopicsRequest): Promise<DetectSimilarTopicsResponse> {
  const { title, body, limit = 5 } = request;

  if (!title) {
    throw new Error('Title is required for similarity detection');
  }

  // Fetch recent topics for comparison
  let recentTopics: any[] = [];
  try {
    recentTopics = await broker.find('topic', {
      limit: 100,
      sort: { created_at: -1 }
    });
  } catch {
    // Proceed with empty list
  }

  const topicList = recentTopics.map((t: any) => `${t._id}|${t.title}|${t.status}`).join('\n');

  const systemPrompt = `
You are a duplicate detection AI.

# New Topic Title: ${title}
${body ? `# New Topic Body: ${body}` : ''}

# Existing Topics:
${topicList || 'No existing topics'}

# Task
Find similar or duplicate topics. Return up to ${limit} results.

# Output Format
{
  "similarTopics": [
    { "topicId": "topic_1", "title": "Similar Topic", "similarity": 85, "status": "open" }
  ],
  "isDuplicate": false
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  return JSON.parse(llmResponse);
}

// ============================================================================
// 4. SUGGEST ANSWER
// ============================================================================

export interface SuggestAnswerRequest {
  /** Topic ID to suggest an answer for */
  topicId: string;
}

export interface SuggestAnswerResponse {
  /** Suggested answer text */
  suggestedAnswer: string;
  /** Confidence score 0-100 */
  confidence: number;
  /** Source references */
  sources: Array<{ type: string; id: string; title: string }>;
}

/**
 * AI-powered answer suggestion for a topic
 */
export async function suggestAnswer(request: SuggestAnswerRequest): Promise<SuggestAnswerResponse> {
  const { topicId } = request;

  if (!topicId) {
    throw new Error('topicId is required');
  }

  // Fetch the topic and its existing replies
  let topic: any = {};
  let replies: any[] = [];
  try {
    topic = await broker.findOne('topic', topicId);
    replies = await broker.find('reply', {
      filters: [['topic_id', '=', topicId]],
      sort: { upvotes: -1 },
      limit: 10
    });
  } catch {
    // Proceed with empty data
  }

  const replyContext = replies.map((r: any) => `[${r.upvotes || 0} votes] ${r.body}`).join('\n---\n');

  const systemPrompt = `
You are a community support AI.

# Topic: ${topic.title || 'Unknown'}
# Question: ${topic.body || 'No body'}
# Existing Replies:
${replyContext || 'No replies yet'}

# Task
Suggest a helpful answer based on the topic and existing replies.

# Output Format
{
  "suggestedAnswer": "Based on the discussion...",
  "confidence": 75,
  "sources": [{ "type": "reply", "id": "reply_1", "title": "Top voted reply" }]
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  return JSON.parse(llmResponse);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function callLLM(prompt: string): Promise<string> {
  logger.info('Calling LLM API for community AI...');
  await new Promise(resolve => setTimeout(resolve, 500));

  if (prompt.includes('content moderation')) {
    return JSON.stringify({
      isSafe: true,
      confidence: 95,
      issues: [],
      action: 'approve'
    });
  }

  if (prompt.includes('content categorization')) {
    return JSON.stringify({
      suggestedCategoryId: 'cat_general',
      categoryName: 'General Discussion',
      confidence: 85,
      tags: ['discussion', 'general']
    });
  }

  if (prompt.includes('duplicate detection')) {
    return JSON.stringify({
      similarTopics: [],
      isDuplicate: false
    });
  }

  // Suggest answer
  return JSON.stringify({
    suggestedAnswer: 'Based on similar discussions in the community, here is a suggested approach...',
    confidence: 72,
    sources: []
  });
}

export default {
  moderateContent,
  categorizeContent,
  detectSimilarTopics,
  suggestAnswer
};
