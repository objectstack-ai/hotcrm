import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  broker: {
    find: vi.fn()
  }
}));

import { broker } from '../../../src/db';
import {
  analyzeTimeToHire,
  analyzeAttrition,
  analyzePerformanceTrends,
  AnalyzeTimeToHireRequest,
  AnalyzeAttritionRequest,
  AnalyzePerformanceTrendsRequest
} from '../../../src/actions/hr_analytics.action';

describe('HR Analytics - analyzeTimeToHire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate overall time-to-hire metrics', async () => {
    const mockRecruitments = [
      { requisition_id: 'R-001', department: 'Engineering', position_level: 'Senior', source: 'LinkedIn', posting_date: '2024-01-01', screening_date: '2024-01-10', interview_date: '2024-01-20', offer_date: '2024-01-30', acceptance_date: '2024-02-05', start_date: '2024-03-01', status: 'hired', cost: 5000 },
      { requisition_id: 'R-002', department: 'Sales', position_level: 'Junior', source: 'Referral', posting_date: '2024-02-01', screening_date: '2024-02-08', interview_date: '2024-02-15', offer_date: '2024-02-20', acceptance_date: '2024-02-25', start_date: '2024-03-15', status: 'hired', cost: 3000 },
    ];
    const mockApplications = [
      { requisition_id: 'R-001', status: 'hired', applied_date: '2024-01-02', source: 'LinkedIn', department: 'Engineering' },
      { requisition_id: 'R-001', status: 'rejected', applied_date: '2024-01-03', source: 'LinkedIn', department: 'Engineering' },
      { requisition_id: 'R-002', status: 'hired', applied_date: '2024-02-02', source: 'Referral', department: 'Sales' },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockRecruitments)
      .mockResolvedValueOnce(mockApplications);

    const result = await analyzeTimeToHire({});

    expect(result.overall.totalHires).toBe(2);
    expect(result.overall.averageDays).toBeGreaterThan(0);
    expect(result.overall.medianDays).toBeGreaterThan(0);
    expect(result.overall.minDays).toBeLessThanOrEqual(result.overall.maxDays);
  });

  it('should break down by department', async () => {
    const mockRecruitments = [
      { requisition_id: 'R-001', department: 'Engineering', position_level: 'Senior', source: 'LinkedIn', posting_date: '2024-01-01', acceptance_date: '2024-02-01', status: 'hired', cost: 5000 },
      { requisition_id: 'R-002', department: 'Engineering', position_level: 'Junior', source: 'Referral', posting_date: '2024-01-15', acceptance_date: '2024-02-15', status: 'hired', cost: 3000 },
      { requisition_id: 'R-003', department: 'Sales', position_level: 'Mid', source: 'Direct', posting_date: '2024-02-01', acceptance_date: '2024-02-20', status: 'hired', cost: 2000 },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockRecruitments)
      .mockResolvedValueOnce([]);

    const result = await analyzeTimeToHire({});

    expect(result.byDepartment.length).toBe(2);
    const eng = result.byDepartment.find(d => d.department === 'Engineering');
    expect(eng!.hires).toBe(2);
  });

  it('should calculate stage durations and bottlenecks', async () => {
    const mockRecruitments = [
      { requisition_id: 'R-001', department: 'Engineering', position_level: 'Senior', source: 'LinkedIn', posting_date: '2024-01-01', screening_date: '2024-01-25', interview_date: '2024-02-10', offer_date: '2024-02-20', acceptance_date: '2024-02-25', start_date: '2024-03-01', status: 'hired', cost: 5000 },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockRecruitments)
      .mockResolvedValueOnce([]);

    const result = await analyzeTimeToHire({});

    expect(result.stageDurations.length).toBe(5);
    expect(result.stageDurations[0].stage).toBe('Application → Screening');
    expect(result.stageDurations[0].averageDays).toBeGreaterThan(0);
    expect(result.bottlenecks.length).toBeGreaterThan(0);
    result.bottlenecks.forEach(b => {
      expect(['low', 'medium', 'high', 'critical']).toContain(b.severity);
      expect(b.recommendation).toBeDefined();
    });
  });

  it('should calculate pipeline efficiency', async () => {
    const mockRecruitments = [
      { requisition_id: 'R-001', department: 'Engineering', position_level: 'Senior', source: 'Direct', posting_date: '2024-01-01', acceptance_date: '2024-02-01', status: 'hired', cost: 5000 },
    ];
    const mockApplications = [
      { requisition_id: 'R-001', status: 'hired', applied_date: '2024-01-02', source: 'Direct', department: 'Engineering' },
      { requisition_id: 'R-001', status: 'rejected', applied_date: '2024-01-03', source: 'Direct', department: 'Engineering' },
      { requisition_id: 'R-001', status: 'rejected', applied_date: '2024-01-04', source: 'Direct', department: 'Engineering' },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockRecruitments)
      .mockResolvedValueOnce(mockApplications);

    const result = await analyzeTimeToHire({});

    expect(result.pipelineEfficiency.totalApplications).toBe(3);
    expect(result.pipelineEfficiency.totalHires).toBe(1);
    expect(result.pipelineEfficiency.applicationsPerHire).toBe(3);
    expect(result.pipelineEfficiency.overallConversionRate).toBeGreaterThan(0);
  });

  it('should handle empty recruitment data', async () => {
    (broker.find as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await analyzeTimeToHire({});

    expect(result.overall.totalHires).toBe(0);
    expect(result.overall.averageDays).toBe(0);
    expect(result.byDepartment).toEqual([]);
    expect(result.pipelineEfficiency.totalHires).toBe(0);
  });
});

describe('HR Analytics - analyzeAttrition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate overall attrition rate', async () => {
    const now = new Date();
    const recentTermination = new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString();

    const mockEmployees = [
      { employee_id: 'e1', department: 'Engineering', hire_date: '2020-01-01', status: 'active', performance_rating: 'meets_expectations' },
      { employee_id: 'e2', department: 'Engineering', hire_date: '2021-06-01', status: 'active', performance_rating: 'exceeds_expectations' },
      { employee_id: 'e3', department: 'Sales', hire_date: '2019-03-01', termination_date: recentTermination, status: 'terminated', termination_type: 'voluntary', performance_rating: 'meets_expectations' },
    ];

    (broker.find as Mock).mockResolvedValueOnce(mockEmployees);

    const result = await analyzeAttrition({});

    expect(result.overall.totalDepartures).toBe(1);
    expect(result.overall.attritionRate).toBeGreaterThan(0);
    expect(result.overall.voluntaryRate).toBeGreaterThan(0);
    expect(result.overall.averageHeadcount).toBeGreaterThan(0);
  });

  it('should break down attrition by department', async () => {
    const now = new Date();
    const recentTermination = new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString();

    const mockEmployees = [
      { employee_id: 'e1', department: 'Engineering', hire_date: '2020-01-01', status: 'active', performance_rating: 'meets_expectations' },
      { employee_id: 'e2', department: 'Engineering', hire_date: '2021-01-01', termination_date: recentTermination, status: 'terminated', termination_type: 'voluntary', performance_rating: 'meets_expectations' },
      { employee_id: 'e3', department: 'Sales', hire_date: '2020-06-01', status: 'active', performance_rating: 'exceeds_expectations' },
    ];

    (broker.find as Mock).mockResolvedValueOnce(mockEmployees);

    const result = await analyzeAttrition({});

    expect(result.byDepartment.length).toBeGreaterThan(0);
    const eng = result.byDepartment.find(d => d.department === 'Engineering');
    expect(eng!.departures).toBe(1);
  });

  it('should classify regrettable vs non-regrettable turnover', async () => {
    const now = new Date();
    const recentTermination = new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString();

    const mockEmployees = [
      { employee_id: 'e1', department: 'Engineering', hire_date: '2020-01-01', termination_date: recentTermination, status: 'terminated', termination_type: 'voluntary', performance_rating: 'exceeds_expectations' },
      { employee_id: 'e2', department: 'Sales', hire_date: '2021-01-01', termination_date: recentTermination, status: 'terminated', termination_type: 'involuntary', performance_rating: 'Below Expectations' },
      { employee_id: 'e3', department: 'Engineering', hire_date: '2020-06-01', status: 'active', performance_rating: 'meets_expectations' },
    ];

    (broker.find as Mock).mockResolvedValueOnce(mockEmployees);

    const result = await analyzeAttrition({});

    expect(result.turnoverClassification).toBeDefined();
    expect(result.turnoverClassification.regrettable.count + result.turnoverClassification.nonRegrettable.count).toBe(2);
  });

  it('should provide retention recommendations', async () => {
    const now = new Date();
    const recentTermination = new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString();

    const mockEmployees = [
      { employee_id: 'e1', department: 'Engineering', hire_date: '2020-01-01', termination_date: recentTermination, status: 'terminated', termination_type: 'voluntary', performance_rating: 'meets_expectations' },
      { employee_id: 'e2', department: 'Engineering', hire_date: '2021-01-01', status: 'active', performance_rating: 'exceeds_expectations' },
    ];

    (broker.find as Mock).mockResolvedValueOnce(mockEmployees);

    const result = await analyzeAttrition({});

    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    if (result.recommendations.length > 0) {
      expect(result.recommendations[0].action).toBeDefined();
      expect(['critical', 'high', 'medium', 'low']).toContain(result.recommendations[0].priority);
    }
  });

  it('should handle no departures', async () => {
    const mockEmployees = [
      { employee_id: 'e1', department: 'Engineering', hire_date: '2020-01-01', status: 'active', performance_rating: 'meets_expectations' },
      { employee_id: 'e2', department: 'Sales', hire_date: '2021-01-01', status: 'active', performance_rating: 'exceeds_expectations' },
    ];

    (broker.find as Mock).mockResolvedValueOnce(mockEmployees);

    const result = await analyzeAttrition({});

    expect(result.overall.totalDepartures).toBe(0);
    expect(result.overall.attritionRate).toBe(0);
  });
});

describe('HR Analytics - analyzePerformanceTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate rating distribution', async () => {
    const mockReviews = [
      { employee_id: 'e1', review_cycle: '2024-H1', rating: 'meets_expectations', department: 'Engineering', manager_id: 'm1', manager_name: 'Manager A', goals_set: 5, goals_completed: 3, review_date: '2024-06-01' },
      { employee_id: 'e2', review_cycle: '2024-H1', rating: 'exceeds_expectations', department: 'Engineering', manager_id: 'm1', manager_name: 'Manager A', goals_set: 4, goals_completed: 4, review_date: '2024-06-01' },
      { employee_id: 'e3', review_cycle: '2024-H1', rating: 'exceptional', department: 'Sales', manager_id: 'm2', manager_name: 'Manager B', goals_set: 3, goals_completed: 3, review_date: '2024-06-01' },
    ];
    const mockEmployees = [
      { employee_id: 'e1', department: 'Engineering', hire_date: '2020-01-01', status: 'active', performance_rating: 'meets_expectations', manager_id: 'm1' },
      { employee_id: 'e2', department: 'Engineering', hire_date: '2021-01-01', status: 'active', performance_rating: 'exceeds_expectations', manager_id: 'm1' },
      { employee_id: 'e3', department: 'Sales', hire_date: '2019-06-01', status: 'active', performance_rating: 'exceptional', manager_id: 'm2' },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockReviews)
      .mockResolvedValueOnce(mockEmployees);

    const result = await analyzePerformanceTrends({});

    expect(result.ratingDistribution).toBeDefined();
    expect(result.ratingDistribution.length).toBe(5);
    const meetsExp = result.ratingDistribution.find(r => r.rating === 'meets_expectations');
    expect(meetsExp!.count).toBe(1);
  });

  it('should track rating trends over review cycles', async () => {
    const mockReviews = [
      { employee_id: 'e1', review_cycle: '2023-H2', rating: 'meets_expectations', department: 'Engineering', manager_id: 'm1', manager_name: 'Manager A', goals_set: 5, goals_completed: 3, review_date: '2023-12-01' },
      { employee_id: 'e1', review_cycle: '2024-H1', rating: 'exceeds_expectations', department: 'Engineering', manager_id: 'm1', manager_name: 'Manager A', goals_set: 5, goals_completed: 4, review_date: '2024-06-01' },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockReviews)
      .mockResolvedValueOnce([{ employee_id: 'e1', department: 'Engineering', hire_date: '2020-01-01', status: 'active', performance_rating: 'exceeds_expectations', manager_id: 'm1' }]);

    const result = await analyzePerformanceTrends({});

    expect(result.ratingTrends.length).toBe(2);
    result.ratingTrends.forEach(t => {
      expect(t.cycle).toBeDefined();
      expect(t.averageRating).toBeGreaterThan(0);
      expect(t.totalReviews).toBeGreaterThan(0);
    });
  });

  it('should calculate goal completion metrics', async () => {
    const mockReviews = [
      { employee_id: 'e1', review_cycle: '2024-H1', rating: 'meets_expectations', department: 'Engineering', manager_id: 'm1', manager_name: 'Mgr A', goals_set: 5, goals_completed: 4, review_date: '2024-06-01' },
      { employee_id: 'e2', review_cycle: '2024-H1', rating: 'exceeds_expectations', department: 'Sales', manager_id: 'm2', manager_name: 'Mgr B', goals_set: 3, goals_completed: 3, review_date: '2024-06-01' },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockReviews)
      .mockResolvedValueOnce([]);

    const result = await analyzePerformanceTrends({});

    expect(result.goalCompletion).toBeDefined();
    expect(result.goalCompletion.overallCompletionRate).toBeGreaterThan(0);
    expect(result.goalCompletion.overallCompletionRate).toBeLessThanOrEqual(100);
  });

  it('should include high performer insights', async () => {
    const mockReviews = [
      { employee_id: 'e1', review_cycle: '2024-H1', rating: 'exceptional', department: 'Engineering', manager_id: 'm1', manager_name: 'Mgr A', goals_set: 5, goals_completed: 5, review_date: '2024-06-01' },
      { employee_id: 'e2', review_cycle: '2024-H1', rating: 'meets_expectations', department: 'Sales', manager_id: 'm2', manager_name: 'Mgr B', goals_set: 3, goals_completed: 2, review_date: '2024-06-01' },
    ];
    const mockEmployees = [
      { employee_id: 'e1', department: 'Engineering', hire_date: '2020-01-01', status: 'active', performance_rating: 'exceptional', manager_id: 'm1' },
      { employee_id: 'e2', department: 'Sales', hire_date: '2021-01-01', status: 'active', performance_rating: 'meets_expectations', manager_id: 'm2' },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockReviews)
      .mockResolvedValueOnce(mockEmployees);

    const result = await analyzePerformanceTrends({});

    expect(result.highPerformerInsights).toBeDefined();
    expect(result.highPerformerInsights.count).toBeGreaterThanOrEqual(0);
    expect(result.highPerformerInsights.percentage).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty review data', async () => {
    (broker.find as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await analyzePerformanceTrends({});

    expect(result.ratingDistribution.length).toBe(5);
    result.ratingDistribution.forEach(r => {
      expect(r.count).toBe(0);
    });
    expect(result.ratingTrends).toEqual([]);
  });
});
