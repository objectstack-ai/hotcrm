import type { Hook, HookContext } from '@objectstack/spec/data';

// Rating calculation weights
const RATING_WEIGHTS = {
  TECHNICAL_SKILLS: 0.25,
  LEADERSHIP: 0.20,
  COMMUNICATION: 0.15,
  TEAMWORK: 0.15,
  INITIATIVE: 0.15,
  QUALITY: 0.10
};

/**
 * Performance Review Rating Calculation Trigger
 * 
 * Automatically calculates:
 * 1. Overall rating from component scores
 * 2. Performance level classification
 * 3. Recommendation for promotion/raise
 */
const PerformanceReviewRatingTrigger: Hook = {
  name: 'PerformanceReviewRatingTrigger',
  object: 'performance_review',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const review = ctx.input.doc as Record<string, any>;

      // Calculate overall rating from component scores
      if (hasAllComponentScores(review)) {
        review.overall_rating = calculateOverallRating(review);
        review.performance_level = determinePerformanceLevel(review.overall_rating);
        
        console.log(`✨ Performance review rating calculated: ${review.overall_rating}/5 (${review.performance_level})`);
      }

      // Calculate completion percentage
      review.completion_percentage = calculateCompletionPercentage(review);

      // Auto-update status based on completion
      if (review.completion_percentage === 100 && review.status === 'in_progress') {
        review.status = 'pending_approval';
        console.log(`📋 Review auto-advanced to Pending Approval`);
      }

    } catch (error) {
      console.error('❌ Error in PerformanceReviewRatingTrigger:', error);
      // Don't throw - allow review to be saved
    }
  }
};

/**
 * Check if all component scores are provided
 */
function hasAllComponentScores(review: any): boolean {
  const requiredScores = [
    'technical_skills_rating',
    'leadership_rating',
    'communication_rating',
    'teamwork_rating',
    'initiative_rating',
    'quality_rating'
  ];

  return requiredScores.every(score => 
    review[score] !== null && 
    review[score] !== undefined && 
    review[score] >= 1 && 
    review[score] <= 5
  );
}

/**
 * Calculate overall rating from weighted component scores
 */
function calculateOverallRating(review: any): number {
  const weightedScore = 
    (review.technical_skills_rating || 0) * RATING_WEIGHTS.TECHNICAL_SKILLS +
    (review.leadership_rating || 0) * RATING_WEIGHTS.LEADERSHIP +
    (review.communication_rating || 0) * RATING_WEIGHTS.COMMUNICATION +
    (review.teamwork_rating || 0) * RATING_WEIGHTS.TEAMWORK +
    (review.initiative_rating || 0) * RATING_WEIGHTS.INITIATIVE +
    (review.quality_rating || 0) * RATING_WEIGHTS.QUALITY;

  // Round to 1 decimal place
  return Math.round(weightedScore * 10) / 10;
}

/**
 * Determine performance level based on overall rating
 */
function determinePerformanceLevel(rating: number): string {
  if (rating >= 4.5) return 'outstanding';
  if (rating >= 3.5) return 'exceeds_expectations';
  if (rating >= 2.5) return 'meets_expectations';
  if (rating >= 1.5) return 'needs_improvement';
  return 'Unsatisfactory';
}

/**
 * Calculate completion percentage
 */
function calculateCompletionPercentage(review: any): number {
  const requiredFields = [
    'technical_skills_rating',
    'leadership_rating',
    'communication_rating',
    'teamwork_rating',
    'initiative_rating',
    'quality_rating',
    'achievements',
    'areas_for_improvement',
    'development_plan'
  ];

  const completedFields = requiredFields.filter(field => 
    review[field] !== null && 
    review[field] !== undefined && 
    review[field] !== ''
  ).length;

  return Math.round((completedFields / requiredFields.length) * 100);
}

/**
 * Performance Review Workflow Trigger
 * 
 * Handles workflow state transitions and notifications
 */
const PerformanceReviewWorkflowTrigger: Hook = {
  name: 'PerformanceReviewWorkflowTrigger',
  object: 'performance_review',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      // Check if status changed
      if (!ctx.previous || (ctx.previous as Record<string, any>).status === (ctx.result as Record<string, any>).status) {
        return;
      }

      const review = ctx.result as Record<string, any>;
      const oldStatus = (ctx.previous as Record<string, any>).status;
      const newStatus = review.status;

      console.log(`🔄 Performance review ${review.review_name} status changed from "${oldStatus}" to "${newStatus}"`);

      // Handle different status transitions
      switch (newStatus) {
        case 'in_progress':
          await handleReviewStarted(review, ctx);
          break;
        case 'pending_approval':
          await handleReviewSubmitted(review, ctx);
          break;
        case 'approved':
          await handleReviewApproved(review, ctx);
          break;
        case 'completed':
          await handleReviewCompleted(review, ctx);
          break;
        case 'rejected':
          await handleReviewRejected(review, ctx);
          break;
      }

      // Log status change
      await logReviewStatusChange(review, oldStatus, newStatus, ctx);

    } catch (error) {
      console.error('❌ Error in PerformanceReviewWorkflowTrigger:', error);
    }
  }
};

/**
 * Handle review started
 */
async function handleReviewStarted(review: any, ctx: any): Promise<void> {
  console.log(`📝 Performance review started: ${review.review_name}`);
  
  try {
    console.debug(`[performance_review.hook] Review start notifications pending for ${review.review_name}: notify employee and reviewer via email`);
    
  } catch (error) {
    console.error('❌ Failed to process review start:', error);
  }
}

/**
 * Handle review submitted for approval
 */
async function handleReviewSubmitted(review: any, ctx: any): Promise<void> {
  console.log(`📤 Performance review submitted for approval: ${review.review_name}`);
  
  try {
    // Set submission date
    await ctx.ql.doc.update('performance_review', review.id, {
      submitted_date: new Date().toISOString().split('T')[0],
      submitted_by: ctx.session?.userId
    });

    console.debug(`[performance_review.hook] Approval request pending for review ${review.review_name}: notify approver (HR or senior manager)`);
    
    console.log(`✅ Review ${review.review_name} submitted for approval`);
    
  } catch (error) {
    console.error('❌ Failed to process review submission:', error);
  }
}

/**
 * Handle review approved
 */
async function handleReviewApproved(review: any, ctx: any): Promise<void> {
  console.log(`✅ Performance review approved: ${review.review_name}`);
  
  try {
    // Set approval date
    await ctx.ql.doc.update('performance_review', review.id, {
      approved_date: new Date().toISOString().split('T')[0],
      approved_by: ctx.session?.userId
    });

    // Trigger compensation review if high performance
    if (review.performance_level === 'outstanding' || review.performance_level === 'exceeds_expectations') {
      await triggerCompensationReview(review, ctx);
    }

    // Create development goals based on review
    await createDevelopmentGoals(review, ctx);

    console.log(`✅ Review ${review.review_name} processing completed`);
    
  } catch (error) {
    console.error('❌ Failed to process review approval:', error);
  }
}

/**
 * Trigger compensation review for high performers
 */
async function triggerCompensationReview(review: any, ctx: any): Promise<void> {
  try {
    console.log(`💰 Triggering compensation review for high performer: ${review.employee_id}`);
    
    console.debug(`[performance_review.hook] Compensation review pending for high performer ${review.employee_id}: create compensation review task and notify HR and manager`);
    
  } catch (error) {
    console.error('❌ Failed to trigger compensation review:', error);
  }
}

/**
 * Create development goals from review feedback
 */
async function createDevelopmentGoals(review: any, ctx: any): Promise<void> {
  try {
    if (!review.development_plan || review.development_plan.trim() === '') {
      console.log('ℹ️ No development plan specified, skipping goal creation');
      return;
    }

    // Calculate goal period (typically next review cycle)
    const today = new Date();
    const goalEndDate = new Date(today);
    
    // Set goal period based on review period
    switch (review.review_period) {
      case 'quarterly':
        goalEndDate.setMonth(goalEndDate.getMonth() + 3);
        break;
      case 'Semi-Annual':
        goalEndDate.setMonth(goalEndDate.getMonth() + 6);
        break;
      case 'Annual':
        goalEndDate.setFullYear(goalEndDate.getFullYear() + 1);
        break;
      default:
        goalEndDate.setMonth(goalEndDate.getMonth() + 3); // Default to quarterly
    }

    // Create development goal
    await ctx.ql.doc.create('goal', {
      employee_id: review.employee_id,
      goal_name: `Development Plan - ${review.review_period} Review`,
      description: review.development_plan,
      goal_type: 'Development',
      start_date: today.toISOString().split('T')[0],
      target_date: goalEndDate.toISOString().split('T')[0],
      status: 'in_progress',
      progress: 0,
      related_review_id: review.id
    });

    console.log(`🎯 Created development goal from review ${review.review_name}`);
    
  } catch (error) {
    console.error('❌ Failed to create development goals:', error);
  }
}

/**
 * Handle review completed
 */
async function handleReviewCompleted(review: any, ctx: any): Promise<void> {
  console.log(`🎉 Performance review completed: ${review.review_name}`);
  
  try {
    // Set completion date
    await ctx.ql.doc.update('performance_review', review.id, {
      completion_date: new Date().toISOString().split('T')[0]
    });

    console.debug(`[performance_review.hook] Completion notification pending for review ${review.review_name}: send results to employee`);
    
    // Update employee record with latest review data
    await updateEmployeeReviewStats(review, ctx);
    
    console.log(`✅ Review ${review.review_name} finalized`);
    
  } catch (error) {
    console.error('❌ Failed to process review completion:', error);
  }
}

/**
 * Update employee record with review statistics
 */
async function updateEmployeeReviewStats(review: any, ctx: any): Promise<void> {
  try {
    await ctx.ql.doc.update('employee', review.employee_id, {
      last_review_date: review.end_date,
      last_review_rating: review.overall_rating,
      last_review_level: review.performance_level
    });

    console.log(`📊 Updated employee review stats for ${review.employee_id}`);
    
  } catch (error) {
    console.error('❌ Failed to update employee review stats:', error);
  }
}

/**
 * Handle review rejected
 */
async function handleReviewRejected(review: any, ctx: any): Promise<void> {
  console.log(`❌ Performance review rejected: ${review.review_name}`);
  
  try {
    // Send back to reviewer for revision
    await ctx.ql.doc.update('performance_review', review.id, {
      status: 'in_progress'
    });

    console.debug(`[performance_review.hook] Rejection notification pending for review ${review.review_name}: notify reviewer about required changes`);
    
  } catch (error) {
    console.error('❌ Failed to process review rejection:', error);
  }
}

/**
 * Log review status change
 */
async function logReviewStatusChange(
  review: any,
  oldStatus: string,
  newStatus: string,
  ctx: any
): Promise<void> {
  try {
    console.log(`📝 Logging review status change: ${oldStatus} → ${newStatus} for ${review.review_name}`);
    
    console.debug(`[performance_review.hook] Audit log pending: record status change ${oldStatus} → ${newStatus} for review ${review.review_name}`);
  } catch (error) {
    console.error('❌ Failed to log review status change:', error);
  }
}

/**
 * Performance Review Due Date Reminder
 * 
 * Checks for upcoming due dates and sends reminders
 * (This would typically be called by a scheduled job, not a trigger)
 */
export async function checkPerformanceReviewDueDates(ctx: any): Promise<void> {
  try {
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + 7); // 7 days before due

    // Find reviews due soon
    const upcomingReviews = await ctx.ql.find('performance_review', {
      filters: [
        ['status', 'in', ['not_started', 'in_progress']],
        ['due_date', '<=', reminderDate.toISOString().split('T')[0]],
        ['due_date', '>=', today.toISOString().split('T')[0]]
      ]
    });

    for (const review of upcomingReviews) {
      console.log(`⏰ Reminder: Review ${review.review_name} due on ${review.due_date}`);
      console.debug(`[performance_review.hook] Due date reminder pending for review ${review.review_name}: send reminder notification (due ${review.due_date})`);
    }
    
  } catch (error) {
    console.error('❌ Failed to check review due dates:', error);
  }
}

export { 
  PerformanceReviewRatingTrigger, 
  PerformanceReviewWorkflowTrigger 
};

export default [
  PerformanceReviewRatingTrigger,
  PerformanceReviewWorkflowTrigger
] as Hook[];
