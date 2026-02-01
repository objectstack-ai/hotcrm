import type { Hook } from '@objectstack/spec/data';
import { db } from '../db';

// Types for Context
interface TriggerContext {
  old?: Record<string, any>;
  new: Record<string, any>;
  db: typeof db;
  user: { id: string; name: string; email: string; };
}

/**
 * Case SLA Calculation Trigger
 * 
 * Automatically calculates and manages:
 * 1. SLA due dates based on policy
 * 2. SLA milestones creation
 * 3. SLA violation detection
 */
const CaseSLACalculationTrigger: Hook = {
  name: 'CaseSLACalculationTrigger',
  object: 'Case',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const caseRecord = ctx.new;
      const oldCase = ctx.old;

      // Only calculate SLA for new cases or when status changes
      const isNew = !oldCase;
      const statusChanged = oldCase && oldCase.Status !== caseRecord.Status;

      if (isNew || statusChanged) {
        // Find applicable SLA policy
        const slaPolicy = await findApplicableSLAPolicy(caseRecord, ctx);
        
        if (slaPolicy) {
          // Calculate due dates
          await calculateSLADueDates(caseRecord, slaPolicy, ctx);
          
          // Create or update SLA milestones
          if (isNew) {
            await createSLAMilestones(caseRecord, slaPolicy, ctx);
          }
        }

        // Update SLA violation status
        await updateSLAViolationStatus(caseRecord, ctx);
      }

      console.log(`✅ SLA calculation completed for case ${caseRecord.CaseNumber}`);

    } catch (error) {
      console.error('❌ Error in CaseSLACalculationTrigger:', error);
    }
  }
};

/**
 * Case Auto-Routing Trigger
 * 
 * Automatically routes cases based on:
 * 1. Routing rules
 * 2. AI classification
 * 3. Skill-based matching
 * 4. Load balancing
 */
const CaseAutoRoutingTrigger: Hook = {
  name: 'CaseAutoRoutingTrigger',
  object: 'Case',
  events: ['beforeInsert'],
  handler: async (ctx: TriggerContext) => {
    try {
      const caseRecord = ctx.new;

      // Skip if already assigned
      if (caseRecord.OwnerId || caseRecord.AssignedToQueueId) {
        return;
      }

      // Find matching routing rules
      const routingRule = await findMatchingRoutingRule(caseRecord, ctx);
      
      if (routingRule) {
        // Assign to queue
        caseRecord.AssignedToQueueId = routingRule.QueueId;
        
        // Try to assign to specific agent based on skills and availability
        const agent = await findBestAgent(caseRecord, routingRule, ctx);
        
        if (agent) {
          caseRecord.OwnerId = agent.id;
          caseRecord.AISuggestedAssigneeId = agent.id;
        }
        
        console.log(`🎯 Case routed to queue ${routingRule.QueueId}`);
      } else {
        console.log('⚠️ No matching routing rule found');
      }

    } catch (error) {
      console.error('❌ Error in CaseAutoRoutingTrigger:', error);
    }
  }
};

/**
 * Case Escalation Trigger
 * 
 * Automatically escalates cases based on:
 * 1. SLA violations
 * 2. Escalation rules
 * 3. Priority and severity
 */
const CaseEscalationTrigger: Hook = {
  name: 'CaseEscalationTrigger',
  object: 'Case',
  events: ['afterUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const caseRecord = ctx.new;
      const oldCase = ctx.old;

      // Check if SLA was violated
      const slaViolated = !oldCase?.IsSLAViolated && caseRecord.IsSLAViolated;
      
      // Check if escalation is needed
      if (slaViolated || shouldAutoEscalate(caseRecord, oldCase)) {
        const escalationRule = await findApplicableEscalationRule(caseRecord, ctx);
        
        if (escalationRule) {
          await executeEscalation(caseRecord, escalationRule, ctx);
          console.log(`🚨 Case escalated using rule: ${escalationRule.Name}`);
        }
      }

    } catch (error) {
      console.error('❌ Error in CaseEscalationTrigger:', error);
    }
  }
};

/**
 * Case AI Enhancement Trigger
 * 
 * Automatically enhances cases with AI:
 * 1. Auto-categorization
 * 2. Sentiment analysis
 * 3. Urgency scoring
 * 4. Knowledge base matching
 */
const CaseAIEnhancementTrigger: Hook = {
  name: 'CaseAIEnhancementTrigger',
  object: 'Case',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const caseRecord = ctx.new;
      const oldCase = ctx.old;

      // Only run AI on new cases or when description changes
      const isNew = !oldCase;
      const descriptionChanged = oldCase && oldCase.Description !== caseRecord.Description;

      if (isNew || descriptionChanged) {
        // AI categorization
        caseRecord.AIAutoCategory = await performAIClassification(caseRecord);
        
        // Sentiment analysis
        const sentiment = await analyzeSentiment(caseRecord.Description);
        caseRecord.AISentimentAnalysis = sentiment.label;
        
        // Calculate urgency score
        caseRecord.AIUrgencyScore = calculateUrgencyScore(caseRecord, sentiment);
        
        // Extract keywords
        caseRecord.AIKeywords = await extractKeywords(caseRecord.Description);
        
        // Find related knowledge articles
        const relatedArticles = await findRelatedKnowledge(caseRecord, ctx);
        if (relatedArticles.length > 0) {
          caseRecord.AIRelatedKnowledge = relatedArticles.map((a: any) => a.id).join(',');
          
          // Generate suggested solution from top article
          if (relatedArticles[0]) {
            caseRecord.AISuggestedSolution = relatedArticles[0].Summary;
          }
        }

        console.log(`🤖 AI enhancement completed: Category=${caseRecord.AIAutoCategory}, Urgency=${caseRecord.AIUrgencyScore}`);
      }

    } catch (error) {
      console.error('❌ Error in CaseAIEnhancementTrigger:', error);
    }
  }
};

/**
 * Case Comment First Response Tracker
 * 
 * Tracks first response time for SLA compliance
 */
const CaseCommentFirstResponseTrigger: Hook = {
  name: 'CaseCommentFirstResponseTrigger',
  object: 'CaseComment',
  events: ['afterInsert'],
  handler: async (ctx: TriggerContext) => {
    try {
      const comment = ctx.new;

      // Only track agent responses
      if (comment.CommentType !== 'Agent' && comment.CommentType !== 'Email') {
        return;
      }

      // Get the case
      const caseRecord = await ctx.db.find('Case', {
        filters: [['id', '=', comment.CaseId]],
        limit: 1
      });

      if (caseRecord && caseRecord.length > 0 && !caseRecord[0].FirstResponseTime) {
        // This is the first response
        const now = new Date();
        const createdDate = new Date(caseRecord[0].CreatedDate);
        const responseTimeMinutes = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60));

        // Update case with first response info
        await ctx.db.doc.update('Case', caseRecord[0].id, {
          FirstResponseTime: now,
          ResponseTimeMinutes: responseTimeMinutes
        });

        // Update comment
        await ctx.db.doc.update('CaseComment', comment.id, {
          IsFirstResponse: true,
          ResponseTimeMinutes: responseTimeMinutes
        });

        // Update SLA milestone
        await updateSLAMilestone(caseRecord[0].id, 'FirstResponse', now, ctx);

        console.log(`⏱️ First response tracked: ${responseTimeMinutes} minutes`);
      }

    } catch (error) {
      console.error('❌ Error in CaseCommentFirstResponseTrigger:', error);
    }
  }
};

// Helper Functions

async function findApplicableSLAPolicy(caseRecord: any, ctx: TriggerContext): Promise<any> {
  // Find the highest priority active SLA policy that matches this case
  const policies = await ctx.db.find('SLAPolicy', {
    filters: [
      ['IsActive', '=', true],
      ['IsLatestVersion', '=', true]
    ],
    sort: 'Priority',
    limit: 100
  });

  for (const policy of policies) {
    if (policyMatches(policy, caseRecord)) {
      return policy;
    }
  }

  return null;
}

function policyMatches(policy: any, caseRecord: any): boolean {
  // Check case type
  if (policy.ApplicableCaseTypes && policy.ApplicableCaseTypes.length > 0) {
    if (!policy.ApplicableCaseTypes.includes(caseRecord.Type)) {
      return false;
    }
  }

  // Check priority
  if (policy.ApplicablePriorities && policy.ApplicablePriorities.length > 0) {
    if (!policy.ApplicablePriorities.includes(caseRecord.Priority)) {
      return false;
    }
  }

  return true;
}

async function calculateSLADueDates(caseRecord: any, policy: any, ctx: TriggerContext): Promise<void> {
  const now = new Date();

  // Calculate response due date
  if (policy.EnableFirstResponse && policy.FirstResponseMinutes) {
    const dueDate = addBusinessMinutes(now, policy.FirstResponseMinutes, policy.BusinessHoursId);
    caseRecord.ResponseDueDate = dueDate;
  }

  // Calculate resolution due date
  if (policy.EnableResolution && policy.ResolutionMinutes) {
    const dueDate = addBusinessMinutes(now, policy.ResolutionMinutes, policy.BusinessHoursId);
    caseRecord.ResolutionDueDate = dueDate;
  }

  // Set SLA level
  caseRecord.SLALevel = policy.Tier;
}

async function createSLAMilestones(caseRecord: any, policy: any, ctx: TriggerContext): Promise<void> {
  const milestones = [];

  if (policy.EnableFirstResponse) {
    milestones.push({
      CaseId: caseRecord.id,
      SLATemplateId: policy.id,
      MilestoneType: 'FirstResponse',
      Name: 'First Response',
      TargetDateTime: caseRecord.ResponseDueDate,
      StartDateTime: new Date(),
      Status: 'InProgress'
    });
  }

  if (policy.EnableResolution) {
    milestones.push({
      CaseId: caseRecord.id,
      SLATemplateId: policy.id,
      MilestoneType: 'Resolution',
      Name: 'Resolution',
      TargetDateTime: caseRecord.ResolutionDueDate,
      StartDateTime: new Date(),
      Status: 'InProgress'
    });
  }

  // Create milestones
  for (const milestone of milestones) {
    await ctx.db.doc.create('SLAMilestone', milestone);
  }
}

async function updateSLAViolationStatus(caseRecord: any, ctx: TriggerContext): Promise<void> {
  const now = new Date();
  let isViolated = false;
  let violationType = null;

  // Check response time violation
  if (caseRecord.ResponseDueDate && !caseRecord.FirstResponseTime) {
    if (now > new Date(caseRecord.ResponseDueDate)) {
      isViolated = true;
      violationType = 'Response';
    }
  }

  // Check resolution time violation
  if (caseRecord.ResolutionDueDate && caseRecord.Status !== 'Resolved' && caseRecord.Status !== 'Closed') {
    if (now > new Date(caseRecord.ResolutionDueDate)) {
      isViolated = true;
      violationType = violationType ? 'Both' : 'Resolution';
    }
  }

  caseRecord.IsSLAViolated = isViolated;
  if (isViolated) {
    caseRecord.SLAViolationType = violationType;
  }
}

async function findMatchingRoutingRule(caseRecord: any, ctx: TriggerContext): Promise<any> {
  const rules = await ctx.db.find('RoutingRule', {
    filters: [['IsActive', '=', true]],
    sort: 'Priority',
    limit: 100
  });

  for (const rule of rules) {
    if (routingRuleMatches(rule, caseRecord)) {
      return rule;
    }
  }

  return null;
}

function routingRuleMatches(rule: any, caseRecord: any): boolean {
  const criteria = rule.MatchCriteria === 'All' ? 'AND' : 'OR';
  const matches = [];

  // Check origins
  if (rule.MatchOrigins && rule.MatchOrigins.length > 0) {
    matches.push(rule.MatchOrigins.includes(caseRecord.Origin));
  }

  // Check case types
  if (rule.MatchCaseTypes && rule.MatchCaseTypes.length > 0) {
    matches.push(rule.MatchCaseTypes.includes(caseRecord.Type));
  }

  // Check priorities
  if (rule.MatchPriorities && rule.MatchPriorities.length > 0) {
    matches.push(rule.MatchPriorities.includes(caseRecord.Priority));
  }

  // Check keywords
  if (rule.MatchKeywords) {
    const keywords = rule.MatchKeywords.split(',').map((k: string) => k.trim().toLowerCase());
    const text = `${caseRecord.Subject} ${caseRecord.Description}`.toLowerCase();
    const hasKeyword = keywords.some((kw: string) => text.includes(kw));
    matches.push(hasKeyword);
  }

  if (matches.length === 0) return false;

  return criteria === 'AND' ? matches.every(m => m) : matches.some(m => m);
}

async function findBestAgent(caseRecord: any, routingRule: any, ctx: TriggerContext): Promise<any> {
  // Get queue members
  const queueMembers = await ctx.db.find('QueueMember', {
    filters: [['QueueId', '=', routingRule.QueueId]],
    limit: 100
  });

  if (queueMembers.length === 0) return null;

  // Simple round-robin for now
  return queueMembers[0];
}

async function findApplicableEscalationRule(caseRecord: any, ctx: TriggerContext): Promise<any> {
  const rules = await ctx.db.find('EscalationRule', {
    filters: [['IsActive', '=', true]],
    sort: 'EscalationLevel',
    limit: 100
  });

  for (const rule of rules) {
    if (escalationRuleMatches(rule, caseRecord)) {
      return rule;
    }
  }

  return null;
}

function escalationRuleMatches(rule: any, caseRecord: any): boolean {
  // Check case types
  if (rule.ApplicableCaseTypes && rule.ApplicableCaseTypes.length > 0) {
    if (!rule.ApplicableCaseTypes.includes(caseRecord.Type)) {
      return false;
    }
  }

  // Check priorities
  if (rule.ApplicablePriorities && rule.ApplicablePriorities.length > 0) {
    if (!rule.ApplicablePriorities.includes(caseRecord.Priority)) {
      return false;
    }
  }

  return true;
}

function shouldAutoEscalate(caseRecord: any, oldCase: any): boolean {
  // Auto-escalate critical priority cases that are not progressing
  if (caseRecord.Priority === 'Critical' && caseRecord.Status === oldCase.Status) {
    const hoursSinceUpdate = (Date.now() - new Date(oldCase.ModifiedDate).getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate > 2; // 2 hours without progress
  }

  return false;
}

async function executeEscalation(caseRecord: any, rule: any, ctx: TriggerContext): Promise<void> {
  // Update case with escalation info
  await ctx.db.doc.update('Case', caseRecord.id, {
    IsEscalated: true,
    EscalatedDate: new Date(),
    EscalationLevel: (caseRecord.EscalationLevel || 0) + 1,
    Status: rule.NewStatus || caseRecord.Status,
    Priority: rule.NewPriority || caseRecord.Priority
  });

  // Update rule statistics
  await ctx.db.doc.update('EscalationRule', rule.id, {
    TimesTriggered: (rule.TimesTriggered || 0) + 1,
    LastTriggeredDate: new Date()
  });
}

async function updateSLAMilestone(caseId: string, milestoneType: string, completedDate: Date, ctx: TriggerContext): Promise<void> {
  const milestones = await ctx.db.find('SLAMilestone', {
    filters: [
      ['CaseId', '=', caseId],
      ['MilestoneType', '=', milestoneType],
      ['Status', '=', 'InProgress']
    ],
    limit: 1
  });

  if (milestones.length > 0) {
    const milestone = milestones[0];
    const targetDate = new Date(milestone.TargetDateTime);
    const isViolated = completedDate > targetDate;

    await ctx.db.doc.update('SLAMilestone', milestone.id, {
      Status: isViolated ? 'Violated' : 'Completed',
      ActualDateTime: completedDate,
      IsViolated: isViolated
    });
  }
}

// AI Helper Functions

async function performAIClassification(caseRecord: any): Promise<string> {
  const text = `${caseRecord.Subject} ${caseRecord.Description}`.toLowerCase();
  
  if (text.includes('bug') || text.includes('error') || text.includes('crash')) {
    return 'Technical';
  } else if (text.includes('invoice') || text.includes('payment') || text.includes('billing')) {
    return 'Billing';
  } else if (text.includes('feature') || text.includes('enhancement')) {
    return 'Feature';
  } else if (text.includes('complaint') || text.includes('unhappy')) {
    return 'Complaint';
  }
  
  return 'Other';
}

async function analyzeSentiment(text: string): Promise<{ label: string; score: number }> {
  const lowerText = text.toLowerCase();
  
  const negativeWords = ['angry', 'frustrated', 'terrible', 'horrible', 'worst', 'broken', 'useless'];
  const positiveWords = ['great', 'excellent', 'awesome', 'love', 'perfect', 'thank'];
  
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  
  if (negativeCount > positiveCount + 1) {
    return { label: 'Angry', score: 0.8 };
  } else if (negativeCount > positiveCount) {
    return { label: 'Negative', score: 0.6 };
  } else if (positiveCount > negativeCount) {
    return { label: 'Positive', score: 0.7 };
  }
  
  return { label: 'Neutral', score: 0.5 };
}

function calculateUrgencyScore(caseRecord: any, sentiment: any): number {
  let score = 0;

  // Priority contribution (40 points max)
  const priorityScores: Record<string, number> = {
    'Critical': 40,
    'High': 30,
    'Medium': 15,
    'Low': 5
  };
  score += priorityScores[caseRecord.Priority] || 0;

  // Sentiment contribution (30 points max)
  const sentimentScores: Record<string, number> = {
    'Angry': 30,
    'Negative': 20,
    'Neutral': 10,
    'Positive': 5
  };
  score += sentimentScores[sentiment.label] || 0;

  // Case type contribution (20 points max)
  const typeScores: Record<string, number> = {
    'Incident': 20,
    'Problem': 15,
    'Question': 5,
    'Feature Request': 3
  };
  score += typeScores[caseRecord.Type] || 0;
  
  return Math.min(score, 100);
}

async function extractKeywords(text: string): Promise<string> {
  const words = text.toLowerCase().split(/\s+/);
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'was', 'are', 'were', 'be', 'been']);
  
  const keywords = words
    .filter(word => word.length > 4 && !commonWords.has(word))
    .slice(0, 10);
  
  return keywords.join(', ');
}

async function findRelatedKnowledge(caseRecord: any, ctx: TriggerContext): Promise<any[]> {
  const keywords = caseRecord.AIKeywords?.split(',').map((k: string) => k.trim()) || [];
  
  if (keywords.length === 0) return [];

  // Simple keyword-based search
  const articles = await ctx.db.find('KnowledgeArticle', {
    filters: [['Status', '=', 'Published']],
    limit: 5
  });

  return articles;
}

function addBusinessMinutes(startDate: Date, minutes: number, businessHoursId?: string): Date {
  // For now, just add calendar minutes
  const result = new Date(startDate);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

// Export hooks
export default [
  CaseSLACalculationTrigger,
  CaseAutoRoutingTrigger,
  CaseEscalationTrigger,
  CaseAIEnhancementTrigger,
  CaseCommentFirstResponseTrigger
];
