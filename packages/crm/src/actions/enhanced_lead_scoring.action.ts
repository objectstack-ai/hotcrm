/**
 * Enhanced Lead Scoring Action
 * 
 * Uses real ML models through the AI service layer for lead quality prediction
 */

import { PredictionService, ExplainabilityService } from '@hotcrm/ai';

export interface EnhancedLeadScoringRequest {
  leadId: string;
  explainPrediction?: boolean;
}

export interface EnhancedLeadScoringResponse {
  leadId: string;
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  confidence: number;
  factors: Array<{
    name: string;
    value: any;
    impact: number; // -100 to +100
    description: string;
  }>;
  recommendations: string[];
  processingTime: number;
  cached: boolean;
  modelVersion: string;
}

/**
 * Score a lead using AI/ML models
 */
export async function scoreLeadEnhanced(
  request: EnhancedLeadScoringRequest
): Promise<EnhancedLeadScoringResponse> {
  const { leadId, explainPrediction = true } = request;
  
  // Fetch lead data
  const lead = await fetchLead(leadId);
  
  // Extract features for ML model
  const features = {
    company_size: lead.company_size || 0,
    industry: lead.industry || 'Unknown',
    engagement_score: calculateEngagementScore(lead),
    job_title: lead.job_title || '',
    job_level: extractJobLevel(lead.job_title),
    estimated_budget: lead.estimated_budget || 0,
    email_domain: extractDomain(lead.email),
    lead_source: lead.source || 'Unknown',
    days_since_created: daysSince(lead.created_date),
    activity_count: lead.activity_count || 0,
    website_visits: lead.website_visits || 0,
    form_submissions: lead.form_submissions || 0
  };
  
  // Make prediction using AI service
  const prediction = await PredictionService.predict({
    modelId: 'lead-scoring-v2',
    features,
    context: {
      objectType: 'Lead',
      objectId: leadId,
      userId: lead.owner_id
    },
    useCache: true
  });
  
  const score = prediction.prediction.score || 0;
  const grade = getGrade(score);
  
  // Get explainability if requested
  let factors: any[] = [];
  let recommendations: string[] = [];
  
  if (explainPrediction) {
    const explanation = await ExplainabilityService.explainPrediction(
      'lead-scoring-v2',
      features,
      prediction.prediction,
      prediction.confidence
    );
    
    // Convert to factors
    factors = explanation.topFeatures.map(f => ({
      name: formatFeatureName(f.feature),
      value: f.value,
      impact: Math.round(f.contribution * 100),
      description: generateFactorDescription(f.feature, f.value, f.contribution)
    }));
    
    // Generate recommendations
    recommendations = generateRecommendations(score, factors, lead);
  }
  
  // Update lead record
  await updateLead(leadId, {
    ai_score: score,
    ai_grade: grade,
    ai_confidence: prediction.confidence,
    ai_last_scored: new Date(),
    ai_model_version: prediction.modelVersion
  });
  
  return {
    leadId,
    score,
    grade,
    confidence: prediction.confidence,
    factors,
    recommendations,
    processingTime: prediction.processingTime,
    cached: prediction.cached,
    modelVersion: prediction.modelVersion
  };
}

/**
 * Batch score multiple leads
 */
export async function batchScoreLeads(
  leadIds: string[]
): Promise<EnhancedLeadScoringResponse[]> {
  // Fetch all leads
  const leads = await fetchLeads(leadIds);
  
  // Extract features for all leads
  const featuresArray = leads.map(lead => ({
    company_size: lead.company_size || 0,
    industry: lead.industry || 'Unknown',
    engagement_score: calculateEngagementScore(lead),
    job_title: lead.job_title || '',
    job_level: extractJobLevel(lead.job_title),
    estimated_budget: lead.estimated_budget || 0,
    email_domain: extractDomain(lead.email),
    lead_source: lead.source || 'Unknown',
    days_since_created: daysSince(lead.created_date),
    activity_count: lead.activity_count || 0,
    website_visits: lead.website_visits || 0,
    form_submissions: lead.form_submissions || 0
  }));
  
  // Batch predict using AI service
  const predictions = await PredictionService.batchPredict(
    'lead-scoring-v2',
    featuresArray
  );
  
  // Process results
  const results: EnhancedLeadScoringResponse[] = [];
  
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const prediction = predictions[i];
    const score = prediction.prediction.score || 0;
    const grade = getGrade(score);
    
    // Update lead record
    await updateLead(lead.id, {
      ai_score: score,
      ai_grade: grade,
      ai_confidence: prediction.confidence,
      ai_last_scored: new Date(),
      ai_model_version: prediction.modelVersion
    });
    
    results.push({
      leadId: lead.id,
      score,
      grade,
      confidence: prediction.confidence,
      factors: [],
      recommendations: [],
      processingTime: prediction.processingTime,
      cached: prediction.cached,
      modelVersion: prediction.modelVersion
    });
  }
  
  return results;
}

// Helper functions

function calculateEngagementScore(lead: any): number {
  let score = 0;
  
  // Email engagement
  if (lead.email_opened) score += 20;
  if (lead.email_clicked) score += 30;
  if (lead.email_replied) score += 40;
  
  // Website engagement
  score += Math.min(lead.website_visits || 0, 5) * 10;
  
  // Form submissions
  score += Math.min(lead.form_submissions || 0, 3) * 10;
  
  // Activities
  score += Math.min(lead.activity_count || 0, 5) * 5;
  
  return Math.min(score, 100);
}

function extractJobLevel(title: string): string {
  if (!title) return 'Unknown';
  
  const lower = title.toLowerCase();
  
  if (lower.includes('ceo') || lower.includes('president') || lower.includes('founder')) {
    return 'C-Suite';
  }
  if (lower.includes('cto') || lower.includes('cio') || lower.includes('cfo') || lower.includes('cmo')) {
    return 'C-Suite';
  }
  if (lower.includes('vp') || lower.includes('vice president') || lower.includes('director')) {
    return 'Director';
  }
  if (lower.includes('manager') || lower.includes('head of')) {
    return 'Manager';
  }
  
  return 'Individual Contributor';
}

function extractDomain(email: string): string {
  if (!email) return 'Unknown';
  const parts = email.split('@');
  return parts.length > 1 ? parts[1] : 'Unknown';
}

function daysSince(date: Date | string): number {
  const then = new Date(date);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

function formatFeatureName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function generateFactorDescription(
  feature: string,
  value: any,
  contribution: number
): string {
  const impact = contribution > 0 ? 'increases' : 'decreases';
  const magnitude = Math.abs(contribution) > 0.2 ? 'significantly' : 'moderately';
  
  switch (feature) {
    case 'engagement_score':
      return `High engagement score ${magnitude} ${impact} lead quality`;
    case 'company_size':
      return `Company size ${magnitude} ${impact} likelihood of conversion`;
    case 'job_level':
      return `Job seniority ${magnitude} ${impact} decision-making authority`;
    case 'estimated_budget':
      return `Budget alignment ${magnitude} ${impact} deal potential`;
    default:
      return `${formatFeatureName(feature)} ${magnitude} ${impact} the prediction`;
  }
}

function generateRecommendations(
  score: number,
  factors: any[],
  lead: any
): string[] {
  const recommendations: string[] = [];
  
  // Score-based recommendations
  if (score >= 75) {
    recommendations.push('🔥 High-priority lead - schedule a call within 24 hours');
    recommendations.push('Assign to senior sales rep for personalized approach');
  } else if (score >= 60) {
    recommendations.push('Schedule discovery call to understand needs');
    recommendations.push('Send tailored product demo invitation');
  } else if (score >= 45) {
    recommendations.push('Continue nurturing with relevant content');
    recommendations.push('Monitor engagement for improvement signals');
  } else {
    recommendations.push('Add to automated nurture campaign');
    recommendations.push('Verify contact information accuracy');
  }
  
  // Factor-based recommendations
  const lowEngagement = factors.find(f => f.name.includes('Engagement') && f.impact < 0);
  if (lowEngagement) {
    recommendations.push('Improve engagement through personalized email campaign');
  }
  
  const lowBudget = factors.find(f => f.name.includes('Budget') && f.impact < 0);
  if (lowBudget) {
    recommendations.push('Discuss ROI and cost-saving benefits');
  }
  
  return recommendations;
}

// Mock database functions (replace with actual implementation)

async function fetchLead(leadId: string): Promise<any> {
  // Mock implementation
  return {
    id: leadId,
    company_size: 500,
    industry: 'Technology',
    job_title: 'CTO',
    email: 'cto@example.com',
    estimated_budget: 100000,
    source: 'Website',
    created_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    activity_count: 5,
    website_visits: 8,
    form_submissions: 2,
    email_opened: true,
    email_clicked: true,
    email_replied: false,
    owner_id: 'user-123'
  };
}

async function fetchLeads(leadIds: string[]): Promise<any[]> {
  return Promise.all(leadIds.map(id => fetchLead(id)));
}

async function updateLead(leadId: string, updates: any): Promise<void> {
  // Mock implementation
  console.log(`Updated lead ${leadId}:`, updates);
}

export default {
  scoreLeadEnhanced,
  batchScoreLeads
};
