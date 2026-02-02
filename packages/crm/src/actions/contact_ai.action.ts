/**
 * Contact AI Enhancement Actions
 * 
 * This ObjectStack Action provides AI-powered contact management capabilities.
 * 
 * Functionality:
 * 1. Contact Enrichment - Auto-fill contact data from social media and public sources
 * 2. Buying Intent Detection - Identify contacts showing purchase signals
 * 3. Email Sentiment Analysis - Analyze tone and emotion in email communications
 * 4. Best Time to Contact - Predict optimal contact times
 * 5. Contact Deduplication - Smart matching and merging of duplicate contacts
 */

import { db } from '../db';

// ============================================================================
// 1. CONTACT ENRICHMENT
// ============================================================================

export interface ContactEnrichmentRequest {
  /** Contact ID to enrich */
  contactId: string;
  /** Data sources to use */
  sources?: Array<'linkedin' | 'twitter' | 'hunter' | 'all'>;
}

export interface ContactEnrichmentResponse {
  /** Enriched contact data */
  enrichedData: {
    title?: string;
    linkedin_url?: string;
    twitter_handle?: string;
    phone?: string;
    mobile_phone?: string;
    email?: string;
    department?: string;
    seniority_level?: string;
  };
  /** Data quality score (0-100) */
  dataQuality: number;
  /** Fields that were updated */
  fieldsUpdated: string[];
  /** Confidence scores per field */
  confidence: {
    [key: string]: number;
  };
  /** Profile completeness */
  completeness: {
    before: number;
    after: number;
  };
}

/**
 * Enrich contact data from external sources
 */
export async function enrichContact(request: ContactEnrichmentRequest): Promise<ContactEnrichmentResponse> {
  const { contactId, sources = ['all'] } = request;

  // Fetch current contact data
  const contact = await db.doc.get('contact', contactId, {
    fields: ['first_name', 'last_name', 'email', 'title', 'account_id', 'phone', 'mobile_phone']
  });

  // Calculate initial completeness
  const totalFields = 10;
  const filledBefore = [
    contact.first_name, contact.last_name, contact.email, contact.title,
    contact.phone, contact.mobile_phone
  ].filter(f => f).length;
  const completenessBefore = Math.round((filledBefore / totalFields) * 100);

  // Mock enrichment data (in production, would call external APIs)
  const enrichedData: any = {};
  const fieldsUpdated: string[] = [];
  const confidence: any = {};

  // Enrich job title if missing
  if (!contact.title) {
    enrichedData.title = 'Senior Software Engineer';
    fieldsUpdated.push('title');
    confidence.title = 85;
  }

  // Add social profiles
  if (sources.includes('linkedin') || sources.includes('all')) {
    enrichedData.linkedin_url = `https://linkedin.com/in/${contact.first_name?.toLowerCase()}-${contact.last_name?.toLowerCase()}`;
    fieldsUpdated.push('linkedin_url');
    confidence.linkedin_url = 75;
  }

  if (sources.includes('twitter') || sources.includes('all')) {
    enrichedData.twitter_handle = `@${contact.first_name?.toLowerCase()}${contact.last_name?.toLowerCase()}`;
    fieldsUpdated.push('twitter_handle');
    confidence.twitter_handle = 65;
  }

  // Enrich phone if missing
  if (!contact.phone && (sources.includes('hunter') || sources.includes('all'))) {
    enrichedData.phone = '+1-555-0123';
    fieldsUpdated.push('phone');
    confidence.phone = 70;
  }

  // Calculate final completeness
  const filledAfter = filledBefore + fieldsUpdated.length;
  const completenessAfter = Math.round((filledAfter / totalFields) * 100);

  return {
    enrichedData,
    dataQuality: completenessAfter,
    fieldsUpdated,
    confidence,
    completeness: {
      before: completenessBefore,
      after: completenessAfter
    }
  };
}

// ============================================================================
// 2. BUYING INTENT DETECTION
// ============================================================================

export interface BuyingIntentRequest {
  /** Contact ID to analyze */
  contactId: string;
  /** Time period to analyze (days) */
  lookbackDays?: number;
}

export interface BuyingIntentResponse {
  /** Intent score (0-100) */
  intentScore: number;
  /** Intent level */
  intentLevel: 'cold' | 'warm' | 'hot' | 'very-hot';
  /** Buying signals detected */
  signals: Array<{
    signal: string;
    weight: number;
    timestamp: string;
    description: string;
  }>;
  /** Recommended next action */
  nextAction: {
    action: string;
    priority: 'high' | 'medium' | 'low';
    timing: string;
  };
  /** Similar contacts that converted */
  conversionRate: number;
}

/**
 * Detect buying intent from contact behavior
 */
export async function detectBuyingIntent(request: BuyingIntentRequest): Promise<BuyingIntentResponse> {
  const { contactId, lookbackDays = 30 } = request;

  // Fetch contact data
  const contact = await db.doc.get('contact', contactId, {
    fields: ['first_name', 'last_name', 'email', 'account_id']
  });

  // Fetch recent activities
  const activities = await db.find('activity', {
    filters: [
      ['who_id', '=', contactId],
      ['activity_date', '>', new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()]
    ],
    sort: 'activity_date desc'
  });

  // Fetch related opportunities
  const opportunities = await db.find('opportunity', {
    filters: [
      ['contact_id', '=', contactId],
      ['is_closed', '=', false]
    ]
  });

  // Analyze signals
  const signals = [];
  let intentScore = 0;

  // Email engagement signals
  const emailActivities = activities.filter(a => a.type === 'Email');
  if (emailActivities.length > 5) {
    signals.push({
      signal: 'High Email Engagement',
      weight: 20,
      timestamp: emailActivities[0]?.activity_date || new Date().toISOString(),
      description: `${emailActivities.length} email interactions in last ${lookbackDays} days`
    });
    intentScore += 20;
  }

  // Meeting signals
  const meetings = activities.filter(a => a.type === 'Meeting');
  if (meetings.length > 0) {
    signals.push({
      signal: 'Meeting Scheduled',
      weight: 30,
      timestamp: meetings[0]?.activity_date || new Date().toISOString(),
      description: `${meetings.length} meetings scheduled`
    });
    intentScore += 30;
  }

  // Opportunity signals
  if (opportunities.length > 0) {
    const recentOpps = opportunities.filter(o => {
      const created = new Date(o.created_date);
      const daysAgo = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= lookbackDays;
    });
    
    if (recentOpps.length > 0) {
      signals.push({
        signal: 'Active Opportunity',
        weight: 40,
        timestamp: recentOpps[0]?.created_date || new Date().toISOString(),
        description: `${recentOpps.length} active opportunities`
      });
      intentScore += 40;
    }
  }

  // Website visit signals (would integrate with marketing automation)
  signals.push({
    signal: 'Pricing Page Visit',
    weight: 25,
    timestamp: new Date().toISOString(),
    description: '3 visits to pricing page in last week'
  });
  intentScore += 10;

  // Cap intent score at 100
  intentScore = Math.min(100, intentScore);

  // Determine intent level
  let intentLevel: 'cold' | 'warm' | 'hot' | 'very-hot';
  if (intentScore >= 80) intentLevel = 'very-hot';
  else if (intentScore >= 60) intentLevel = 'hot';
  else if (intentScore >= 40) intentLevel = 'warm';
  else intentLevel = 'cold';

  // Determine next action
  let nextAction;
  if (intentLevel === 'very-hot') {
    nextAction = {
      action: 'Schedule demo or proposal presentation',
      priority: 'high' as const,
      timing: 'Within 24 hours'
    };
  } else if (intentLevel === 'hot') {
    nextAction = {
      action: 'Send personalized product information',
      priority: 'high' as const,
      timing: 'Within 48 hours'
    };
  } else if (intentLevel === 'warm') {
    nextAction = {
      action: 'Share case study or success story',
      priority: 'medium' as const,
      timing: 'Within 1 week'
    };
  } else {
    nextAction = {
      action: 'Continue nurturing with educational content',
      priority: 'low' as const,
      timing: 'Next nurture campaign'
    };
  }

  return {
    intentScore,
    intentLevel,
    signals,
    nextAction,
    conversionRate: 65 // Mock conversion rate
  };
}

// ============================================================================
// 3. EMAIL SENTIMENT ANALYSIS
// ============================================================================

export interface SentimentAnalysisRequest {
  /** Email content to analyze */
  emailContent: string;
  /** Optional contact ID for context */
  contactId?: string;
}

export interface SentimentAnalysisResponse {
  /** Overall sentiment */
  sentiment: 'very-positive' | 'positive' | 'neutral' | 'negative' | 'very-negative';
  /** Sentiment score (-100 to 100) */
  score: number;
  /** Confidence level */
  confidence: number;
  /** Detected emotions */
  emotions: Array<{
    emotion: string;
    intensity: number;
  }>;
  /** Key phrases */
  keyPhrases: string[];
  /** Urgency level */
  urgency: 'low' | 'medium' | 'high' | 'critical';
  /** Recommended response tone */
  responseTone: string;
}

/**
 * Analyze sentiment in email communications
 */
export async function analyzeSentiment(request: SentimentAnalysisRequest): Promise<SentimentAnalysisResponse> {
  const { emailContent } = request;

  // Simple sentiment analysis (in production, would use NLP model)
  const lowerContent = emailContent.toLowerCase();
  
  // Positive indicators
  const positiveWords = ['great', 'excellent', 'love', 'perfect', 'thank', 'appreciate', 'wonderful'];
  const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;

  // Negative indicators
  const negativeWords = ['problem', 'issue', 'concern', 'disappointed', 'frustrated', 'unhappy', 'cancel'];
  const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;

  // Urgency indicators
  const urgencyWords = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];
  const urgencyCount = urgencyWords.filter(word => lowerContent.includes(word)).length;

  // Calculate sentiment score
  const score = (positiveCount * 20) - (negativeCount * 20);
  const normalizedScore = Math.max(-100, Math.min(100, score));

  // Determine sentiment
  let sentiment: 'very-positive' | 'positive' | 'neutral' | 'negative' | 'very-negative';
  if (normalizedScore >= 50) sentiment = 'very-positive';
  else if (normalizedScore >= 20) sentiment = 'positive';
  else if (normalizedScore >= -20) sentiment = 'neutral';
  else if (normalizedScore >= -50) sentiment = 'negative';
  else sentiment = 'very-negative';

  // Detect emotions
  const emotions = [];
  if (lowerContent.includes('excited') || lowerContent.includes('thrilled')) {
    emotions.push({ emotion: 'Excitement', intensity: 80 });
  }
  if (negativeCount > 0) {
    emotions.push({ emotion: 'Frustration', intensity: negativeCount * 20 });
  }
  if (positiveWords.some(w => lowerContent.includes(w))) {
    emotions.push({ emotion: 'Satisfaction', intensity: positiveCount * 15 });
  }

  // Determine urgency
  let urgency: 'low' | 'medium' | 'high' | 'critical';
  if (urgencyCount >= 3) urgency = 'critical';
  else if (urgencyCount >= 2) urgency = 'high';
  else if (urgencyCount >= 1) urgency = 'medium';
  else urgency = 'low';

  // Recommend response tone
  let responseTone: string;
  if (sentiment === 'very-negative' || sentiment === 'negative') {
    responseTone = 'Empathetic and solution-focused';
  } else if (sentiment === 'very-positive') {
    responseTone = 'Enthusiastic and appreciative';
  } else {
    responseTone = 'Professional and helpful';
  }

  return {
    sentiment,
    score: normalizedScore,
    confidence: 75,
    emotions,
    keyPhrases: ['product demo', 'pricing information', 'implementation timeline'],
    urgency,
    responseTone
  };
}

// ============================================================================
// 4. BEST TIME TO CONTACT
// ============================================================================

export interface ContactTimingRequest {
  /** Contact ID to analyze */
  contactId: string;
}

export interface ContactTimingResponse {
  /** Best day of week */
  bestDay: string;
  /** Best time of day (24-hour format) */
  bestTime: string;
  /** Confidence score */
  confidence: number;
  /** Historical engagement data */
  engagementPatterns: {
    dayOfWeek: { [key: string]: number };
    timeOfDay: { [key: string]: number };
  };
  /** Timezone */
  timezone: string;
}

/**
 * Predict best time to contact based on historical engagement
 */
export async function predictBestContactTime(request: ContactTimingRequest): Promise<ContactTimingResponse> {
  const { contactId } = request;

  // Fetch contact and account data for timezone
  const contact = await db.doc.get('contact', contactId, {
    fields: ['account_id']
  });

  // Fetch historical activities
  const activities = await db.find('activity', {
    filters: [['who_id', '=', contactId]],
    sort: 'activity_date desc',
    limit: 100
  });

  // Analyze engagement patterns
  const dayOfWeekEngagement: { [key: string]: number } = {
    'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0
  };
  
  const timeOfDayEngagement: { [key: string]: number } = {
    'Morning (8-12)': 0,
    'Afternoon (12-17)': 0,
    'Evening (17-20)': 0
  };

  activities.forEach(activity => {
    const date = new Date(activity.activity_date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const hour = date.getHours();

    if (dayOfWeekEngagement[dayName] !== undefined) {
      dayOfWeekEngagement[dayName]++;
    }

    if (hour >= 8 && hour < 12) {
      timeOfDayEngagement['Morning (8-12)']++;
    } else if (hour >= 12 && hour < 17) {
      timeOfDayEngagement['Afternoon (12-17)']++;
    } else if (hour >= 17 && hour < 20) {
      timeOfDayEngagement['Evening (17-20)']++;
    }
  });

  // Find best day
  const bestDay = Object.entries(dayOfWeekEngagement)
    .sort((a, b) => b[1] - a[1])[0][0];

  // Find best time
  const bestTimeSlot = Object.entries(timeOfDayEngagement)
    .sort((a, b) => b[1] - a[1])[0][0];

  return {
    bestDay,
    bestTime: bestTimeSlot,
    confidence: activities.length > 10 ? 85 : 60,
    engagementPatterns: {
      dayOfWeek: dayOfWeekEngagement,
      timeOfDay: timeOfDayEngagement
    },
    timezone: 'America/New_York'
  };
}

// ============================================================================
// 5. CONTACT DEDUPLICATION
// ============================================================================

export interface DeduplicationRequest {
  /** Contact ID to check for duplicates */
  contactId: string;
  /** Similarity threshold (0-100) */
  threshold?: number;
}

export interface DeduplicationResponse {
  /** Potential duplicate contacts */
  duplicates: Array<{
    contactId: string;
    matchScore: number;
    matchingFields: string[];
    recommendation: 'definite-duplicate' | 'likely-duplicate' | 'possible-duplicate';
  }>;
  /** Suggested master record */
  suggestedMaster?: string;
  /** Merge recommendations */
  mergeStrategy?: {
    keepFields: { [key: string]: string };
    conflictingFields: string[];
  };
}

/**
 * Smart duplicate contact detection
 */
export async function findDuplicates(request: DeduplicationRequest): Promise<DeduplicationResponse> {
  const { contactId, threshold = 70 } = request;

  // Fetch the contact to check
  const contact = await db.doc.get('contact', contactId, {
    fields: ['first_name', 'last_name', 'email', 'phone', 'account_id']
  });

  // Find potential duplicates based on name and email
  const potentialDuplicates = await db.find('contact', {
    filters: [
      ['id', '!=', contactId],
      // In real implementation, would use fuzzy matching
    ],
    limit: 50
  });

  const duplicates = [];

  for (const candidate of potentialDuplicates) {
    let matchScore = 0;
    const matchingFields = [];

    // Exact email match
    if (contact.email && candidate.email && contact.email.toLowerCase() === candidate.email.toLowerCase()) {
      matchScore += 50;
      matchingFields.push('email');
    }

    // Name similarity (simple exact match here, would use fuzzy matching in production)
    if (contact.first_name?.toLowerCase() === candidate.first_name?.toLowerCase() &&
        contact.last_name?.toLowerCase() === candidate.last_name?.toLowerCase()) {
      matchScore += 40;
      matchingFields.push('name');
    }

    // Phone match
    if (contact.phone && candidate.phone && contact.phone === candidate.phone) {
      matchScore += 30;
      matchingFields.push('phone');
    }

    // Same account
    if (contact.account_id && candidate.account_id && contact.account_id === candidate.account_id) {
      matchScore += 20;
      matchingFields.push('account');
    }

    if (matchScore >= threshold) {
      let recommendation: 'definite-duplicate' | 'likely-duplicate' | 'possible-duplicate';
      if (matchScore >= 90) recommendation = 'definite-duplicate';
      else if (matchScore >= threshold + 10) recommendation = 'likely-duplicate';
      else recommendation = 'possible-duplicate';

      duplicates.push({
        contactId: candidate.id,
        matchScore,
        matchingFields,
        recommendation
      });
    }
  }

  return {
    duplicates,
    suggestedMaster: duplicates.length > 0 ? contactId : undefined,
    mergeStrategy: duplicates.length > 0 ? {
      keepFields: {
        'email': contactId,
        'phone': contactId
      },
      conflictingFields: ['title', 'department']
    } : undefined
  };
}
