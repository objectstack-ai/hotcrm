import type { HookSchema } from '@objectstack/spec/data';
import { db } from '@hotcrm/core';

// Constants for lead scoring
const HIGH_SCORE_THRESHOLD = 70;
const SCORING_WEIGHTS = {
  DATA_COMPLETENESS: 0.2,
  RATING: {
    Hot: 20,
    Warm: 12,
    Cold: 5
  },
  INDUSTRY: {
    HIGH_PRIORITY: 10,
    STANDARD: 5
  },
  COMPANY_SIZE: {
    LARGE: 15,      // > 1000
    MEDIUM: 12,     // > 500
    SMALL: 8,       // > 100
    MICRO: 5        // > 10
  },
  REVENUE: {
    VERY_HIGH: 15,  // > 100M
    HIGH: 12,       // > 50M
    MEDIUM: 8,      // > 10M
    LOW: 5          // > 1M
  },
  ENGAGEMENT: {
    VERY_HIGH: 20,  // > 10 activities
    HIGH: 15,       // > 5
    MEDIUM: 10,     // > 2
    LOW: 5          // > 0
  },
  RECENT_ACTIVITY_BONUS: 5,
  RECENT_ACTIVITY_DAYS: 7
};

const HIGH_PRIORITY_INDUSTRIES = ['Technology', 'Finance', 'Healthcare'];

// Types for Context
interface TriggerContext {
  old?: Record<string, any>;
  new: Record<string, any>;
  db: typeof db;
  user: { id: string; name: string; email: string; };
}

/**
 * Lead Scoring and Data Completeness Trigger
 * 
 * Automatically calculates:
 * 1. Lead Score (0-100) based on multiple factors
 * 2. Data Completeness percentage
 * 3. Public pool management
 */
const LeadScoringTrigger: HookSchema = {
  name: 'LeadScoringTrigger',
  object: 'Lead',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const lead = ctx.new;

      // Calculate Data Completeness
      lead.DataCompleteness = calculateDataCompleteness(lead);

      // Calculate Lead Score
      lead.LeadScore = await calculateLeadScore(lead, ctx);

      // Manage public pool status
      await managePublicPool(lead, ctx);

      console.log(`✨ Lead scoring completed: Score=${lead.LeadScore}, Completeness=${lead.DataCompleteness}%`);

    } catch (error) {
      console.error('❌ Error in LeadScoringTrigger:', error);
      // Don't throw - allow lead to be saved even if scoring fails
    }
  }
};

/**
 * Calculate data completeness percentage
 */
function calculateDataCompleteness(lead: Record<string, any>): number {
  const requiredFields = [
    'FirstName', 'LastName', 'Company', 'Title',
    'Email', 'Phone', 'MobilePhone',
    'Street', 'City', 'State', 'Country',
    'Industry', 'LeadSource', 'Rating',
    'NumberOfEmployees', 'AnnualRevenue',
    'Description'
  ];

  let filledCount = 0;
  for (const field of requiredFields) {
    if (lead[field] && lead[field] !== '' && lead[field] !== null) {
      filledCount++;
    }
  }

  return Math.round((filledCount / requiredFields.length) * 100);
}

/**
 * Calculate lead score based on multiple factors
 * 
 * Scoring factors:
 * - Data completeness (20 points)
 * - Rating (20 points)
 * - Industry relevance (10 points)
 * - Company size (15 points)
 * - Revenue (15 points)
 * - Engagement (20 points)
 */
async function calculateLeadScore(lead: Record<string, any>, ctx: TriggerContext): Promise<number> {
  let score = 0;

  // 1. Data Completeness Score (20 points)
  const completeness = lead.DataCompleteness || 0;
  score += Math.round(completeness * SCORING_WEIGHTS.DATA_COMPLETENESS);

  // 2. Rating Score (20 points)
  score += SCORING_WEIGHTS.RATING[lead.Rating as keyof typeof SCORING_WEIGHTS.RATING] || 0;

  // 3. Industry Score (10 points)
  if (HIGH_PRIORITY_INDUSTRIES.includes(lead.Industry)) {
    score += SCORING_WEIGHTS.INDUSTRY.HIGH_PRIORITY;
  } else if (lead.Industry) {
    score += SCORING_WEIGHTS.INDUSTRY.STANDARD;
  }

  // 4. Company Size Score (15 points)
  const employees = lead.NumberOfEmployees || 0;
  if (employees > 1000) {
    score += SCORING_WEIGHTS.COMPANY_SIZE.LARGE;
  } else if (employees > 500) {
    score += SCORING_WEIGHTS.COMPANY_SIZE.MEDIUM;
  } else if (employees > 100) {
    score += SCORING_WEIGHTS.COMPANY_SIZE.SMALL;
  } else if (employees > 10) {
    score += SCORING_WEIGHTS.COMPANY_SIZE.MICRO;
  }

  // 5. Revenue Score (15 points)
  const revenue = lead.AnnualRevenue || 0;
  if (revenue > 100000000) {
    score += SCORING_WEIGHTS.REVENUE.VERY_HIGH;
  } else if (revenue > 50000000) {
    score += SCORING_WEIGHTS.REVENUE.HIGH;
  } else if (revenue > 10000000) {
    score += SCORING_WEIGHTS.REVENUE.MEDIUM;
  } else if (revenue > 1000000) {
    score += SCORING_WEIGHTS.REVENUE.LOW;
  }

  // 6. Engagement Score (20 points)
  const activities = lead.NumberOfActivities || 0;
  if (activities > 10) {
    score += SCORING_WEIGHTS.ENGAGEMENT.VERY_HIGH;
  } else if (activities > 5) {
    score += SCORING_WEIGHTS.ENGAGEMENT.HIGH;
  } else if (activities > 2) {
    score += SCORING_WEIGHTS.ENGAGEMENT.MEDIUM;
  } else if (activities > 0) {
    score += SCORING_WEIGHTS.ENGAGEMENT.LOW;
  }

  // Recent activity bonus
  if (lead.LastActivityDate) {
    const daysSinceActivity = getDaysSince(lead.LastActivityDate);
    if (daysSinceActivity < SCORING_WEIGHTS.RECENT_ACTIVITY_DAYS) {
      score += SCORING_WEIGHTS.RECENT_ACTIVITY_BONUS;
    }
  }

  // Ensure score is within 0-100 range
  return Math.min(100, Math.max(0, score));
}

/**
 * Manage public pool status and dates
 */
async function managePublicPool(lead: Record<string, any>, ctx: TriggerContext): Promise<void> {
  const isNew = !ctx.old;

  // If new lead, set pool entry date
  if (isNew && lead.IsInPublicPool) {
    lead.PoolEntryDate = new Date().toISOString();
  }

  // If lead is being claimed from pool
  if (ctx.old && ctx.old.IsInPublicPool && !lead.IsInPublicPool) {
    lead.ClaimedDate = new Date().toISOString();
    console.log(`📋 Lead claimed from public pool by ${ctx.user.name}`);
  }

  // If lead is being returned to pool
  if (ctx.old && !ctx.old.IsInPublicPool && lead.IsInPublicPool) {
    lead.PoolEntryDate = new Date().toISOString();
    lead.ClaimedDate = null;
    console.log(`🔄 Lead returned to public pool`);
  }

  // Auto-remove high-score leads from public pool
  if (lead.LeadScore > HIGH_SCORE_THRESHOLD && lead.IsInPublicPool) {
    console.warn(`⚠️ High-score lead (${lead.LeadScore}) should not be in public pool`);
    // Note: Validation rule will prevent this, but log warning
  }
}

/**
 * Calculate days since a given date
 */
function getDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Lead Status Change Trigger
 * 
 * Handles automation when lead status changes
 */
const LeadStatusChangeTrigger: HookSchema = {
  name: 'LeadStatusChangeTrigger',
  object: 'Lead',
  events: ['afterUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      // Check if status changed
      if (!ctx.old || ctx.old.Status === ctx.new.Status) {
        return;
      }

      console.log(`🔄 Lead status changed from "${ctx.old.Status}" to "${ctx.new.Status}"`);

      // Handle conversion
      if (ctx.new.Status === 'Converted') {
        await handleLeadConversion(ctx);
      }

      // Handle unqualification
      if (ctx.new.Status === 'Unqualified') {
        await handleLeadUnqualification(ctx);
      }

      // Log activity for status change
      await logStatusChange(ctx);

    } catch (error) {
      console.error('❌ Error in LeadStatusChangeTrigger:', error);
      // Don't throw - allow update to complete
    }
  }
};

/**
 * Handle lead conversion
 */
async function handleLeadConversion(ctx: TriggerContext): Promise<void> {
  console.log('✅ Processing lead conversion...');
  const lead = ctx.new;

  // Set conversion date directly on the object if not already set
  if (!lead.ConvertedDate) {
    lead.ConvertedDate = new Date().toISOString();
  }

  // Log activity
  try {
    await ctx.db.doc.create('Activity', {
      Subject: `线索已转化: ${lead.FirstName} ${lead.LastName}`,
      Type: 'Conversion',
      Status: 'Completed',
      Priority: 'High',
      WhoId: lead.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `线索 "${lead.FirstName} ${lead.LastName}" 来自 "${lead.Company}" 已成功转化`
    });
  } catch (error) {
    console.error('❌ Failed to log conversion activity:', error);
  }
}

/**
 * Handle lead unqualification
 */
async function handleLeadUnqualification(ctx: TriggerContext): Promise<void> {
  console.log('❌ Processing lead unqualification...');
  const lead = ctx.new;

  // Remove from public pool directly on the object
  if (lead.IsInPublicPool) {
    lead.IsInPublicPool = false;
  }

  // Log activity
  try {
    await ctx.db.doc.create('Activity', {
      Subject: `线索不合格: ${lead.FirstName} ${lead.LastName}`,
      Type: 'Disqualification',
      Status: 'Completed',
      Priority: 'Normal',
      WhoId: lead.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `线索 "${lead.FirstName} ${lead.LastName}" 已标记为不合格`
    });
  } catch (error) {
    console.error('❌ Failed to log unqualification activity:', error);
  }
}

/**
 * Log activity when status changes
 */
async function logStatusChange(ctx: TriggerContext): Promise<void> {
  try {
    const lead = ctx.new;
    const oldStatus = ctx.old?.Status || 'Unknown';
    
    await ctx.db.doc.create('Activity', {
      Subject: `线索状态变更: ${oldStatus} → ${ctx.new.Status}`,
      Type: 'Status Change',
      Status: 'Completed',
      Priority: 'Normal',
      WhoId: lead.Id,
      OwnerId: ctx.user.id,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `线索状态从 "${oldStatus}" 变更为 "${ctx.new.Status}"`
    });
  } catch (error) {
    console.error('❌ Failed to log status change activity:', error);
  }
}

export { LeadScoringTrigger, LeadStatusChangeTrigger };
export default LeadScoringTrigger;
