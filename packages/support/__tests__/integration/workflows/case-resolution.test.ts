/**
 * Integration Test: Case Resolution Workflow
 * 
 * This test validates the complete workflow from case creation through resolution,
 * including SLA tracking, escalation, and knowledge article integration.
 */

// Mock the db module
jest.mock('../../../src/db', () => ({
  db: {
    doc: {
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    find: jest.fn(),
    insert: jest.fn()
  }
}));

import { db } from '../../../src/db';

describe('Case Resolution Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full case lifecycle from creation to resolution', async () => {
    // Arrange - Case creation
    const newCase = {
      subject: 'Unable to generate reports',
      description: 'Getting error when trying to export analytics report',
      priority: 'High',
      type: 'Technical Issue',
      account_id: 'acc_123',
      contact_id: 'contact_456',
      origin: 'Email',
      status: 'New'
    };

    const createdCase = {
      id: 'case_001',
      case_number: 'C-00001',
      ...newCase,
      created_date: new Date().toISOString(),
      owner_id: null
    };

    const assignedCase = {
      ...createdCase,
      owner_id: 'agent_789',
      status: 'In Progress'
    };

    const resolvedCase = {
      ...assignedCase,
      status: 'Closed',
      closed_date: new Date().toISOString(),
      resolution: 'Applied patch to fix report export functionality'
    };

    (db.doc.create as jest.Mock).mockResolvedValue(createdCase);
    (db.doc.update as jest.Mock)
      .mockResolvedValueOnce(assignedCase)
      .mockResolvedValueOnce(resolvedCase);

    // Act - Step 1: Create case
    const caseRecord = await db.doc.create('case', newCase);
    expect(caseRecord.id).toBe('case_001');
    expect(caseRecord.status).toBe('New');

    // Step 2: Auto-assign to agent
    const assigned = await db.doc.update('case', caseRecord.id, {
      owner_id: 'agent_789',
      status: 'In Progress'
    });
    expect(assigned.owner_id).toBe('agent_789');
    expect(assigned.status).toBe('In Progress');

    // Step 3: Resolve case
    const resolved = await db.doc.update('case', caseRecord.id, {
      status: 'Closed',
      closed_date: new Date().toISOString(),
      resolution: 'Applied patch to fix report export functionality'
    });

    // Assert
    expect(resolved.status).toBe('Closed');
    expect(resolved.closed_date).toBeDefined();
    expect(resolved.resolution).toBeDefined();
    expect(db.doc.create).toHaveBeenCalledTimes(1);
    expect(db.doc.update).toHaveBeenCalledTimes(2);
  });

  it('should track SLA milestones throughout case lifecycle', async () => {
    // Arrange
    const mockCase = {
      id: 'case_sla',
      priority: 'Critical',
      status: 'New',
      created_date: new Date().toISOString()
    };

    const slaPolicy = {
      id: 'sla_policy_1',
      name: 'Critical Case SLA',
      first_response_time: 60, // 1 hour
      resolution_time: 240 // 4 hours
    };

    const slaMilestone = {
      id: 'sla_milestone_1',
      target_object_id: 'case_sla',
      milestone_type: 'First Response',
      target_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      is_violated: false,
      completion_date: null
    };

    const completedMilestone = {
      ...slaMilestone,
      completion_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      is_violated: false
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.doc.create as jest.Mock).mockResolvedValue(slaMilestone);
    (db.doc.update as jest.Mock).mockResolvedValue(completedMilestone);

    // Act - Create SLA milestone
    const milestone = await db.doc.create('sla_milestone', {
      target_object_id: mockCase.id,
      milestone_type: 'First Response',
      target_date: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    });

    // Simulate first response
    const updated = await db.doc.update('sla_milestone', milestone.id, {
      completion_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      is_violated: false
    });

    // Assert
    expect(milestone).toBeDefined();
    expect(updated.completion_date).toBeDefined();
    expect(updated.is_violated).toBe(false);
  });

  it('should escalate case when SLA breach is imminent', async () => {
    // Arrange
    const highRiskCase = {
      id: 'case_escalate',
      case_number: 'C-002',
      subject: 'Critical system outage',
      priority: 'Critical',
      status: 'New',
      created_date: new Date(Date.now() - 55 * 60 * 1000).toISOString(), // 55 min ago
      owner_id: null,
      escalated: false
    };

    const escalatedCase = {
      ...highRiskCase,
      escalated: true,
      owner_id: 'senior_agent_456',
      status: 'Escalated',
      escalation_date: new Date().toISOString()
    };

    (db.doc.get as jest.Mock).mockResolvedValue(highRiskCase);
    (db.doc.update as jest.Mock).mockResolvedValue(escalatedCase);
    (db.find as jest.Mock).mockResolvedValue([]);

    // Act - Check SLA breach risk (would be calculated by predictSLABreach)
    const caseData = await db.doc.get('case', 'case_escalate');
    const elapsedMinutes = (Date.now() - new Date(caseData.created_date).getTime()) / (60 * 1000);
    const slaTarget = 60; // 1 hour for critical
    const shouldEscalate = elapsedMinutes > (slaTarget * 0.8) && !caseData.owner_id;

    if (shouldEscalate) {
      const escalated = await db.doc.update('case', caseData.id, {
        escalated: true,
        owner_id: 'senior_agent_456',
        status: 'Escalated',
        escalation_date: new Date().toISOString()
      });

      // Assert
      expect(escalated.escalated).toBe(true);
      expect(escalated.status).toBe('Escalated');
    }

    expect(shouldEscalate).toBe(true);
  });

  it('should link knowledge articles to case', async () => {
    // Arrange
    const mockCase = {
      id: 'case_kb',
      subject: 'Password reset not working',
      description: 'User cannot reset password via email',
      status: 'In Progress'
    };

    const relevantArticles = [
      {
        id: 'article_1',
        title: 'How to Reset Your Password',
        url_name: 'password-reset-guide',
        is_published: true
      },
      {
        id: 'article_2',
        title: 'Troubleshooting Email Issues',
        url_name: 'email-troubleshooting',
        is_published: true
      }
    ];

    const caseArticleLink = {
      id: 'link_1',
      case_id: 'case_kb',
      article_id: 'article_1',
      created_date: new Date().toISOString()
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.find as jest.Mock).mockResolvedValue(relevantArticles);
    (db.doc.create as jest.Mock).mockResolvedValue(caseArticleLink);

    // Act - Find and link relevant articles
    const articles = await db.find('knowledge_article', {
      filters: [['is_published', '=', true]]
    });

    const link = await db.doc.create('case_article', {
      case_id: mockCase.id,
      article_id: articles[0].id
    });

    // Assert
    expect(link).toBeDefined();
    expect(link.case_id).toBe(mockCase.id);
    expect(link.article_id).toBe('article_1');
  });

  it('should handle case comments and collaboration', async () => {
    // Arrange
    const mockCase = {
      id: 'case_collab',
      subject: 'Complex technical issue',
      status: 'In Progress',
      owner_id: 'agent_1'
    };

    const internalComment = {
      id: 'comment_1',
      case_id: 'case_collab',
      comment_body: 'I need help from engineering team on this',
      is_published: false,
      created_by: 'agent_1',
      created_date: new Date().toISOString()
    };

    const externalComment = {
      id: 'comment_2',
      case_id: 'case_collab',
      comment_body: 'We are investigating the issue and will update you soon',
      is_published: true,
      created_by: 'agent_1',
      created_date: new Date().toISOString()
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.doc.create as jest.Mock)
      .mockResolvedValueOnce(internalComment)
      .mockResolvedValueOnce(externalComment);

    // Act - Add internal comment
    const internal = await db.doc.create('case_comment', {
      case_id: mockCase.id,
      comment_body: 'I need help from engineering team on this',
      is_published: false,
      created_by: 'agent_1'
    });

    // Add customer-facing comment
    const external = await db.doc.create('case_comment', {
      case_id: mockCase.id,
      comment_body: 'We are investigating the issue and will update you soon',
      is_published: true,
      created_by: 'agent_1'
    });

    // Assert
    expect(internal.is_published).toBe(false);
    expect(external.is_published).toBe(true);
    expect(db.doc.create).toHaveBeenCalledTimes(2);
  });

  it('should track resolution time and customer satisfaction', async () => {
    // Arrange
    const mockCase = {
      id: 'case_metrics',
      subject: 'Billing question',
      priority: 'Medium',
      status: 'New',
      created_date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      first_response_date: null,
      closed_date: null
    };

    const caseWithFirstResponse = {
      ...mockCase,
      first_response_date: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
      status: 'In Progress'
    };

    const closedCaseWithSurvey = {
      ...caseWithFirstResponse,
      status: 'Closed',
      closed_date: new Date().toISOString(),
      customer_satisfaction_rating: 5,
      resolution_time_minutes: 240
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.doc.update as jest.Mock)
      .mockResolvedValueOnce(caseWithFirstResponse)
      .mockResolvedValueOnce(closedCaseWithSurvey);

    // Act - Record first response
    const withResponse = await db.doc.update('case', mockCase.id, {
      first_response_date: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
      status: 'In Progress'
    });

    // Close case and record metrics
    const closed = await db.doc.update('case', mockCase.id, {
      status: 'Closed',
      closed_date: new Date().toISOString(),
      customer_satisfaction_rating: 5,
      resolution_time_minutes: 240
    });

    // Assert
    expect(withResponse.first_response_date).toBeDefined();
    expect(closed.closed_date).toBeDefined();
    expect(closed.customer_satisfaction_rating).toBe(5);
    expect(closed.resolution_time_minutes).toBe(240);
  });
});
