import type { HookSchema } from '@objectstack/spec/data';
import { db } from '@hotcrm/core';

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
  score += Math.round(completeness * 0.2);

  // 2. Rating Score (20 points)
  const ratingScores: Record<string, number> = {
    'Hot': 20,
    'Warm': 12,
    'Cold': 5
  };
  score += ratingScores[lead.Rating] || 0;

  // 3. Industry Score (10 points) - prioritize certain industries
  const highPriorityIndustries = ['Technology', 'Finance', 'Healthcare'];
  if (highPriorityIndustries.includes(lead.Industry)) {
    score += 10;
  } else if (lead.Industry) {
    score += 5;
  }

  // 4. Company Size Score (15 points)
  const employees = lead.NumberOfEmployees || 0;
  if (employees > 1000) {
    score += 15;
  } else if (employees > 500) {
    score += 12;
  } else if (employees > 100) {
    score += 8;
  } else if (employees > 10) {
    score += 5;
  }

  // 5. Revenue Score (15 points)
  const revenue = lead.AnnualRevenue || 0;
  if (revenue > 100000000) {
    score += 15;
  } else if (revenue > 50000000) {
    score += 12;
  } else if (revenue > 10000000) {
    score += 8;
  } else if (revenue > 1000000) {
    score += 5;
  }

  // 6. Engagement Score (20 points)
  const activities = lead.NumberOfActivities || 0;
  if (activities > 10) {
    score += 20;
  } else if (activities > 5) {
    score += 15;
  } else if (activities > 2) {
    score += 10;
  } else if (activities > 0) {
    score += 5;
  }

  // Recent activity bonus
  if (lead.LastActivityDate) {
    const daysSinceActivity = getDaysSince(lead.LastActivityDate);
    if (daysSinceActivity < 7) {
      score += 5; // Bonus for recent activity
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
  if (lead.LeadScore > 70 && lead.IsInPublicPool) {
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

  // Set conversion date if not already set
  if (!lead.ConvertedDate) {
    await ctx.db.doc.update('Lead', lead.Id, {
      ConvertedDate: new Date().toISOString()
    });
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

  // Remove from public pool
  if (lead.IsInPublicPool) {
    await ctx.db.doc.update('Lead', lead.Id, {
      IsInPublicPool: false
    });
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
