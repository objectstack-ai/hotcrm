import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  broker: {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({}),
    insert: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0)
  }
}));

import { describe, it, expect, beforeEach } from 'vitest';
import {
  moderateContent,
  categorizeContent,
  detectSimilarTopics,
  suggestAnswer
} from '../../../src/community_ai.action';

describe('Community AI Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── moderateContent ───────────────────────────────────────────────────────

  describe('moderateContent', () => {
    it('should reject empty content', async () => {
      await expect(moderateContent({ content: '', contentType: 'topic' }))
        .rejects.toThrow('Content is required for moderation');
    });

    it('should reject whitespace-only content', async () => {
      await expect(moderateContent({ content: '   ', contentType: 'reply' }))
        .rejects.toThrow('Content is required for moderation');
    });

    it('should return moderation result for valid content', async () => {
      const result = await moderateContent({
        content: 'This is a helpful community post',
        contentType: 'topic'
      });

      expect(result).toHaveProperty('isSafe');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('action');
    });

    it('should return result for reply content type', async () => {
      const result = await moderateContent({
        content: 'Great answer, thanks!',
        contentType: 'reply'
      });

      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
    });

    it('should return result for idea content type', async () => {
      const result = await moderateContent({
        content: 'We should add dark mode support',
        contentType: 'idea'
      });

      expect(result).toBeDefined();
    });
  });

  // ─── categorizeContent ─────────────────────────────────────────────────────

  describe('categorizeContent', () => {
    it('should reject missing title', async () => {
      await expect(categorizeContent({ title: '', body: 'Some body' }))
        .rejects.toThrow('Title is required for categorization');
    });

    it('should return categorization for valid input', async () => {
      const result = await categorizeContent({
        title: 'How to configure SSO',
        body: 'I need help setting up single sign-on.'
      });

      expect(result).toHaveProperty('suggestedCategoryId');
      expect(result).toHaveProperty('categoryName');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('tags');
    });
  });

  // ─── detectSimilarTopics ───────────────────────────────────────────────────

  describe('detectSimilarTopics', () => {
    it('should reject missing title', async () => {
      await expect(detectSimilarTopics({ title: '' }))
        .rejects.toThrow('Title is required for similarity detection');
    });

    it('should return similarity result for valid input', async () => {
      const result = await detectSimilarTopics({
        title: 'How to reset password',
        body: 'I forgot my password and need to reset it.'
      });

      expect(result).toHaveProperty('similarTopics');
      expect(result).toHaveProperty('isDuplicate');
      expect(Array.isArray(result.similarTopics)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await detectSimilarTopics({
        title: 'API question',
        limit: 3
      });

      expect(result).toBeDefined();
      expect(result.similarTopics.length).toBeLessThanOrEqual(3);
    });
  });

  // ─── suggestAnswer ─────────────────────────────────────────────────────────

  describe('suggestAnswer', () => {
    it('should reject missing topicId', async () => {
      await expect(suggestAnswer({ topicId: '' }))
        .rejects.toThrow('topicId is required');
    });

    it('should return answer suggestion for valid topic', async () => {
      const result = await suggestAnswer({ topicId: 'topic_123' });

      expect(result).toHaveProperty('suggestedAnswer');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('sources');
      expect(typeof result.suggestedAnswer).toBe('string');
      expect(result.suggestedAnswer.length).toBeGreaterThan(0);
    });
  });
});
