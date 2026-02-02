import {
  generatePerformanceInsights,
  recommendGoals,
  generateDevelopmentPlan,
  analyzeFeedback,
  supportCalibration,
  synthesize360Review,
  PerformanceInsightsRequest,
  GoalRecommendationRequest,
  DevelopmentPlanRequest,
  FeedbackAnalysisRequest,
  CalibrationRequest,
  Review360SynthesisRequest
} from '../../../src/actions/performance_ai.action';

describe('Performance AI Actions - generatePerformanceInsights', () => {
  it('should generate insights for an individual employee', async () => {
    // Arrange
    const request: PerformanceInsightsRequest = {
      employeeId: 'emp_123',
      periodMonths: 12
    };

    // Act
    const result = await generatePerformanceInsights(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.insights).toBeDefined();
    expect(Array.isArray(result.insights)).toBe(true);
  });

  it('should categorize insights into strength, opportunity, trend, and concern', async () => {
    // Arrange
    const request: PerformanceInsightsRequest = {
      employeeId: 'emp_123',
      periodMonths: 6
    };

    // Act
    const result = await generatePerformanceInsights(request);

    // Assert
    expect(result.insights).toBeDefined();
    result.insights.forEach(insight => {
      expect(['strength', 'opportunity', 'trend', 'concern']).toContain(insight.category);
      expect(insight.title).toBeDefined();
      expect(insight.description).toBeDefined();
      expect(Array.isArray(insight.evidence)).toBe(true);
      expect(['high', 'medium', 'low']).toContain(insight.priority);
    });
  });

  it('should analyze performance trends across multiple dimensions', async () => {
    // Arrange
    const request: PerformanceInsightsRequest = {
      employeeId: 'emp_123',
      periodMonths: 12
    };

    // Act
    const result = await generatePerformanceInsights(request);

    // Assert
    expect(result.trends).toBeDefined();
    expect(['improving', 'stable', 'declining']).toContain(result.trends.overall);
    expect(['improving', 'stable', 'declining']).toContain(result.trends.technical_skills);
    expect(['improving', 'stable', 'declining']).toContain(result.trends.soft_skills);
    expect(['improving', 'stable', 'declining']).toContain(result.trends.leadership);
  });

  it('should provide benchmarking data', async () => {
    // Arrange
    const request: PerformanceInsightsRequest = {
      employeeId: 'emp_123'
    };

    // Act
    const result = await generatePerformanceInsights(request);

    // Assert
    expect(result.benchmarks).toBeDefined();
    expect(['above_average', 'average', 'below_average']).toContain(result.benchmarks.peer_comparison);
    expect(result.benchmarks.department_percentile).toBeGreaterThanOrEqual(0);
    expect(result.benchmarks.department_percentile).toBeLessThanOrEqual(100);
    expect(result.benchmarks.company_percentile).toBeGreaterThanOrEqual(0);
    expect(result.benchmarks.company_percentile).toBeLessThanOrEqual(100);
  });

  it('should generate actionable items', async () => {
    // Arrange
    const request: PerformanceInsightsRequest = {
      employeeId: 'emp_123',
      periodMonths: 12
    };

    // Act
    const result = await generatePerformanceInsights(request);

    // Assert
    expect(result.actionItems).toBeDefined();
    expect(Array.isArray(result.actionItems)).toBe(true);
    expect(result.actionItems.length).toBeGreaterThan(0);
  });

  it('should generate insights for department when departmentId provided', async () => {
    // Arrange
    const request: PerformanceInsightsRequest = {
      departmentId: 'dept_456',
      periodMonths: 6
    };

    // Act
    const result = await generatePerformanceInsights(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.insights).toBeDefined();
    expect(result.trends).toBeDefined();
  });

  it('should throw error when neither employeeId nor departmentId provided', async () => {
    // Arrange
    const request: PerformanceInsightsRequest = {
      periodMonths: 12
    };

    // Act & Assert
    await expect(generatePerformanceInsights(request)).rejects.toThrow('Either employeeId or departmentId must be provided');
  });
});

describe('Performance AI Actions - recommendGoals', () => {
  it('should recommend SMART goals for an employee', async () => {
    // Arrange
    const request: GoalRecommendationRequest = {
      employeeId: 'emp_123',
      goalPeriod: 'quarterly'
    };

    // Act
    const result = await recommendGoals(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.goals).toBeDefined();
    expect(Array.isArray(result.goals)).toBe(true);
    expect(result.goals.length).toBeGreaterThan(0);
  });

  it('should include goal metadata with proper types and priorities', async () => {
    // Arrange
    const request: GoalRecommendationRequest = {
      employeeId: 'emp_123',
      goalPeriod: 'annual'
    };

    // Act
    const result = await recommendGoals(request);

    // Assert
    result.goals.forEach(goal => {
      expect(goal.goal_name).toBeDefined();
      expect(['performance', 'development', 'strategic', 'behavioral']).toContain(goal.goal_type);
      expect(goal.description).toBeDefined();
      expect(Array.isArray(goal.success_criteria)).toBe(true);
      expect(goal.timeline_weeks).toBeGreaterThan(0);
      expect(['must_have', 'should_have', 'nice_to_have']).toContain(goal.priority);
      expect(goal.alignment).toBeDefined();
      expect(Array.isArray(goal.resources_needed)).toBe(true);
    });
  });

  it('should calculate SMART scores for each goal', async () => {
    // Arrange
    const request: GoalRecommendationRequest = {
      employeeId: 'emp_123',
      goalPeriod: 'semi-annual'
    };

    // Act
    const result = await recommendGoals(request);

    // Assert
    result.goals.forEach(goal => {
      expect(goal.smart_score).toBeDefined();
      expect(goal.smart_score.specific).toBeGreaterThanOrEqual(0);
      expect(goal.smart_score.specific).toBeLessThanOrEqual(100);
      expect(goal.smart_score.measurable).toBeGreaterThanOrEqual(0);
      expect(goal.smart_score.achievable).toBeGreaterThanOrEqual(0);
      expect(goal.smart_score.relevant).toBeGreaterThanOrEqual(0);
      expect(goal.smart_score.time_bound).toBeGreaterThanOrEqual(0);
      expect(goal.smart_score.overall).toBeGreaterThanOrEqual(0);
      expect(goal.smart_score.overall).toBeLessThanOrEqual(100);
    });
  });

  it('should provide context explaining the recommendations', async () => {
    // Arrange
    const request: GoalRecommendationRequest = {
      employeeId: 'emp_123',
      goalPeriod: 'quarterly'
    };

    // Act
    const result = await recommendGoals(request);

    // Assert
    expect(result.context).toBeDefined();
    expect(result.context.employee_level).toBeDefined();
    expect(result.context.career_stage).toBeDefined();
    expect(result.context.recent_performance).toBeDefined();
    expect(result.context.department_priorities).toBeDefined();
  });

  it('should filter goals by focus areas when provided', async () => {
    // Arrange
    const request: GoalRecommendationRequest = {
      employeeId: 'emp_123',
      goalPeriod: 'quarterly',
      focusAreas: ['leadership', 'technical_skills']
    };

    // Act
    const result = await recommendGoals(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.goals).toBeDefined();
  });

  it('should adjust timeline based on goal period', async () => {
    // Arrange
    const quarterlyRequest: GoalRecommendationRequest = {
      employeeId: 'emp_123',
      goalPeriod: 'quarterly'
    };

    const annualRequest: GoalRecommendationRequest = {
      employeeId: 'emp_123',
      goalPeriod: 'annual'
    };

    // Act
    const quarterlyResult = await recommendGoals(quarterlyRequest);
    const annualResult = await recommendGoals(annualRequest);

    // Assert
    const avgQuarterlyTimeline = quarterlyResult.goals.reduce((sum, g) => sum + g.timeline_weeks, 0) / quarterlyResult.goals.length;
    const avgAnnualTimeline = annualResult.goals.reduce((sum, g) => sum + g.timeline_weeks, 0) / annualResult.goals.length;
    expect(avgAnnualTimeline).toBeGreaterThan(avgQuarterlyTimeline);
  });
});

describe('Performance AI Actions - generateDevelopmentPlan', () => {
  it('should generate a comprehensive development plan', async () => {
    // Arrange
    const request: DevelopmentPlanRequest = {
      employeeId: 'emp_123'
    };

    // Act
    const result = await generateDevelopmentPlan(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(result.plan.objectives).toBeDefined();
    expect(Array.isArray(result.plan.objectives)).toBe(true);
    expect(result.plan.timeline_months).toBeGreaterThan(0);
  });

  it('should include milestones with target dates and deliverables', async () => {
    // Arrange
    const request: DevelopmentPlanRequest = {
      employeeId: 'emp_123',
      durationMonths: 6
    };

    // Act
    const result = await generateDevelopmentPlan(request);

    // Assert
    expect(result.plan.milestones).toBeDefined();
    expect(Array.isArray(result.plan.milestones)).toBe(true);
    result.plan.milestones.forEach(milestone => {
      expect(milestone.milestone).toBeDefined();
      expect(milestone.target_month).toBeGreaterThan(0);
      expect(milestone.target_month).toBeLessThanOrEqual(result.plan.timeline_months);
      expect(Array.isArray(milestone.deliverables)).toBe(true);
    });
  });

  it('should categorize skill development areas', async () => {
    // Arrange
    const request: DevelopmentPlanRequest = {
      employeeId: 'emp_123',
      durationMonths: 12
    };

    // Act
    const result = await generateDevelopmentPlan(request);

    // Assert
    expect(result.skillDevelopment).toBeDefined();
    expect(result.skillDevelopment.technical).toBeDefined();
    expect(result.skillDevelopment.soft_skills).toBeDefined();
    expect(result.skillDevelopment.leadership).toBeDefined();
    expect(result.skillDevelopment.domain_knowledge).toBeDefined();
  });

  it('should recommend specific learning resources', async () => {
    // Arrange
    const request: DevelopmentPlanRequest = {
      employeeId: 'emp_123'
    };

    // Act
    const result = await generateDevelopmentPlan(request);

    // Assert
    expect(result.resources).toBeDefined();
    expect(Array.isArray(result.resources)).toBe(true);
    result.resources.forEach(resource => {
      expect(resource.type).toBeDefined();
      expect(['course', 'book', 'mentor', 'project', 'certification', 'workshop']).toContain(resource.type);
      expect(resource.title).toBeDefined();
      expect(resource.estimated_hours).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(resource.priority);
    });
  });

  it('should define success metrics for the plan', async () => {
    // Arrange
    const request: DevelopmentPlanRequest = {
      employeeId: 'emp_123',
      durationMonths: 6
    };

    // Act
    const result = await generateDevelopmentPlan(request);

    // Assert
    expect(result.successMetrics).toBeDefined();
    expect(Array.isArray(result.successMetrics)).toBe(true);
    result.successMetrics.forEach(metric => {
      expect(metric.metric).toBeDefined();
      expect(metric.target).toBeDefined();
      expect(metric.measurement_method).toBeDefined();
    });
  });

  it('should incorporate review data when reviewId provided', async () => {
    // Arrange
    const request: DevelopmentPlanRequest = {
      employeeId: 'emp_123',
      reviewId: 'review_456',
      durationMonths: 12
    };

    // Act
    const result = await generateDevelopmentPlan(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.plan).toBeDefined();
  });

  it('should use default duration when not specified', async () => {
    // Arrange
    const request: DevelopmentPlanRequest = {
      employeeId: 'emp_123'
    };

    // Act
    const result = await generateDevelopmentPlan(request);

    // Assert
    expect(result.plan.timeline_months).toBeDefined();
    expect(result.plan.timeline_months).toBeGreaterThan(0);
  });
});

describe('Performance AI Actions - analyzeFeedback', () => {
  it('should categorize feedback into strengths, improvements, achievements, and concerns', async () => {
    // Arrange
    const request: FeedbackAnalysisRequest = {
      feedbackText: 'John demonstrates excellent leadership and communication skills. However, he needs to improve time management.',
      feedbackType: 'manager'
    };

    // Act
    const result = await analyzeFeedback(request);

    // Assert
    expect(result.categories).toBeDefined();
    expect(Array.isArray(result.categories.strengths)).toBe(true);
    expect(Array.isArray(result.categories.areas_for_improvement)).toBe(true);
    expect(Array.isArray(result.categories.achievements)).toBe(true);
    expect(Array.isArray(result.categories.concerns)).toBe(true);
  });

  it('should analyze sentiment of feedback', async () => {
    // Arrange
    const request: FeedbackAnalysisRequest = {
      feedbackText: 'Outstanding performance this quarter! Consistently exceeds expectations.',
      feedbackType: 'peer'
    };

    // Act
    const result = await analyzeFeedback(request);

    // Assert
    expect(result.sentiment).toBeDefined();
    expect(['very_positive', 'positive', 'neutral', 'constructive', 'negative']).toContain(result.sentiment.overall);
    expect(result.sentiment.score).toBeGreaterThanOrEqual(-1);
    expect(result.sentiment.score).toBeLessThanOrEqual(1);
    expect(result.sentiment.confidence).toBeGreaterThanOrEqual(0);
    expect(result.sentiment.confidence).toBeLessThanOrEqual(100);
  });

  it('should extract key themes from feedback', async () => {
    // Arrange
    const request: FeedbackAnalysisRequest = {
      feedbackText: 'Great team collaboration and technical expertise. Delivers high-quality work consistently.',
      feedbackType: '360'
    };

    // Act
    const result = await analyzeFeedback(request);

    // Assert
    expect(result.themes).toBeDefined();
    expect(Array.isArray(result.themes)).toBe(true);
    result.themes.forEach(theme => {
      expect(theme.theme).toBeDefined();
      expect(theme.frequency).toBeGreaterThan(0);
      expect(['positive', 'neutral', 'negative']).toContain(theme.sentiment);
    });
  });

  it('should provide actionable recommendations based on feedback', async () => {
    // Arrange
    const request: FeedbackAnalysisRequest = {
      feedbackText: 'Needs to delegate more effectively and develop junior team members.',
      feedbackType: 'upward'
    };

    // Act
    const result = await analyzeFeedback(request);

    // Assert
    expect(result.actionableRecommendations).toBeDefined();
    expect(Array.isArray(result.actionableRecommendations)).toBe(true);
    expect(result.actionableRecommendations.length).toBeGreaterThan(0);
  });

  it('should assess bias indicators in feedback', async () => {
    // Arrange
    const request: FeedbackAnalysisRequest = {
      feedbackText: 'Generally performs well in assigned tasks.',
      feedbackType: 'self'
    };

    // Act
    const result = await analyzeFeedback(request);

    // Assert
    expect(result.biasIndicators).toBeDefined();
    expect(Array.isArray(result.biasIndicators)).toBe(true);
  });

  it('should handle different feedback types appropriately', async () => {
    // Arrange
    const managerRequest: FeedbackAnalysisRequest = {
      feedbackText: 'Strong technical skills and leadership potential.',
      feedbackType: 'manager'
    };

    const peerRequest: FeedbackAnalysisRequest = {
      feedbackText: 'Great collaborator and team player.',
      feedbackType: 'peer'
    };

    // Act
    const managerResult = await analyzeFeedback(managerRequest);
    const peerResult = await analyzeFeedback(peerRequest);

    // Assert
    expect(managerResult).toBeDefined();
    expect(peerResult).toBeDefined();
    expect(managerResult.categories).toBeDefined();
    expect(peerResult.categories).toBeDefined();
  });
});

describe('Performance AI Actions - supportCalibration', () => {
  it('should analyze rating distribution across department', async () => {
    // Arrange
    const request: CalibrationRequest = {
      departmentId: 'dept_123',
      reviewPeriod: '2024-Q1'
    };

    // Act
    const result = await supportCalibration(request);

    // Assert
    expect(result.distribution).toBeDefined();
    expect(result.distribution.outstanding).toBeGreaterThanOrEqual(0);
    expect(result.distribution.exceeds_expectations).toBeGreaterThanOrEqual(0);
    expect(result.distribution.meets_expectations).toBeGreaterThanOrEqual(0);
    expect(result.distribution.needs_improvement).toBeGreaterThanOrEqual(0);
    expect(result.distribution.unsatisfactory).toBeGreaterThanOrEqual(0);
  });

  it('should identify distribution concerns', async () => {
    // Arrange
    const request: CalibrationRequest = {
      departmentId: 'dept_123',
      reviewPeriod: '2024-Q1'
    };

    // Act
    const result = await supportCalibration(request);

    // Assert
    expect(result.analysis).toBeDefined();
    expect(result.analysis.concerns).toBeDefined();
    expect(Array.isArray(result.analysis.concerns)).toBe(true);
  });

  it('should compare distribution to organizational norms', async () => {
    // Arrange
    const request: CalibrationRequest = {
      departmentId: 'dept_123',
      reviewPeriod: '2024-Q1'
    };

    // Act
    const result = await supportCalibration(request);

    // Assert
    expect(result.analysis.compared_to_org).toBeDefined();
    expect(['above_average', 'average', 'below_average']).toContain(result.analysis.compared_to_org);
  });

  it('should identify outliers for review', async () => {
    // Arrange
    const request: CalibrationRequest = {
      departmentId: 'dept_123',
      reviewPeriod: '2024-Q1'
    };

    // Act
    const result = await supportCalibration(request);

    // Assert
    expect(result.outliers).toBeDefined();
    expect(Array.isArray(result.outliers)).toBe(true);
    result.outliers.forEach(outlier => {
      expect(outlier.employee_id).toBeDefined();
      expect(outlier.rating).toBeDefined();
      expect(outlier.reason).toBeDefined();
      expect(['too_high', 'too_low', 'inconsistent']).toContain(outlier.flag_type);
    });
  });

  it('should provide calibration recommendations', async () => {
    // Arrange
    const request: CalibrationRequest = {
      departmentId: 'dept_123',
      reviewPeriod: '2024-Q1'
    };

    // Act
    const result = await supportCalibration(request);

    // Assert
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    result.recommendations.forEach(rec => {
      expect(rec.type).toBeDefined();
      expect(rec.description).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(rec.priority);
    });
  });

  it('should calculate fairness metrics', async () => {
    // Arrange
    const request: CalibrationRequest = {
      departmentId: 'dept_123',
      reviewPeriod: '2024-Q1'
    };

    // Act
    const result = await supportCalibration(request);

    // Assert
    expect(result.fairnessMetrics).toBeDefined();
    expect(result.fairnessMetrics.rating_variance).toBeDefined();
    expect(result.fairnessMetrics.manager_consistency).toBeGreaterThanOrEqual(0);
    expect(result.fairnessMetrics.manager_consistency).toBeLessThanOrEqual(100);
  });
});

describe('Performance AI Actions - synthesize360Review', () => {
  it('should synthesize feedback from multiple sources', async () => {
    // Arrange
    const request: Review360SynthesisRequest = {
      reviewId: 'review_123'
    };

    // Act
    const result = await synthesize360Review(request);

    // Assert
    expect(result.synthesis).toBeDefined();
    expect(result.synthesis.strengths).toBeDefined();
    expect(Array.isArray(result.synthesis.strengths)).toBe(true);
    expect(result.synthesis.improvements).toBeDefined();
    expect(Array.isArray(result.synthesis.improvements)).toBe(true);
  });

  it('should identify common themes with source tracking', async () => {
    // Arrange
    const request: Review360SynthesisRequest = {
      reviewId: 'review_123'
    };

    // Act
    const result = await synthesize360Review(request);

    // Assert
    result.synthesis.strengths.forEach(strength => {
      expect(strength.theme).toBeDefined();
      expect(strength.mentions).toBeGreaterThan(0);
      expect(Array.isArray(strength.sources)).toBe(true);
      expect(Array.isArray(strength.quotes)).toBe(true);
    });

    result.synthesis.improvements.forEach(improvement => {
      expect(improvement.theme).toBeDefined();
      expect(improvement.mentions).toBeGreaterThan(0);
      expect(Array.isArray(improvement.sources)).toBe(true);
      expect(Array.isArray(improvement.quotes)).toBe(true);
    });
  });

  it('should analyze agreement levels between different rater groups', async () => {
    // Arrange
    const request: Review360SynthesisRequest = {
      reviewId: 'review_123'
    };

    // Act
    const result = await synthesize360Review(request);

    // Assert
    expect(result.agreementAnalysis).toBeDefined();
    expect(result.agreementAnalysis.overall_consensus).toBeDefined();
    expect(['high', 'medium', 'low']).toContain(result.agreementAnalysis.overall_consensus);
  });

  it('should identify blind spots between self and others ratings', async () => {
    // Arrange
    const request: Review360SynthesisRequest = {
      reviewId: 'review_123'
    };

    // Act
    const result = await synthesize360Review(request);

    // Assert
    expect(result.blindSpots).toBeDefined();
    expect(Array.isArray(result.blindSpots)).toBe(true);
    result.blindSpots.forEach(blindSpot => {
      expect(blindSpot.area).toBeDefined();
      expect(['overestimate', 'underestimate']).toContain(blindSpot.gap_type);
      expect(blindSpot.self_rating).toBeDefined();
      expect(blindSpot.others_rating).toBeDefined();
      expect(blindSpot.gap_size).toBeDefined();
    });
  });

  it('should generate development priorities from 360 feedback', async () => {
    // Arrange
    const request: Review360SynthesisRequest = {
      reviewId: 'review_123'
    };

    // Act
    const result = await synthesize360Review(request);

    // Assert
    expect(result.developmentPriorities).toBeDefined();
    expect(Array.isArray(result.developmentPriorities)).toBe(true);
    result.developmentPriorities.forEach(priority => {
      expect(priority.area).toBeDefined();
      expect(['critical', 'important', 'beneficial']).toContain(priority.importance);
      expect(priority.rationale).toBeDefined();
      expect(Array.isArray(priority.suggested_actions)).toBe(true);
    });
  });

  it('should provide an overall summary with key insights', async () => {
    // Arrange
    const request: Review360SynthesisRequest = {
      reviewId: 'review_123'
    };

    // Act
    const result = await synthesize360Review(request);

    // Assert
    expect(result.overallSummary).toBeDefined();
    expect(result.overallSummary.executive_summary).toBeDefined();
    expect(result.overallSummary.key_strengths).toBeDefined();
    expect(result.overallSummary.development_areas).toBeDefined();
    expect(result.overallSummary.recommended_next_steps).toBeDefined();
  });

  it('should calculate confidence scores for the synthesis', async () => {
    // Arrange
    const request: Review360SynthesisRequest = {
      reviewId: 'review_123'
    };

    // Act
    const result = await synthesize360Review(request);

    // Assert
    expect(result.confidence).toBeDefined();
    expect(result.confidence.data_completeness).toBeGreaterThanOrEqual(0);
    expect(result.confidence.data_completeness).toBeLessThanOrEqual(100);
    expect(result.confidence.response_quality).toBeGreaterThanOrEqual(0);
    expect(result.confidence.response_quality).toBeLessThanOrEqual(100);
  });
});
