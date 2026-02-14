import type { HookContext } from '@objectstack/spec/data';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TopicContentModeration,
  TopicNotification,
  TopicAutoTagging,
  TopicViewCounting
} from '../../../src/topic.hook';

const mockQlFind = vi.fn();
const mockQlFindOne = vi.fn();
const mockQlDocUpdate = vi.fn();

function createMockContext(event: string, doc: any, result?: any): HookContext {
  const base: any = {
    event,
    ql: {
      find: mockQlFind,
      findOne: mockQlFindOne,
      doc: { update: mockQlDocUpdate }
    },
    session: { userId: 'user_1', tenantId: 'tenant_1' },
    user: { id: 'user_1' }
  };

  if (event.startsWith('before')) {
    base.input = { doc };
  } else {
    base.result = result || doc;
    base.input = { doc };
  }
  return base;
}

// ─── TopicContentModeration ────────────────────────────────────────────────────

describe('TopicContentModeration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(TopicContentModeration.name).toBe('TopicContentModeration');
    expect(TopicContentModeration.object).toBe('topic');
    expect(TopicContentModeration.events).toContain('beforeInsert');
    expect(TopicContentModeration.events).toContain('beforeUpdate');
  });

  it('should reject body with prohibited words', async () => {
    const ctx = createMockContext('beforeInsert', { body: 'This is spam content' });
    await expect(TopicContentModeration.handler(ctx)).rejects.toThrow(
      'Content Moderation: Topic body contains prohibited content'
    );
  });

  it('should reject body containing "scam"', async () => {
    const ctx = createMockContext('beforeUpdate', { body: 'This is a scam!' });
    await expect(TopicContentModeration.handler(ctx)).rejects.toThrow(
      'Content Moderation: Topic body contains prohibited content'
    );
  });

  it('should reject body containing "phishing"', async () => {
    const ctx = createMockContext('beforeInsert', { body: 'Watch out for phishing links' });
    await expect(TopicContentModeration.handler(ctx)).rejects.toThrow(
      'Content Moderation: Topic body contains prohibited content'
    );
  });

  it('should reject title shorter than 5 characters', async () => {
    const ctx = createMockContext('beforeInsert', { title: 'Hi' });
    await expect(TopicContentModeration.handler(ctx)).rejects.toThrow(
      'Validation Error: Topic title must be at least 5 characters'
    );
  });

  it('should accept clean content', async () => {
    const ctx = createMockContext('beforeInsert', {
      title: 'How to use the API',
      body: 'I need help understanding the REST API.'
    });
    await expect(TopicContentModeration.handler(ctx)).resolves.toBeUndefined();
  });

  it('should pass when body is not provided', async () => {
    const ctx = createMockContext('beforeInsert', { title: 'Valid title here' });
    await expect(TopicContentModeration.handler(ctx)).resolves.toBeUndefined();
  });
});

// ─── TopicNotification ─────────────────────────────────────────────────────────

describe('TopicNotification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(TopicNotification.name).toBe('TopicNotification');
    expect(TopicNotification.object).toBe('topic');
    expect(TopicNotification.events).toContain('afterInsert');
  });

  it('should increment category topic_count after topic insert', async () => {
    const category = { _id: 'cat_1', topic_count: 5 };
    mockQlFindOne.mockResolvedValue(category);
    mockQlDocUpdate.mockResolvedValue({});

    const ctx = createMockContext('afterInsert', {}, {
      _id: 'topic_1', category_id: 'cat_1', title: 'New Topic'
    });

    await TopicNotification.handler(ctx);

    expect(mockQlFindOne).toHaveBeenCalledWith('forum_category', 'cat_1');
    expect(mockQlDocUpdate).toHaveBeenCalledWith('forum_category', 'cat_1', { topic_count: 6 });
  });

  it('should skip when result has no _id', async () => {
    const ctx = createMockContext('afterInsert', {}, {});
    await TopicNotification.handler(ctx);
    expect(mockQlFindOne).not.toHaveBeenCalled();
  });

  it('should skip when result has no category_id', async () => {
    const ctx = createMockContext('afterInsert', {}, { _id: 'topic_1' });
    await TopicNotification.handler(ctx);
    expect(mockQlFindOne).not.toHaveBeenCalled();
  });

  it('should not throw when category update fails', async () => {
    mockQlFindOne.mockRejectedValue(new Error('DB error'));
    const ctx = createMockContext('afterInsert', {}, {
      _id: 'topic_1', category_id: 'cat_1', title: 'Test'
    });
    await expect(TopicNotification.handler(ctx)).resolves.toBeUndefined();
  });
});

// ─── TopicAutoTagging ──────────────────────────────────────────────────────────

describe('TopicAutoTagging', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(TopicAutoTagging.name).toBe('TopicAutoTagging');
    expect(TopicAutoTagging.object).toBe('topic');
    expect(TopicAutoTagging.events).toContain('beforeInsert');
  });

  it('should auto-tag topic with matching keywords', async () => {
    const doc = { title: 'Bug in login', body: 'I need help with a bug' };
    const ctx = createMockContext('beforeInsert', doc);

    await TopicAutoTagging.handler(ctx);

    const tags = JSON.parse(doc.tags as unknown as string);
    expect(tags).toContain('bug');
    expect(tags).toContain('help-wanted');
  });

  it('should auto-tag with "feature-request" for feature keyword', async () => {
    const doc = { title: 'Feature request', body: 'Please add this feature' };
    const ctx = createMockContext('beforeInsert', doc);

    await TopicAutoTagging.handler(ctx);

    const tags = JSON.parse(doc.tags as unknown as string);
    expect(tags).toContain('feature-request');
  });

  it('should auto-tag with "question" for question keyword', async () => {
    const doc = { title: 'Question about config', body: 'I have a question' };
    const ctx = createMockContext('beforeInsert', doc);

    await TopicAutoTagging.handler(ctx);

    const tags = JSON.parse(doc.tags as unknown as string);
    expect(tags).toContain('question');
  });

  it('should not override existing tags', async () => {
    const doc = { title: 'Bug report', body: 'Found a bug', tags: '["existing"]' };
    const ctx = createMockContext('beforeInsert', doc);

    await TopicAutoTagging.handler(ctx);

    expect(doc.tags).toBe('["existing"]');
  });

  it('should not tag when title and body are missing', async () => {
    const doc = {} as any;
    const ctx = createMockContext('beforeInsert', doc);

    await TopicAutoTagging.handler(ctx);

    expect(doc.tags).toBeUndefined();
  });
});

// ─── TopicViewCounting ─────────────────────────────────────────────────────────

describe('TopicViewCounting', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(TopicViewCounting.name).toBe('TopicViewCounting');
    expect(TopicViewCounting.object).toBe('topic');
    expect(TopicViewCounting.events).toContain('afterRead');
  });

  it('should increment view_count after read', async () => {
    mockQlDocUpdate.mockResolvedValue({});
    const ctx = createMockContext('afterRead', {}, { _id: 'topic_1', view_count: 10 });

    await TopicViewCounting.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith(
      'topic',
      'topic_1',
      expect.objectContaining({ view_count: 11 })
    );
  });

  it('should set last_activity_at to an ISO string', async () => {
    mockQlDocUpdate.mockResolvedValue({});
    const ctx = createMockContext('afterRead', {}, { _id: 'topic_1', view_count: 0 });

    await TopicViewCounting.handler(ctx);

    const updateArg = mockQlDocUpdate.mock.calls[0][2];
    expect(typeof updateArg.last_activity_at).toBe('string');
  });

  it('should skip when result has no _id', async () => {
    const ctx = createMockContext('afterRead', {}, {});
    await TopicViewCounting.handler(ctx);
    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should not throw when update fails', async () => {
    mockQlDocUpdate.mockRejectedValue(new Error('DB error'));
    const ctx = createMockContext('afterRead', {}, { _id: 'topic_1', view_count: 5 });
    await expect(TopicViewCounting.handler(ctx)).resolves.toBeUndefined();
  });
});
