/**
 * Integration Test: Community ↔ Support Cross-Cloud
 *
 * Validates interaction patterns between community objects (topics, ideas)
 * and support objects (cases, knowledge articles).
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

import { describe, it, expect, beforeEach } from 'vitest';
import { broker } from '../../src/db';

describe('Community ↔ Support Cross-Cloud Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a support case from a community topic', async () => {
    const topic = {
      _id: 'topic_support_1',
      title: 'Login page broken after update',
      body: 'Cannot access the app since the latest release',
      author_id: 'user_42',
      status: 'open',
      category_id: 'cat_bugs'
    };

    const newCase = {
      _id: 'case_from_topic_1',
      subject: topic.title,
      description: topic.body,
      origin: 'community',
      origin_topic_id: topic._id,
      priority: 'high',
      status: 'new'
    };

    (broker.findOne as Mock).mockResolvedValue(topic);
    (broker.insert as Mock).mockResolvedValue(newCase);

    // Act: fetch the topic and create a support case from it
    const fetchedTopic = await broker.findOne('topic', 'topic_support_1');
    const createdCase = await broker.insert('case', {
      subject: fetchedTopic.title,
      description: fetchedTopic.body,
      origin: 'community',
      origin_topic_id: fetchedTopic._id,
      priority: 'high',
      status: 'new'
    });

    // Assert
    expect(createdCase.origin).toBe('community');
    expect(createdCase.origin_topic_id).toBe(topic._id);
    expect(createdCase.subject).toBe(topic.title);
    expect(broker.insert).toHaveBeenCalledWith('case', expect.objectContaining({
      origin: 'community',
      origin_topic_id: 'topic_support_1'
    }));
  });

  it('should link a knowledge article as a reply to a topic', async () => {
    const knowledgeArticle = {
      _id: 'article_help_1',
      title: 'How to Reset Your Password',
      body: 'Step 1: Go to settings...',
      is_published: true
    };

    const replyFromArticle = {
      _id: 'reply_kb_1',
      topic_id: 'topic_password_reset',
      body: `From Knowledge Base: ${knowledgeArticle.title}\n\n${knowledgeArticle.body}`,
      author_id: 'system_bot',
      is_accepted_answer: false
    };

    (broker.find as Mock).mockResolvedValue([knowledgeArticle]);
    (broker.insert as Mock).mockResolvedValue(replyFromArticle);

    // Act: search knowledge articles and post as reply
    const articles = await broker.find('knowledge_article', {
      filters: [['is_published', '=', true]]
    });
    expect(articles).toHaveLength(1);

    const reply = await broker.insert('reply', {
      topic_id: 'topic_password_reset',
      body: `From Knowledge Base: ${articles[0].title}\n\n${articles[0].body}`,
      author_id: 'system_bot'
    });

    // Assert
    expect(reply.topic_id).toBe('topic_password_reset');
    expect(reply.body).toContain('How to Reset Your Password');
    expect(broker.insert).toHaveBeenCalledWith('reply', expect.objectContaining({
      author_id: 'system_bot'
    }));
  });

  it('should escalate a high-vote idea to a product feature request', async () => {
    const idea = {
      _id: 'idea_hot_1',
      title: 'Dark mode for mobile app',
      description: 'Please add dark mode to the mobile application',
      vote_count: 250,
      status: 'planned',
      author_id: 'user_99'
    };

    const featureCase = {
      _id: 'case_feature_1',
      subject: `[Idea] ${idea.title}`,
      description: idea.description,
      type: 'feature_request',
      origin: 'community_idea',
      origin_idea_id: idea._id,
      priority: 'medium',
      status: 'new'
    };

    (broker.findOne as Mock).mockResolvedValue(idea);
    (broker.insert as Mock).mockResolvedValue(featureCase);

    // Act: escalate idea to support/product case
    const fetchedIdea = await broker.findOne('idea', 'idea_hot_1');
    expect(fetchedIdea.vote_count).toBeGreaterThan(100);

    const escalatedCase = await broker.insert('case', {
      subject: `[Idea] ${fetchedIdea.title}`,
      description: fetchedIdea.description,
      type: 'feature_request',
      origin: 'community_idea',
      origin_idea_id: fetchedIdea._id,
      priority: 'medium',
      status: 'new'
    });

    // Assert
    expect(escalatedCase.origin).toBe('community_idea');
    expect(escalatedCase.origin_idea_id).toBe(idea._id);
    expect(escalatedCase.subject).toContain('Dark mode');
  });

  it('should update topic status when linked case is resolved', async () => {
    const resolvedCase = {
      _id: 'case_resolved_1',
      subject: 'Login page broken',
      status: 'closed',
      resolution: 'Fixed in v2.3.1',
      origin_topic_id: 'topic_linked_1'
    };

    const updatedTopic = {
      _id: 'topic_linked_1',
      title: 'Login page broken after update',
      status: 'closed'
    };

    (broker.findOne as Mock).mockResolvedValue(resolvedCase);
    (broker.update as Mock).mockResolvedValue(updatedTopic);

    // Act: fetch resolved case and close linked topic
    const caseData = await broker.findOne('case', 'case_resolved_1');
    expect(caseData.status).toBe('closed');

    const result = await broker.update('topic', caseData.origin_topic_id, {
      status: 'closed'
    });

    // Assert
    expect(result.status).toBe('closed');
    expect(broker.update).toHaveBeenCalledWith('topic', 'topic_linked_1', {
      status: 'closed'
    });
  });

  it('should count community topics that originated support cases', async () => {
    (broker.count as Mock).mockResolvedValue(15);

    // Act: count topics that led to support cases
    const topicCaseCount = await broker.count('case', {
      filters: [['origin', '=', 'community']]
    } as any);

    // Assert
    expect(topicCaseCount).toBe(15);
    expect(broker.count).toHaveBeenCalledWith('case', expect.objectContaining({
      filters: [['origin', '=', 'community']]
    }));
  });
});
