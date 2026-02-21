/**
 * Journey AI Enhancement Actions
 * 
 * This ObjectStack Action provides AI-powered journey optimization capabilities.
 * 
 * Functionality:
 * 1. Optimize Journey - AI-recommended improvements for journey performance
 * 2. Predict Engagement - Predict contact engagement likelihood
 * 3. Suggest Next Best Action - Recommend next best step for a contact
 * 4. Analyze Dropoff - Analyze where contacts drop off in the journey
 */

import { broker } from '../db.js';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('marketing:journey_ai');

// ============================================================================
// 1. OPTIMIZE JOURNEY
// ============================================================================

export interface OptimizeJourneyRequest {
 /** Journey ID to optimize */
 journey_id: string;
}

export interface OptimizeJourneyResponse {
 /** Journey ID analyzed */
 journey_id: string;
 /** Overall performance score (0-100) */
 performance_score: number;
 /** AI-recommended improvements */
 recommendations: Array<{
 area: 'timing' | 'content' | 'targeting' | 'flow' | 'channel';
 title: string;
 description: string;
 expected_impact: 'high' | 'medium' | 'low';
 priority: number;
 }>;
 /** Current bottlenecks */
 bottlenecks: Array<{
 step_name: string;
 issue: string;
 dropoff_rate: number;
 }>;
}

/**
 * AI-recommended improvements for journey performance
 */
export async function optimizeJourney(params: OptimizeJourneyRequest): Promise<OptimizeJourneyResponse> {
 const { journey_id } = params;
 logger.info('🤖 AI Journey Optimization:', params);

 // Fetch journey details
 const journeys = await broker.find('journey', {
 filters: [['_id', '=', journey_id]],
 fields: ['name', 'status', 'total_contacts_entered', 'completed_contacts', 'conversion_rate', 'journey_type'],
 limit: 1
 });

 const journey = journeys[0] || {};

 // Fetch journey steps
 const steps = await broker.find('journey_step', {
 filters: [['journey_id', '=', journey_id]],
 fields: ['name', 'step_type', 'step_order', 'wait_duration', 'contacts_entered', 'contacts_completed'],
 sort: { step_order: 1 }
 });

 // Analyze bottlenecks
 const bottlenecks: OptimizeJourneyResponse['bottlenecks'] = [];
 for (const step of steps) {
 const entered = step.contacts_entered || 0;
 const completed = step.contacts_completed || 0;
 const dropoffRate = entered > 0 ? Math.round(((entered - completed) / entered) * 100) : 0;

 if (dropoffRate > 30) {
 bottlenecks.push({
 step_name: step.name || `Step ${step.step_order}`,
 issue: dropoffRate > 60
 ? 'Critical dropoff - most contacts abandon at this step'
 : 'Significant dropoff - review step content and timing',
 dropoff_rate: dropoffRate
 });
 }
 }

 // Generate recommendations
 const recommendations: OptimizeJourneyResponse['recommendations'] = [];

 const conversionRate = journey.conversion_rate || 0;
 if (conversionRate < 10) {
 recommendations.push({
 area: 'targeting',
 title: 'Refine Audience Targeting',
 description: 'Low conversion rate suggests the journey audience may not be well-aligned with the journey content. Consider narrowing the entry criteria.',
 expected_impact: 'high',
 priority: 1
 });
 }

 const emailSteps = steps.filter((s: any) => s.step_type === 'send_email');
 if (emailSteps.length > 5) {
 recommendations.push({
 area: 'content',
 title: 'Reduce Email Frequency',
 description: `Journey has ${emailSteps.length} email steps. Consider consolidating or spacing them to reduce subscriber fatigue.`,
 expected_impact: 'medium',
 priority: 2
 });
 }

 const waitSteps = steps.filter((s: any) => s.step_type === 'wait');
 if (waitSteps.length === 0 && steps.length > 2) {
 recommendations.push({
 area: 'timing',
 title: 'Add Wait Steps Between Actions',
 description: 'No wait steps found between actions. Adding delays can improve engagement by giving contacts time to respond.',
 expected_impact: 'medium',
 priority: 3
 });
 }

 const decisionSteps = steps.filter((s: any) => s.step_type === 'decision_split');
 if (decisionSteps.length === 0 && steps.length > 3) {
 recommendations.push({
 area: 'flow',
 title: 'Add Decision Splits for Personalization',
 description: 'Journey has no decision splits. Adding branching based on contact behavior can significantly improve engagement.',
 expected_impact: 'high',
 priority: 2
 });
 }

 if (bottlenecks.length > 0) {
 recommendations.push({
 area: 'flow',
 title: 'Address High Dropoff Points',
 description: `${bottlenecks.length} step(s) have dropoff rates above 30%. Review content and timing at these points.`,
 expected_impact: 'high',
 priority: 1
 });
 }

 // Calculate performance score
 const totalEntered = journey.total_contacts_entered || 0;
 const completionRatio = totalEntered > 0 ? (journey.completed_contacts || 0) / totalEntered : 0;
 const performance_score = Math.min(
 Math.round(completionRatio * 50 + (100 - bottlenecks.length * 15) * 0.5),
 100
 );

 return {
 journey_id,
 performance_score: Math.max(performance_score, 0),
 recommendations: recommendations.sort((a, b) => a.priority - b.priority),
 bottlenecks
 };
}

// ============================================================================
// 2. PREDICT ENGAGEMENT
// ============================================================================

export interface PredictEngagementRequest {
 /** Journey ID */
 journey_id: string;
 /** Contact ID to predict for */
 contact_id: string;
}

export interface PredictEngagementResponse {
 /** Contact ID */
 contact_id: string;
 /** Engagement likelihood (0-100) */
 engagement_score: number;
 /** Risk of dropping off */
 dropout_risk: 'low' | 'medium' | 'high';
 /** Predicted completion likelihood */
 completion_likelihood: number;
 /** Factors influencing the prediction */
 factors: Array<{
 factor: string;
 impact: 'positive' | 'negative' | 'neutral';
 description: string;
 }>;
}

/**
 * Predict contact engagement likelihood for a journey
 */
export async function predictEngagement(params: PredictEngagementRequest): Promise<PredictEngagementResponse> {
 const { journey_id, contact_id } = params;
 logger.info('🤖 AI Journey Engagement Prediction:', params);

 // Fetch contact's past touchpoints
 const touchpoints = await broker.find('touchpoint', {
 filters: [['contact_id', '=', contact_id]],
 fields: ['channel', 'engagement_type', 'created_date'],
 sort: { created_date: -1 },
 limit: 50
 });

 // Fetch campaign member history
 const memberHistory = await broker.find('campaign_member', {
 filters: [['contact_id', '=', contact_id]],
 fields: ['status', 'engagement_score', 'first_responded_date'],
 limit: 20
 });

 // Calculate engagement score based on historical behavior
 const touchpointCount = touchpoints.length;
 const respondedCampaigns = memberHistory.filter((m: any) => m.first_responded_date).length;
 const avgEngagement = memberHistory.length > 0
 ? memberHistory.reduce((sum: number, m: any) => sum + (m.engagement_score || 0), 0) / memberHistory.length
 : 50;

 // Build engagement score
 let engagementScore = 50; // baseline
 engagementScore += Math.min(touchpointCount * 2, 20); // activity bonus
 engagementScore += Math.min(respondedCampaigns * 5, 15); // response bonus
 engagementScore += (avgEngagement - 50) * 0.3; // historical engagement adjustment
 engagementScore = Math.max(0, Math.min(100, Math.round(engagementScore)));

 const dropoutRisk = engagementScore >= 70 ? 'low' : engagementScore >= 40 ? 'medium' : 'high';
 const completionLikelihood = Math.round(engagementScore * 0.8);

 const factors: PredictEngagementResponse['factors'] = [
 {
 factor: 'Historical Touchpoints',
 impact: touchpointCount > 10 ? 'positive' : touchpointCount < 3 ? 'negative' : 'neutral',
 description: `${touchpointCount} touchpoints recorded. ${touchpointCount > 10 ? 'Active engagement history.' : 'Limited interaction history.'}`
 },
 {
 factor: 'Campaign Response Rate',
 impact: respondedCampaigns > 3 ? 'positive' : respondedCampaigns === 0 ? 'negative' : 'neutral',
 description: `Responded to ${respondedCampaigns} of ${memberHistory.length} campaigns.`
 },
 {
 factor: 'Average Engagement Score',
 impact: avgEngagement > 60 ? 'positive' : avgEngagement < 30 ? 'negative' : 'neutral',
 description: `Average engagement score of ${Math.round(avgEngagement)} across past campaigns.`
 }
 ];

 return {
 contact_id,
 engagement_score: engagementScore,
 dropout_risk: dropoutRisk,
 completion_likelihood: completionLikelihood,
 factors
 };
}

// ============================================================================
// 3. SUGGEST NEXT BEST ACTION
// ============================================================================

export interface SuggestNextBestActionRequest {
 /** Journey ID */
 journey_id: string;
 /** Contact ID */
 contact_id: string;
 /** Current step in the journey */
 current_step_id?: string;
}

export interface SuggestNextBestActionResponse {
 /** Recommended action */
 recommended_action: string;
 /** Action type */
 action_type: 'send_email' | 'wait' | 'send_sms' | 'add_to_list' | 'update_record' | 'notify_sales';
 /** Confidence in recommendation (0-100) */
 confidence: number;
 /** Reasoning behind recommendation */
 reasoning: string;
 /** Alternative actions */
 alternatives: Array<{
 action: string;
 action_type: string;
 confidence: number;
 reasoning: string;
 }>;
}

/**
 * Recommend the next best step for a contact in a journey
 */
export async function suggestNextBestAction(params: SuggestNextBestActionRequest): Promise<SuggestNextBestActionResponse> {
 const { journey_id, contact_id, current_step_id } = params;
 logger.info('🤖 AI Journey Next Best Action:', params);

 // Fetch contact's recent interactions
 const recentTouchpoints = await broker.find('touchpoint', {
 filters: [['contact_id', '=', contact_id]],
 fields: ['channel', 'engagement_type', 'created_date'],
 sort: { created_date: -1 },
 limit: 10
 });

 // Fetch current journey step details
 let currentStep: any = null;
 if (current_step_id) {
 const stepRecords = await broker.find('journey_step', {
 filters: [['_id', '=', current_step_id]],
 fields: ['name', 'step_type', 'step_order'],
 limit: 1
 });
 currentStep = stepRecords[0] || null;
 }

 // Analyze recent channel engagement
 const channelCounts: Record<string, number> = {};
 for (const tp of recentTouchpoints) {
 const channel = tp.channel || 'unknown';
 channelCounts[channel] = (channelCounts[channel] || 0) + 1;
 }

 const preferredChannel = Object.entries(channelCounts)
 .sort(([, a], [, b]) => (b as number) - (a as number))[0];

 const lastTouchpoint = recentTouchpoints[0];
 const daysSinceLastTouch = lastTouchpoint
 ? Math.floor((Date.now() - new Date(lastTouchpoint.created_date).getTime()) / (1000 * 60 * 60 * 24))
 : 999;

 // Determine recommendation
 let recommended_action: string;
 let action_type: SuggestNextBestActionResponse['action_type'];
 let confidence: number;
 let reasoning: string;

 if (daysSinceLastTouch > 14) {
 recommended_action = 'Send re-engagement email with personalized offer';
 action_type = 'send_email';
 confidence = 82;
 reasoning = `Contact has been inactive for ${daysSinceLastTouch} days. A re-engagement email can help bring them back into the journey.`;
 } else if (preferredChannel && preferredChannel[0] === 'sms' && (preferredChannel[1] as number) > 3) {
 recommended_action = 'Send SMS with targeted message';
 action_type = 'send_sms';
 confidence = 75;
 reasoning = 'Contact shows strong SMS engagement. Leveraging their preferred channel increases response likelihood.';
 } else if (currentStep?.step_type === 'send_email') {
 recommended_action = 'Add wait period before next touchpoint';
 action_type = 'wait';
 confidence = 78;
 reasoning = 'Previous step was an email. Adding a wait period prevents fatigue and allows time for engagement.';
 } else if (recentTouchpoints.length > 15) {
 recommended_action = 'Notify sales team for direct outreach';
 action_type = 'notify_sales';
 confidence = 85;
 reasoning = 'High engagement level detected. Contact may be ready for direct sales conversation.';
 } else {
 recommended_action = 'Send personalized email based on journey context';
 action_type = 'send_email';
 confidence = 70;
 reasoning = 'Email remains the most effective channel for journey progression at this stage.';
 }

 const alternatives: SuggestNextBestActionResponse['alternatives'] = [
 {
 action: 'Add to targeted marketing list for future campaigns',
 action_type: 'add_to_list',
 confidence: 55,
 reasoning: 'List membership enables cross-campaign targeting and audience expansion.'
 },
 {
 action: 'Update contact record with journey engagement data',
 action_type: 'update_record',
 confidence: 50,
 reasoning: 'Enriching contact data improves future personalization and segmentation.'
 }
 ];

 return {
 recommended_action,
 action_type,
 confidence,
 reasoning,
 alternatives
 };
}

// ============================================================================
// 4. ANALYZE DROPOFF
// ============================================================================

export interface AnalyzeDropoffRequest {
 /** Journey ID to analyze */
 journey_id: string;
}

export interface AnalyzeDropoffResponse {
 /** Journey ID analyzed */
 journey_id: string;
 /** Overall dropoff rate (percentage) */
 overall_dropoff_rate: number;
 /** Step-by-step funnel analysis */
 funnel: Array<{
 step_name: string;
 step_type: string;
 step_order: number;
 contacts_entered: number;
 contacts_completed: number;
 dropoff_count: number;
 dropoff_rate: number;
 is_critical: boolean;
 }>;
 /** Key findings */
 findings: Array<{
 severity: 'critical' | 'warning' | 'info';
 title: string;
 description: string;
 affected_step: string;
 recommendation: string;
 }>;
 /** Summary statistics */
 summary: {
 total_entered: number;
 total_completed: number;
 worst_step: string;
 worst_dropoff_rate: number;
 average_dropoff_rate: number;
 };
}

/**
 * Analyze where contacts drop off in the journey
 */
export async function analyzeDropoff(params: AnalyzeDropoffRequest): Promise<AnalyzeDropoffResponse> {
 const { journey_id } = params;
 logger.info('🤖 AI Journey Dropoff Analysis:', params);

 // Fetch journey
 const journeys = await broker.find('journey', {
 filters: [['_id', '=', journey_id]],
 fields: ['name', 'total_contacts_entered', 'completed_contacts'],
 limit: 1
 });

 const journey = journeys[0] || {};

 // Fetch all journey steps
 const steps = await broker.find('journey_step', {
 filters: [['journey_id', '=', journey_id]],
 fields: ['name', 'step_type', 'step_order', 'contacts_entered', 'contacts_completed'],
 sort: { step_order: 1 }
 });

 // Build funnel analysis
 const funnel: AnalyzeDropoffResponse['funnel'] = [];
 let worstStep = '';
 let worstDropoffRate = 0;
 let totalDropoffRates = 0;

 for (const step of steps) {
 const entered = step.contacts_entered || 0;
 const completed = step.contacts_completed || 0;
 const dropoffCount = Math.max(entered - completed, 0);
 const dropoffRate = entered > 0 ? Math.round((dropoffCount / entered) * 100 * 10) / 10 : 0;

 const isCritical = dropoffRate > 50;

 funnel.push({
 step_name: step.name || `Step ${step.step_order}`,
 step_type: step.step_type || 'unknown',
 step_order: step.step_order || 0,
 contacts_entered: entered,
 contacts_completed: completed,
 dropoff_count: dropoffCount,
 dropoff_rate: dropoffRate,
 is_critical: isCritical
 });

 if (dropoffRate > worstDropoffRate) {
 worstDropoffRate = dropoffRate;
 worstStep = step.name || `Step ${step.step_order}`;
 }
 totalDropoffRates += dropoffRate;
 }

 const averageDropoffRate = steps.length > 0
 ? Math.round((totalDropoffRates / steps.length) * 10) / 10
 : 0;

 // Generate findings
 const findings: AnalyzeDropoffResponse['findings'] = [];

 for (const entry of funnel) {
 if (entry.dropoff_rate > 50) {
 findings.push({
 severity: 'critical',
 title: `Critical dropoff at "${entry.step_name}"`,
 description: `${entry.dropoff_rate}% of contacts drop off at this ${entry.step_type} step. This is a major conversion blocker.`,
 affected_step: entry.step_name,
 recommendation: entry.step_type === 'send_email'
 ? 'Review email subject line, content, and send timing. Consider A/B testing.'
 : entry.step_type === 'wait'
 ? 'Wait duration may be too long. Consider shortening or adding re-engagement touchpoints.'
 : 'Review step configuration and consider simplifying or adding alternative paths.'
 });
 } else if (entry.dropoff_rate > 30) {
 findings.push({
 severity: 'warning',
 title: `High dropoff at "${entry.step_name}"`,
 description: `${entry.dropoff_rate}% dropoff rate at this step is above the recommended threshold of 30%.`,
 affected_step: entry.step_name,
 recommendation: 'Monitor this step closely and consider content optimization or timing adjustments.'
 });
 }
 }

 if (findings.length === 0) {
 findings.push({
 severity: 'info',
 title: 'Journey performing within acceptable range',
 description: 'No steps have dropoff rates exceeding 30%. Continue monitoring for changes.',
 affected_step: 'all',
 recommendation: 'Maintain current journey configuration while testing incremental improvements.'
 });
 }

 const totalEntered = journey.total_contacts_entered || 0;
 const totalCompleted = journey.completed_contacts || 0;
 const overallDropoffRate = totalEntered > 0
 ? Math.round(((totalEntered - totalCompleted) / totalEntered) * 100 * 10) / 10
 : 0;

 return {
 journey_id,
 overall_dropoff_rate: overallDropoffRate,
 funnel,
 findings: findings.sort((a, b) => {
 const severityOrder = { critical: 0, warning: 1, info: 2 };
 return severityOrder[a.severity] - severityOrder[b.severity];
 }),
 summary: {
 total_entered: totalEntered,
 total_completed: totalCompleted,
 worst_step: worstStep || 'N/A',
 worst_dropoff_rate: worstDropoffRate,
 average_dropoff_rate: averageDropoffRate
 }
 };
}

// ============================================================================
// ACTION DEFINITION
// ============================================================================

const JourneyAIAction = {
 name: 'journey_ai',
 label: 'AI Journey Intelligence',
 description: 'AI-powered journey optimization, engagement prediction, and dropoff analysis',
 params: {
 action: { type: 'text', required: true },
 journey_id: { type: 'text' },
 contact_id: { type: 'text' },
 current_step_id: { type: 'text' }
 },
 handler: async (ctx: any) => {
 const { action } = ctx.params;
 switch (action) {
 case 'optimize': return optimizeJourney(ctx.params);
 case 'predict_engagement': return predictEngagement(ctx.params);
 case 'next_best_action': return suggestNextBestAction(ctx.params);
 case 'analyze_dropoff': return analyzeDropoff(ctx.params);
 default: throw new Error(`Unknown journey AI action: ${action}`);
 }
 }
};

export default JourneyAIAction;
