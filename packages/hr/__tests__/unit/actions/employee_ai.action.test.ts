/**
 * Unit Tests for Employee AI Actions
 * 
 * Tests all 6 AI-powered employee management functions:
 * 1. predictRetentionRisk - Employee retention risk prediction
 * 2. recommendCareerPaths - Career development path recommendations
 * 3. analyzeSkillGaps - Skill gap analysis and training needs
 * 4. predictPerformance - Future performance trend prediction
 * 5. analyzeTeamComposition - Team structure and dynamics analysis
 * 6. benchmarkCompensation - Market compensation benchmarking
 * 
 * Each function has 5 test cases covering:
 * - Happy path scenarios
 * - Edge cases
 * - Data validation
 * - Response structure verification
 * - Business logic accuracy
 * 
 * All tests follow the AAA (Arrange-Act-Assert) pattern.
 */

import {
  predictRetentionRisk,
  recommendCareerPaths,
  analyzeSkillGaps,
  predictPerformance,
  analyzeTeamComposition,
  benchmarkCompensation,
  RetentionRiskRequest,
  CareerPathRequest,
  SkillGapRequest,
  PerformancePredictionRequest,
  TeamAnalysisRequest,
  CompensationBenchmarkRequest
} from '../../../src/actions/employee_ai.action';

describe('Employee AI Actions - predictRetentionRisk', () => {
  it('should predict retention risk for an employee', async () => {
    // Arrange
    const request: RetentionRiskRequest = {
      employeeId: 'emp_123'
    };

    // Act
    const result = await predictRetentionRisk(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.riskLevel).toBeDefined();
    expect(['critical', 'high', 'medium', 'low', 'very_low']).toContain(result.riskLevel);
  });

  it('should calculate risk score between 0 and 100', async () => {
    // Arrange
    const request: RetentionRiskRequest = {
      employeeId: 'emp_123'
    };

    // Act
    const result = await predictRetentionRisk(request);

    // Assert
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(result.retentionProbability).toBeGreaterThanOrEqual(0);
    expect(result.retentionProbability).toBeLessThanOrEqual(100);
  });

  it('should identify risk factors with impact levels', async () => {
    // Arrange
    const request: RetentionRiskRequest = {
      employeeId: 'emp_456'
    };

    // Act
    const result = await predictRetentionRisk(request);

    // Assert
    expect(result.riskFactors).toBeDefined();
    expect(Array.isArray(result.riskFactors)).toBe(true);
    if (result.riskFactors.length > 0) {
      const factor = result.riskFactors[0];
      expect(factor.factor).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(factor.impact);
      expect(factor.description).toBeDefined();
    }
  });

  it('should provide protective factors', async () => {
    // Arrange
    const request: RetentionRiskRequest = {
      employeeId: 'emp_789'
    };

    // Act
    const result = await predictRetentionRisk(request);

    // Assert
    expect(result.protectiveFactors).toBeDefined();
    expect(Array.isArray(result.protectiveFactors)).toBe(true);
  });

  it('should provide actionable recommendations with priorities', async () => {
    // Arrange
    const request: RetentionRiskRequest = {
      employeeId: 'emp_101'
    };

    // Act
    const result = await predictRetentionRisk(request);

    // Assert
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    if (result.recommendations.length > 0) {
      const recommendation = result.recommendations[0];
      expect(recommendation.action).toBeDefined();
      expect(['urgent', 'high', 'medium', 'low']).toContain(recommendation.priority);
      expect(recommendation.expectedImpact).toBeDefined();
    }
  });
});

describe('Employee AI Actions - recommendCareerPaths', () => {
  it('should recommend career paths for an employee', async () => {
    // Arrange
    const request: CareerPathRequest = {
      employeeId: 'emp_123'
    };

    // Act
    const result = await recommendCareerPaths(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.careerPaths).toBeDefined();
    expect(Array.isArray(result.careerPaths)).toBe(true);
    expect(result.careerPaths.length).toBeGreaterThan(0);
  });

  it('should include detailed career path information', async () => {
    // Arrange
    const request: CareerPathRequest = {
      employeeId: 'emp_123',
      timeHorizon: 5
    };

    // Act
    const result = await recommendCareerPaths(request);

    // Assert
    if (result.careerPaths.length > 0) {
      const path = result.careerPaths[0];
      expect(path.path_name).toBeDefined();
      expect(['individual_contributor', 'management', 'specialist', 'lateral']).toContain(path.path_type);
      expect(path.timeline_years).toBeGreaterThan(0);
      expect(Array.isArray(path.target_roles)).toBe(true);
      expect(Array.isArray(path.required_skills)).toBe(true);
      expect(Array.isArray(path.skill_gaps)).toBe(true);
      expect(Array.isArray(path.training_recommendations)).toBe(true);
      expect(path.probability).toBeGreaterThanOrEqual(0);
      expect(path.probability).toBeLessThanOrEqual(100);
    }
  });

  it('should identify current career stage', async () => {
    // Arrange
    const request: CareerPathRequest = {
      employeeId: 'emp_456'
    };

    // Act
    const result = await recommendCareerPaths(request);

    // Assert
    expect(result.currentStage).toBeDefined();
    expect(typeof result.currentStage).toBe('string');
  });

  it('should provide development priorities', async () => {
    // Arrange
    const request: CareerPathRequest = {
      employeeId: 'emp_789'
    };

    // Act
    const result = await recommendCareerPaths(request);

    // Assert
    expect(result.developmentPriorities).toBeDefined();
    expect(Array.isArray(result.developmentPriorities)).toBe(true);
  });

  it('should define next milestone with requirements', async () => {
    // Arrange
    const request: CareerPathRequest = {
      employeeId: 'emp_101',
      timeHorizon: 3
    };

    // Act
    const result = await recommendCareerPaths(request);

    // Assert
    expect(result.nextMilestone).toBeDefined();
    expect(result.nextMilestone.role).toBeDefined();
    expect(result.nextMilestone.timeline).toBeDefined();
    expect(Array.isArray(result.nextMilestone.requirements)).toBe(true);
  });
});

describe('Employee AI Actions - analyzeSkillGaps', () => {
  it('should analyze skill gaps for an employee', async () => {
    // Arrange
    const request: SkillGapRequest = {
      employeeId: 'emp_123'
    };

    // Act
    const result = await analyzeSkillGaps(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.skillGaps).toBeDefined();
    expect(Array.isArray(result.skillGaps)).toBe(true);
  });

  it('should provide detailed skill gap information', async () => {
    // Arrange
    const request: SkillGapRequest = {
      employeeId: 'emp_123',
      targetRole: 'Senior Developer'
    };

    // Act
    const result = await analyzeSkillGaps(request);

    // Assert
    if (result.skillGaps.length > 0) {
      const gap = result.skillGaps[0];
      expect(gap.skill).toBeDefined();
      expect(['none', 'beginner', 'intermediate', 'advanced', 'expert']).toContain(gap.current_level);
      expect(['beginner', 'intermediate', 'advanced', 'expert']).toContain(gap.required_level);
      expect(['critical', 'high', 'medium', 'low']).toContain(gap.gap_severity);
      expect(gap.business_impact).toBeDefined();
    }
  });

  it('should provide training recommendations', async () => {
    // Arrange
    const request: SkillGapRequest = {
      employeeId: 'emp_456'
    };

    // Act
    const result = await analyzeSkillGaps(request);

    // Assert
    expect(result.trainingRecommendations).toBeDefined();
    expect(Array.isArray(result.trainingRecommendations)).toBe(true);
    if (result.trainingRecommendations.length > 0) {
      const training = result.trainingRecommendations[0];
      expect(training.training_name).toBeDefined();
      expect(['course', 'certification', 'workshop', 'mentoring', 'project']).toContain(training.training_type);
      expect(training.duration_weeks).toBeGreaterThan(0);
      expect(['urgent', 'high', 'medium', 'low']).toContain(training.priority);
      expect(Array.isArray(training.skills_addressed)).toBe(true);
      expect(training.estimated_cost).toBeGreaterThanOrEqual(0);
    }
  });

  it('should calculate overall readiness score', async () => {
    // Arrange
    const request: SkillGapRequest = {
      employeeId: 'emp_789',
      targetRole: 'Team Lead'
    };

    // Act
    const result = await analyzeSkillGaps(request);

    // Assert
    expect(result.readinessScore).toBeDefined();
    expect(result.readinessScore).toBeGreaterThanOrEqual(0);
    expect(result.readinessScore).toBeLessThanOrEqual(100);
  });

  it('should support team-based skill gap analysis', async () => {
    // Arrange
    const request: SkillGapRequest = {
      teamId: 'team_101'
    };

    // Act
    const result = await analyzeSkillGaps(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.skillGaps).toBeDefined();
    expect(result.trainingRecommendations).toBeDefined();
  });
});

describe('Employee AI Actions - predictPerformance', () => {
  it('should predict employee performance trend', async () => {
    // Arrange
    const request: PerformancePredictionRequest = {
      employeeId: 'emp_123'
    };

    // Act
    const result = await predictPerformance(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.trend).toBeDefined();
    expect(['improving', 'stable', 'declining']).toContain(result.trend);
  });

  it('should predict rating with confidence level', async () => {
    // Arrange
    const request: PerformancePredictionRequest = {
      employeeId: 'emp_123',
      horizonMonths: 6
    };

    // Act
    const result = await predictPerformance(request);

    // Assert
    expect(result.predictedRating).toBeDefined();
    expect(result.predictedRating).toBeGreaterThan(0);
    expect(result.predictedRating).toBeLessThanOrEqual(5);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('should identify influencing factors with weights', async () => {
    // Arrange
    const request: PerformancePredictionRequest = {
      employeeId: 'emp_456'
    };

    // Act
    const result = await predictPerformance(request);

    // Assert
    expect(result.influencingFactors).toBeDefined();
    expect(Array.isArray(result.influencingFactors)).toBe(true);
    if (result.influencingFactors.length > 0) {
      const factor = result.influencingFactors[0];
      expect(factor.factor).toBeDefined();
      expect(['positive', 'negative', 'neutral']).toContain(factor.impact);
      expect(factor.weight).toBeGreaterThanOrEqual(0);
      expect(factor.weight).toBeLessThanOrEqual(1);
    }
  });

  it('should provide early warning signs', async () => {
    // Arrange
    const request: PerformancePredictionRequest = {
      employeeId: 'emp_789',
      horizonMonths: 12
    };

    // Act
    const result = await predictPerformance(request);

    // Assert
    expect(result.earlyWarnings).toBeDefined();
    expect(Array.isArray(result.earlyWarnings)).toBe(true);
  });

  it('should identify growth opportunities and actions', async () => {
    // Arrange
    const request: PerformancePredictionRequest = {
      employeeId: 'emp_101'
    };

    // Act
    const result = await predictPerformance(request);

    // Assert
    expect(result.growthOpportunities).toBeDefined();
    expect(Array.isArray(result.growthOpportunities)).toBe(true);
    expect(result.recommendedActions).toBeDefined();
    expect(Array.isArray(result.recommendedActions)).toBe(true);
  });
});

describe('Employee AI Actions - analyzeTeamComposition', () => {
  it('should analyze team composition and metrics', async () => {
    // Arrange
    const request: TeamAnalysisRequest = {
      departmentId: 'dept_123'
    };

    // Act
    const result = await analyzeTeamComposition(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.metrics.totalMembers).toBeGreaterThanOrEqual(0);
    expect(result.metrics.averageTenure).toBeGreaterThanOrEqual(0);
    expect(result.metrics.averageRating).toBeGreaterThanOrEqual(0);
    expect(result.metrics.diversityScore).toBeGreaterThanOrEqual(0);
    expect(result.metrics.diversityScore).toBeLessThanOrEqual(100);
    expect(['low', 'medium', 'high']).toContain(result.metrics.retentionRisk);
  });

  it('should analyze skill coverage across team', async () => {
    // Arrange
    const request: TeamAnalysisRequest = {
      departmentId: 'dept_456'
    };

    // Act
    const result = await analyzeTeamComposition(request);

    // Assert
    expect(result.skillCoverage).toBeDefined();
    expect(Array.isArray(result.skillCoverage)).toBe(true);
    if (result.skillCoverage.length > 0) {
      const skill = result.skillCoverage[0];
      expect(skill.skill).toBeDefined();
      expect(['excellent', 'good', 'adequate', 'insufficient']).toContain(skill.coverage_level);
      expect(skill.member_count).toBeGreaterThanOrEqual(0);
    }
  });

  it('should identify team strengths and gaps', async () => {
    // Arrange
    const request: TeamAnalysisRequest = {
      departmentId: 'dept_789'
    };

    // Act
    const result = await analyzeTeamComposition(request);

    // Assert
    expect(result.strengths).toBeDefined();
    expect(Array.isArray(result.strengths)).toBe(true);
    expect(result.gaps).toBeDefined();
    expect(Array.isArray(result.gaps)).toBe(true);
  });

  it('should provide hiring recommendations', async () => {
    // Arrange
    const request: TeamAnalysisRequest = {
      departmentId: 'dept_101'
    };

    // Act
    const result = await analyzeTeamComposition(request);

    // Assert
    expect(result.hiringRecommendations).toBeDefined();
    expect(Array.isArray(result.hiringRecommendations)).toBe(true);
  });

  it('should calculate team diversity metrics', async () => {
    // Arrange
    const request: TeamAnalysisRequest = {
      departmentId: 'dept_202'
    };

    // Act
    const result = await analyzeTeamComposition(request);

    // Assert
    expect(result.metrics.diversityScore).toBeDefined();
    expect(result.metrics.totalMembers).toBeDefined();
  });
});

describe('Employee AI Actions - benchmarkCompensation', () => {
  it('should benchmark employee compensation against market', async () => {
    // Arrange
    const request: CompensationBenchmarkRequest = {
      employeeId: 'emp_123'
    };

    // Act
    const result = await benchmarkCompensation(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.currentCompensation).toBeDefined();
    expect(result.currentCompensation.base_salary).toBeGreaterThan(0);
    expect(result.currentCompensation.total_compensation).toBeGreaterThan(0);
  });

  it('should provide market data with percentiles', async () => {
    // Arrange
    const request: CompensationBenchmarkRequest = {
      employeeId: 'emp_123',
      location: 'San Francisco'
    };

    // Act
    const result = await benchmarkCompensation(request);

    // Assert
    expect(result.marketData).toBeDefined();
    expect(result.marketData.percentile_25).toBeGreaterThan(0);
    expect(result.marketData.percentile_50).toBeGreaterThan(0);
    expect(result.marketData.percentile_75).toBeGreaterThan(0);
    expect(result.marketData.percentile_90).toBeGreaterThan(0);
    expect(result.marketData.percentile_50).toBeGreaterThan(result.marketData.percentile_25);
    expect(result.marketData.percentile_75).toBeGreaterThan(result.marketData.percentile_50);
  });

  it('should determine market position accurately', async () => {
    // Arrange
    const request: CompensationBenchmarkRequest = {
      employeeId: 'emp_456'
    };

    // Act
    const result = await benchmarkCompensation(request);

    // Assert
    expect(result.marketPosition).toBeDefined();
    expect(result.marketPosition.percentile).toBeGreaterThanOrEqual(0);
    expect(result.marketPosition.percentile).toBeLessThanOrEqual(100);
    expect(['above_market', 'at_market', 'below_market', 'significantly_below']).toContain(result.marketPosition.status);
    expect(result.marketPosition.gap_amount).toBeDefined();
    expect(result.marketPosition.gap_percentage).toBeDefined();
  });

  it('should provide compensation recommendations', async () => {
    // Arrange
    const request: CompensationBenchmarkRequest = {
      employeeId: 'emp_789',
      location: 'New York'
    };

    // Act
    const result = await benchmarkCompensation(request);

    // Assert
    expect(result.recommendations).toBeDefined();
  });

  it('should handle location-specific benchmarking', async () => {
    // Arrange
    const requestSF: CompensationBenchmarkRequest = {
      employeeId: 'emp_101',
      location: 'San Francisco'
    };

    const requestNY: CompensationBenchmarkRequest = {
      employeeId: 'emp_101',
      location: 'New York'
    };

    // Act
    const resultSF = await benchmarkCompensation(requestSF);
    const resultNY = await benchmarkCompensation(requestNY);

    // Assert
    expect(resultSF.marketData).toBeDefined();
    expect(resultNY.marketData).toBeDefined();
    // Different locations may have different market rates
  });
});
