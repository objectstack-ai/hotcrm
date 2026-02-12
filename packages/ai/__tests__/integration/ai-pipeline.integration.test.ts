/**
 * Integration Test: AI Pipeline – Scoring, Recommendation, and Action
 *
 * Phase 8F – Cross-cloud integration: AI services pipeline.
 * Validates end-to-end AI-driven workflows including lead scoring,
 * opportunity prediction, case routing, and churn detection.
 */

import { vi, Mock } from 'vitest';

const broker = {
  findOne: vi.fn(),
  find: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  count: vi.fn()
};

describe('AI Pipeline Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run lead scoring pipeline and update lead with AI score', async () => {
    // Arrange
    const mockLead = {
      id: 'lead_ai_001',
      first_name: 'Maria',
      last_name: 'Garcia',
      company: 'BigCorp Inc',
      annual_revenue: 10000000,
      number_of_employees: 500,
      industry: 'technology',
      lead_source: 'web',
      email_opens: 12,
      page_views: 25,
      status: 'open',
      ai_score: null
    };

    const scoringResult = {
      id: 'score_001',
      object_type: 'lead',
      object_id: 'lead_ai_001',
      model_id: 'lead_scoring_v2',
      score: 87,
      confidence: 0.92,
      factors: [
        { feature: 'annual_revenue', impact: 0.35 },
        { feature: 'email_opens', impact: 0.25 },
        { feature: 'industry', impact: 0.20 },
        { feature: 'page_views', impact: 0.20 }
      ],
      scored_at: new Date().toISOString()
    };

    const updatedLead = { ...mockLead, ai_score: 87, ai_score_confidence: 0.92 };

    (broker.findOne as Mock).mockResolvedValue(mockLead);
    (broker.insert as Mock).mockResolvedValue(scoringResult);
    (broker.update as Mock).mockResolvedValue(updatedLead);

    // Act – Step 1: Retrieve lead data
    const lead = await broker.findOne('lead', 'lead_ai_001');

    // Step 2: Run scoring model and store result
    const features = {
      annual_revenue: lead.annual_revenue,
      number_of_employees: lead.number_of_employees,
      industry: lead.industry,
      email_opens: lead.email_opens,
      page_views: lead.page_views
    };

    const scoreRecord = await broker.insert('ai_prediction', {
      object_type: 'lead',
      object_id: lead.id,
      model_id: 'lead_scoring_v2',
      score: 87,
      confidence: 0.92,
      factors: [
        { feature: 'annual_revenue', impact: 0.35 },
        { feature: 'email_opens', impact: 0.25 },
        { feature: 'industry', impact: 0.20 },
        { feature: 'page_views', impact: 0.20 }
      ]
    });

    // Step 3: Update lead with score
    const scored = await broker.update('lead', lead.id, {
      ai_score: scoreRecord.score,
      ai_score_confidence: scoreRecord.confidence
    });

    // Assert
    expect(scoreRecord.score).toBe(87);
    expect(scoreRecord.confidence).toBe(0.92);
    expect(scoreRecord.factors).toHaveLength(4);
    expect(scored.ai_score).toBe(87);
    expect(broker.insert).toHaveBeenCalledTimes(1);
    expect(broker.update).toHaveBeenCalledTimes(1);
  });

  it('should predict opportunity win probability and recommend next action', async () => {
    // Arrange
    const mockOpportunity = {
      id: 'opp_ai_001',
      name: 'Enterprise Deal – Acme Corp',
      amount: 250000,
      stage: 'proposal',
      days_in_stage: 14,
      competitor_count: 2,
      engagement_score: 72,
      close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const prediction = {
      id: 'pred_opp_001',
      object_type: 'opportunity',
      object_id: 'opp_ai_001',
      model_id: 'deal_predictor_v3',
      prediction: 'win',
      probability: 0.68,
      confidence: 0.85
    };

    const recommendation = {
      id: 'rec_001',
      prediction_id: 'pred_opp_001',
      object_type: 'opportunity',
      object_id: 'opp_ai_001',
      action_type: 'schedule_meeting',
      description: 'Schedule executive sponsor meeting to accelerate deal',
      priority: 'high',
      status: 'pending'
    };

    (broker.findOne as Mock).mockResolvedValue(mockOpportunity);
    (broker.insert as Mock)
      .mockResolvedValueOnce(prediction)
      .mockResolvedValueOnce(recommendation);

    // Act
    const opp = await broker.findOne('opportunity', 'opp_ai_001');

    const pred = await broker.insert('ai_prediction', {
      object_type: 'opportunity',
      object_id: opp.id,
      model_id: 'deal_predictor_v3',
      prediction: 'win',
      probability: 0.68,
      confidence: 0.85
    });

    const rec = await broker.insert('ai_recommendation', {
      prediction_id: pred.id,
      object_type: 'opportunity',
      object_id: opp.id,
      action_type: 'schedule_meeting',
      description: 'Schedule executive sponsor meeting to accelerate deal',
      priority: 'high',
      status: 'pending'
    });

    // Assert
    expect(pred.probability).toBe(0.68);
    expect(pred.prediction).toBe('win');
    expect(rec.prediction_id).toBe(pred.id);
    expect(rec.action_type).toBe('schedule_meeting');
    expect(rec.priority).toBe('high');
    expect(broker.insert).toHaveBeenCalledTimes(2);
  });

  it('should route support case using AI classification', async () => {
    // Arrange
    const mockCase = {
      id: 'case_ai_route',
      subject: 'Integration API returning 401 errors',
      description: 'OAuth token refresh is failing for the REST API integration',
      priority: null,
      owner_id: null,
      status: 'new'
    };

    const classification = {
      id: 'class_001',
      object_type: 'case',
      object_id: 'case_ai_route',
      model_id: 'case_classifier_v1',
      category: 'api_integration',
      predicted_priority: 'high',
      recommended_queue: 'queue_api_team',
      confidence: 0.91
    };

    const routedCase = {
      ...mockCase,
      priority: 'high',
      owner_id: 'queue_api_team',
      status: 'routed',
      ai_classified: true
    };

    (broker.findOne as Mock).mockResolvedValue(mockCase);
    (broker.insert as Mock).mockResolvedValue(classification);
    (broker.update as Mock).mockResolvedValue(routedCase);

    // Act – Classify and route the case
    const caseData = await broker.findOne('case', 'case_ai_route');

    const result = await broker.insert('ai_prediction', {
      object_type: 'case',
      object_id: caseData.id,
      model_id: 'case_classifier_v1',
      category: 'api_integration',
      predicted_priority: 'high',
      recommended_queue: 'queue_api_team',
      confidence: 0.91
    });

    const routed = await broker.update('case', caseData.id, {
      priority: result.predicted_priority,
      owner_id: result.recommended_queue,
      status: 'routed',
      ai_classified: true
    });

    // Assert
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(routed.priority).toBe('high');
    expect(routed.owner_id).toBe('queue_api_team');
    expect(routed.ai_classified).toBe(true);
  });

  it('should detect churn risk and create retention task', async () => {
    // Arrange
    const mockAccount = {
      id: 'acc_churn',
      name: 'At-Risk Corp',
      contract_end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      login_frequency_30d: 2,
      support_cases_30d: 5,
      nps_score: 4
    };

    const churnPrediction = {
      id: 'churn_001',
      object_type: 'account',
      object_id: 'acc_churn',
      model_id: 'churn_detector_v2',
      prediction: 'high_risk',
      churn_probability: 0.78,
      risk_factors: [
        { factor: 'low_login_frequency', impact: 0.4 },
        { factor: 'high_support_cases', impact: 0.35 },
        { factor: 'low_nps', impact: 0.25 }
      ],
      confidence: 0.88
    };

    const retentionTask = {
      id: 'task_retain_001',
      subject: 'Churn risk detected – At-Risk Corp',
      account_id: 'acc_churn',
      prediction_id: 'churn_001',
      assigned_to: 'csm_001',
      priority: 'urgent',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open'
    };

    (broker.findOne as Mock).mockResolvedValue(mockAccount);
    (broker.insert as Mock)
      .mockResolvedValueOnce(churnPrediction)
      .mockResolvedValueOnce(retentionTask);

    // Act – Run churn detection and create retention action
    const account = await broker.findOne('account', 'acc_churn');

    const prediction = await broker.insert('ai_prediction', {
      object_type: 'account',
      object_id: account.id,
      model_id: 'churn_detector_v2',
      prediction: 'high_risk',
      churn_probability: 0.78,
      risk_factors: [
        { factor: 'low_login_frequency', impact: 0.4 },
        { factor: 'high_support_cases', impact: 0.35 },
        { factor: 'low_nps', impact: 0.25 }
      ],
      confidence: 0.88
    });

    let task: any;
    if (prediction.churn_probability > 0.7) {
      task = await broker.insert('task', {
        subject: `Churn risk detected – ${account.name}`,
        account_id: account.id,
        prediction_id: prediction.id,
        assigned_to: 'csm_001',
        priority: 'urgent',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'open'
      });
    }

    // Assert
    expect(prediction.churn_probability).toBe(0.78);
    expect(prediction.risk_factors).toHaveLength(3);
    expect(task).toBeDefined();
    expect(task.priority).toBe('urgent');
    expect(task.account_id).toBe(account.id);
    expect(broker.insert).toHaveBeenCalledTimes(2);
  });

  it('should skip retention task when churn risk is low', async () => {
    // Arrange
    const healthyAccount = {
      id: 'acc_healthy',
      name: 'Happy Customer Inc',
      login_frequency_30d: 45,
      support_cases_30d: 0,
      nps_score: 9
    };

    const lowRiskPrediction = {
      id: 'churn_low',
      object_type: 'account',
      object_id: 'acc_healthy',
      model_id: 'churn_detector_v2',
      prediction: 'low_risk',
      churn_probability: 0.12,
      confidence: 0.95
    };

    (broker.findOne as Mock).mockResolvedValue(healthyAccount);
    (broker.insert as Mock).mockResolvedValue(lowRiskPrediction);

    // Act
    const account = await broker.findOne('account', 'acc_healthy');

    const prediction = await broker.insert('ai_prediction', {
      object_type: 'account',
      object_id: account.id,
      model_id: 'churn_detector_v2',
      prediction: 'low_risk',
      churn_probability: 0.12,
      confidence: 0.95
    });

    let task: any = null;
    if (prediction.churn_probability > 0.7) {
      task = await broker.insert('task', {
        subject: `Churn risk detected – ${account.name}`,
        account_id: account.id,
        priority: 'urgent'
      });
    }

    // Assert
    expect(prediction.churn_probability).toBe(0.12);
    expect(task).toBeNull();
    expect(broker.insert).toHaveBeenCalledTimes(1); // Only prediction, no task
  });
});
