import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ForumTopicValidationTrigger,
  ForumTopicModerationTrigger,
  ForumPostCreationTrigger,
  ForumPostModerationTrigger
} from '../../../src/hooks/forum.hook';

describe('ForumTopicValidationTrigger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(ForumTopicValidationTrigger.name).toBe('ForumTopicValidationTrigger');
    expect(ForumTopicValidationTrigger.object).toBe('forum_topic');
    expect(ForumTopicValidationTrigger.events).toEqual(['beforeInsert', 'beforeUpdate']);
  });

  it('should validate topic and generate url_slug', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const doc = { title: 'How to Configure SSO?', status: 'open' } as Record<string, any>;
    const ctx = {
      input: { doc, event: 'beforeUpdate' }
    };

    await ForumTopicValidationTrigger.handler(ctx as any);

    expect(doc.url_slug).toBe('how-to-configure-sso');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Forum topic validated: "How to Configure SSO?"')
    );
  });

  it('should throw error when title is too short', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const ctx = {
      input: { doc: { title: 'Hi' }, event: 'beforeInsert' }
    };

    await expect(ForumTopicValidationTrigger.handler(ctx as any)).rejects.toThrow(
      'Forum topic title is required and must be at least 5 characters.'
    );
  });

  it('should throw error when title is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const ctx = {
      input: { doc: {}, event: 'beforeInsert' }
    };

    await expect(ForumTopicValidationTrigger.handler(ctx as any)).rejects.toThrow(
      'Forum topic title is required and must be at least 5 characters.'
    );
  });

  it('should set defaults on beforeInsert', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const doc = { title: 'Getting Started Guide' } as Record<string, any>;
    const ctx = {
      input: { doc, event: 'beforeInsert' }
    };

    await ForumTopicValidationTrigger.handler(ctx as any);

    expect(doc.status).toBe('open');
    expect(doc.post_count).toBe(0);
    expect(doc.view_count).toBe(0);
    expect(doc.like_count).toBe(0);
    expect(doc.url_slug).toBe('getting-started-guide');
  });
});

describe('ForumTopicModerationTrigger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(ForumTopicModerationTrigger.name).toBe('ForumTopicModerationTrigger');
    expect(ForumTopicModerationTrigger.object).toBe('forum_topic');
    expect(ForumTopicModerationTrigger.events).toEqual(['beforeInsert']);
  });

  it('should flag topic for moderation when author is not agent or admin', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const doc = { title: 'User Topic', author_type: 'customer' } as Record<string, any>;
    const ctx = { input: { doc } };

    await ForumTopicModerationTrigger.handler(ctx as any);

    expect(doc.requires_moderation).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('added to moderation queue')
    );
  });

  it('should not flag topic for moderation when author is agent', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const doc = { title: 'Agent Topic', author_type: 'agent' } as Record<string, any>;
    const ctx = { input: { doc } };

    await ForumTopicModerationTrigger.handler(ctx as any);

    expect(doc.requires_moderation).toBeUndefined();
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('ForumPostCreationTrigger', () => {
  let mockQl: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockQl = {
      find: vi.fn(),
      update: vi.fn(),
      doc: { get: vi.fn(), create: vi.fn(), update: vi.fn() }
    };
  });

  it('should have correct hook metadata', () => {
    expect(ForumPostCreationTrigger.name).toBe('ForumPostCreationTrigger');
    expect(ForumPostCreationTrigger.object).toBe('forum_post');
    expect(ForumPostCreationTrigger.events).toEqual(['afterInsert']);
  });

  it('should skip update when topic_id is missing', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const ctx = {
      input: { doc: { content: 'A post without topic' } },
      ql: mockQl
    };

    await ForumPostCreationTrigger.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Forum post created without topic_id')
    );
    expect(mockQl.find).not.toHaveBeenCalled();
  });

  it('should warn when parent topic is not found', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockQl.find.mockResolvedValueOnce([]);

    const ctx = {
      input: { doc: { topic_id: 'topic_missing', content: 'Reply', author_id: 'user_1' } },
      ql: mockQl
    };

    await ForumPostCreationTrigger.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Parent topic topic_missing not found')
    );
  });

  it('should update topic post_count and last_post fields', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockQl.find.mockResolvedValueOnce([{ _id: 'topic_1', post_count: 3 }]);
    mockQl.update.mockResolvedValueOnce({});

    const ctx = {
      input: { doc: { topic_id: 'topic_1', content: 'Great answer!', author_id: 'user_42' } },
      ql: mockQl
    };

    await ForumPostCreationTrigger.handler(ctx as any);

    expect(mockQl.update).toHaveBeenCalledWith('forum_topic', 'topic_1', expect.objectContaining({
      post_count: 4,
      last_post_by_id: 'user_42'
    }));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Updated topic topic_1: post_count=4')
    );
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockQl.find.mockRejectedValueOnce(new Error('DB error'));

    const ctx = {
      input: { doc: { topic_id: 'topic_err', content: 'Error post', author_id: 'user_1' } },
      ql: mockQl
    };

    await ForumPostCreationTrigger.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Error in ForumPostCreationTrigger:',
      expect.any(Error)
    );
  });
});

describe('ForumPostModerationTrigger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(ForumPostModerationTrigger.name).toBe('ForumPostModerationTrigger');
    expect(ForumPostModerationTrigger.object).toBe('forum_post');
    expect(ForumPostModerationTrigger.events).toEqual(['beforeInsert']);
  });

  it('should flag post for moderation when author is not agent or admin', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const doc = { content: 'Customer post content here', author_type: 'customer' } as Record<string, any>;
    const ctx = { input: { doc } };

    await ForumPostModerationTrigger.handler(ctx as any);

    expect(doc.requires_moderation).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('added to moderation queue')
    );
  });

  it('should not flag post for moderation when author is admin', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const doc = { content: 'Admin response with details', author_type: 'admin' } as Record<string, any>;
    const ctx = { input: { doc } };

    await ForumPostModerationTrigger.handler(ctx as any);

    expect(doc.requires_moderation).toBeUndefined();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should warn about low-quality content when content is too short', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const doc = { content: 'Hi', author_type: 'customer' } as Record<string, any>;
    const ctx = { input: { doc } };

    await ForumPostModerationTrigger.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Low-quality content detected')
    );
  });
});
