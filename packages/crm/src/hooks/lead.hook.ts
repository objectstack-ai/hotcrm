import type { Hook, HookContext } from '@objectstack/spec/data';
import type { Lead } from '../schemas/lead.schema.js';

// Constants for lead scoring
const HIGH_SCORE_THRESHOLD = 70;
const DEFAULT_OPPORTUNITY_CLOSE_DAYS = 30;
const REVENUE_TO_OPPORTUNITY_RATIO = 0.1;
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

const HIGH_PRIORITY_INDUSTRIES = ['technology', 'finance', 'healthcare'];


/**
 * Lead Scoring and Data Completeness Trigger
 * 
 * Automatically calculates:
 * 1. Lead Score (0-100) based on multiple factors
 * 2. Data Completeness percentage
 * 3. Public pool management
 */
const LeadScoringTrigger: Hook = {
  name: 'LeadScoringTrigger',
  object: 'lead',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const lead = ctx.input as Lead; // Strongly Typed Zod Source!

      // Calculate Data Completeness
      lead.DataCompleteness = calculateDataCompleteness(lead);

      // Calculate Lead Score
      lead.LeadScore = await calculateLeadScore(lead, ctx);

      // Run Assignment Rules
      if (!lead.OwnerId && !lead.owner) {
        await runAssignmentRules(lead, ctx);
      }


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
function calculateDataCompleteness(lead: Lead): number {
  const requiredFields = [
    'FirstName', 'LastName', 'Company', 'Title',
    'email', 'phone', 'MobilePhone',
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
async function calculateLeadScore(lead: Lead, ctx: HookContext): Promise<number> {
  let score = 0;

  // 1. Data Completeness Score (20 points)
  const completeness = lead.DataCompleteness || 0;
  score += Math.round(completeness * SCORING_WEIGHTS.DATA_COMPLETENESS);

  // 2. Rating Score (20 points)
  score += SCORING_WEIGHTS.RATING[(lead.Rating || 'Cold') as keyof typeof SCORING_WEIGHTS.RATING] || 0;

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
 * Execute Assignment Rules
 * Finds active assignment rules for Leads and checks if the lead matches the criteria.
 * If a match is found, assigns the lead to the specified User or Queue.
 */
async function runAssignmentRules(lead: Lead, ctx: HookContext): Promise<void> {
  try {
    const rules: any[] = await (ctx.ql as any).find('assignment_rule', {  
      filters: [
        ['object_name', '=', 'lead'], 
        ['active', '=', true]
      ],
      sort: 'sort_order' 
    });

    for (const rule of rules) {
      if (evaluateRule(lead, rule)) {
        if (rule.assign_to) {
          lead.owner = rule.assign_to;
          lead.OwnerId = rule.assign_to; // Legacy field support
        } else if (rule.assign_to_queue) {
          lead.owner = rule.assign_to_queue;
          lead.OwnerId = rule.assign_to_queue;
          // In real implementation we might set type to 'queue'
        }
        console.log(`✅ Lead assigned to ${lead.owner} by rule "${rule.name}"`);
        break; // Stop after first match
      }
    }
  } catch (error) {
    console.error('⚠️ Failed to run assignment rules:', error);
  }
}

/**
 * Evaluate a single rule against a record
 */
function evaluateRule(record: Record<string, any>, rule: Record<string, any>): boolean {
  const fieldValue = record[rule.criteria_field];
  const targetValue = rule.criteria_value;
  
  if (fieldValue === undefined || fieldValue === null) return false;

  switch (rule.criteria_operator) {
    case '=': return fieldValue == targetValue;
    case '!=': return fieldValue != targetValue;
    case '>': return fieldValue > targetValue;
    case '<': return fieldValue < targetValue;
    case 'contains': return String(fieldValue).includes(String(targetValue));
    default: return false;
  }
}

/**
 * Manage public pool status and dates
 */
async function managePublicPool(lead: Lead, ctx: HookContext): Promise<void> {
  const isNew = !ctx.previous;

  // If new lead, set pool entry date
  if (isNew && lead.IsInPublicPool) {
    lead.PoolEntryDate = new Date().toISOString();
  }

  // If lead is being claimed from pool
  if (ctx.previous && ctx.previous.IsInPublicPool && !lead.IsInPublicPool) {
    lead.ClaimedDate = new Date().toISOString();
    console.log(`📋 Lead claimed from public pool by ${ctx.session?.userId}`);
  }

  // If lead is being returned to pool
  if (ctx.previous && !ctx.previous.IsInPublicPool && lead.IsInPublicPool) {
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
const LeadStatusChangeTrigger: Hook = {
  name: 'LeadStatusChangeTrigger',
  object: 'lead',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      // Check if status changed
      if (!ctx.previous || ctx.previous.Status === ctx.input.Status) {
        return;
      }

      console.log(`🔄 Lead status changed from "${ctx.previous.Status}" to "${ctx.input.Status}"`);

      // Handle conversion
      if (ctx.input.Status === 'converted') {
        await handleLeadConversion(ctx);
      }

      // Handle unqualification
      if (ctx.input.Status === 'unqualified') {
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
 * 
 * Creates Account, Contact, and Opportunity records from the converted lead.
 * Called from afterUpdate trigger when status changes to 'converted'.
 */
async function handleLeadConversion(ctx: HookContext): Promise<void> {
  console.log('✅ Processing lead conversion...');
  const lead = ctx.input;

  try {
    // Create Account from Lead data
    const account = await (ctx.ql as any).doc.create('account', {
      Name: lead.Company,
      Phone: lead.Phone,
      Website: lead.Website,
      Industry: lead.Industry,
      AnnualRevenue: lead.AnnualRevenue,
      NumberOfEmployees: lead.NumberOfEmployees,
      BillingCity: lead.City,
      BillingState: lead.State,
      BillingCountry: lead.Country,
      OwnerId: ctx.session?.userId,
    });

    // Create Contact linked to the new Account
    const contact = await (ctx.ql as any).doc.create('contact', {
      FirstName: lead.FirstName,
      LastName: lead.LastName,
      AccountId: account?._id,
      Email: lead.Email,
      Phone: lead.Phone,
      MobilePhone: lead.MobilePhone,
      Title: lead.Title,
      OwnerId: ctx.session?.userId,
    });

    // Create Opportunity linked to the new Account
    const opportunity = await (ctx.ql as any).doc.create('opportunity', {
      Name: `${lead.Company} - Opportunity (${lead.Id})`,
      AccountId: account?._id,
      StageName: 'prospecting',
      CloseDate: new Date(Date.now() + DEFAULT_OPPORTUNITY_CLOSE_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Amount: lead.AnnualRevenue ? Number(lead.AnnualRevenue) * REVENUE_TO_OPPORTUNITY_RATIO : 0,
      LeadSource: lead.LeadSource,
      OwnerId: ctx.session?.userId,
    });

    // Log conversion activity
    await (ctx.ql as any).doc.create('activity', {
      Subject: `Lead Converted: ${lead.FirstName} ${lead.LastName}`,
      Type: 'Conversion',
      Status: 'completed',
      Priority: 'high',
      WhoId: lead.Id,
      OwnerId: ctx.session?.userId,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `Lead "${lead.FirstName} ${lead.LastName}" from "${lead.Company}" converted. Account: ${account?._id}, Contact: ${contact?._id}, Opportunity: ${opportunity?._id}`
    });

    console.log(`✅ Lead conversion complete: Account=${account?._id}, Contact=${contact?._id}, Opportunity=${opportunity?._id}`);
  } catch (error) {
    console.error('❌ Failed to convert lead:', error);
  }
}

/**
 * Handle lead unqualification
 * 
 * Note: Called from afterUpdate trigger, so only logs the unqualification.
 * IsInPublicPool should be updated by the application or a workflow rule.
 */
async function handleLeadUnqualification(ctx: HookContext): Promise<void> {
  console.log('❌ Processing lead unqualification...');
  const lead = ctx.input;

  // Log activity
  try {
    await (ctx.ql as any).doc.create('activity', {
      Subject: `Lead Unqualified: ${lead.FirstName} ${lead.LastName}`,
      Type: 'Disqualification',
      Status: 'completed',
      Priority: 'normal',
      WhoId: lead.Id,
      OwnerId: ctx.session?.userId,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `Lead "${lead.FirstName} ${lead.LastName}" marked as unqualified`
    });
  } catch (error) {
    console.error('❌ Failed to log unqualification activity:', error);
  }
}

/**
 * Log activity when status changes
 */
async function logStatusChange(ctx: HookContext): Promise<void> {
  try {
    const lead = ctx.input;
    const oldStatus = ctx.previous?.Status || 'unknown';
    
    await (ctx.ql as any).doc.create('activity', {
      Subject: `Lead Status Change: ${oldStatus} → ${ctx.input.Status}`,
      Type: 'Status Change',
      Status: 'completed',
      Priority: 'normal',
      WhoId: lead.Id,
      OwnerId: ctx.session?.userId,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `Lead status changed from "${oldStatus}" to "${ctx.input.Status}"`
    });
  } catch (error) {
    console.error('❌ Failed to log status change activity:', error);
  }
}

export { LeadScoringTrigger, LeadStatusChangeTrigger };
export default LeadScoringTrigger;
