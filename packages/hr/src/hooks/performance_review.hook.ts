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
      const review = ctx.input;

      // Calculate overall rating from component scores
      if (hasAllComponentScores(review)) {
        review.overall_rating = calculateOverallRating(review);
        review.performance_level = determinePerformanceLevel(review.overall_rating);
        
        console.log(`✨ Performance review rating calculated: ${review.overall_rating}/5 (${review.performance_level})`);
      }

      // Calculate completion percentage
      review.completion_percentage = calculateCompletionPercentage(review);

      // Auto-update status based on completion
      if (review.completion_percentage === 100 && review.status === 'In Progress') {
        review.status = 'Pending Approval';
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
  if (rating >= 4.5) return 'Outstanding';
  if (rating >= 3.5) return 'Exceeds Expectations';
  if (rating >= 2.5) return 'Meets Expectations';
  if (rating >= 1.5) return 'Needs Improvement';
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
      if (!ctx.previous || ctx.previous.status === ctx.input.status) {
        return;
      }

      const review = ctx.input;
      const oldStatus = ctx.previous.status;
      const newStatus = review.status;

      console.log(`🔄 Performance review ${review.review_name} status changed from "${oldStatus}" to "${newStatus}"`);

      // Handle different status transitions
      switch (newStatus) {
        case 'In Progress':
          await handleReviewStarted(review, ctx);
          break;
        case 'Pending Approval':
          await handleReviewSubmitted(review, ctx);
          break;
        case 'Approved':
          await handleReviewApproved(review, ctx);
          break;
        case 'Completed':
          await handleReviewCompleted(review, ctx);
          break;
        case 'Rejected':
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
async function handleReviewStarted(review: any, ctx: HookContext): Promise<void> {
  console.log(`📝 Performance review started: ${review.review_name}`);
  
  try {
    // Notify employee being reviewed
    // TODO: Send email notification to employee
    
    // Notify reviewer
    // TODO: Send email notification to reviewer
    
    console.log(`📧 Notifications sent for review ${review.review_name}`);
    
  } catch (error) {
    console.error('❌ Failed to process review start:', error);
  }
}

/**
 * Handle review submitted for approval
 */
async function handleReviewSubmitted(review: any, ctx: HookContext): Promise<void> {
  console.log(`📤 Performance review submitted for approval: ${review.review_name}`);
  
  try {
    // Set submission date
    await ctx.ql.doc.update('performance_review', review.id, {
      submitted_date: new Date().toISOString().split('T')[0],
      submitted_by: ctx.session?.userId
    });

    // Notify approver (typically HR or senior manager)
    // TODO: Send approval request notification
    
    console.log(`✅ Review ${review.review_name} submitted for approval`);
    
  } catch (error) {
    console.error('❌ Failed to process review submission:', error);
  }
}

/**
 * Handle review approved
 */
async function handleReviewApproved(review: any, ctx: HookContext): Promise<void> {
  console.log(`✅ Performance review approved: ${review.review_name}`);
  
  try {
    // Set approval date
    await ctx.ql.doc.update('performance_review', review.id, {
      approved_date: new Date().toISOString().split('T')[0],
      approved_by: ctx.session?.userId
    });

    // Trigger compensation review if high performance
    if (review.performance_level === 'Outstanding' || review.performance_level === 'Exceeds Expectations') {
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
async function triggerCompensationReview(review: any, ctx: HookContext): Promise<void> {
  try {
    console.log(`💰 Triggering compensation review for high performer: ${review.employee_id}`);
    
    // TODO: Create compensation review task
    // TODO: Notify HR and manager about compensation review
    // In production, this might create a workflow or task record
    
  } catch (error) {
    console.error('❌ Failed to trigger compensation review:', error);
  }
}

/**
 * Create development goals from review feedback
 */
async function createDevelopmentGoals(review: any, ctx: HookContext): Promise<void> {
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
      case 'Quarterly':
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
      status: 'In Progress',
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
async function handleReviewCompleted(review: any, ctx: HookContext): Promise<void> {
  console.log(`🎉 Performance review completed: ${review.review_name}`);
  
  try {
    // Set completion date
    await ctx.ql.doc.update('performance_review', review.id, {
      completion_date: new Date().toISOString().split('T')[0]
    });

    // Notify employee
    // TODO: Send completion notification with results
    
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
async function updateEmployeeReviewStats(review: any, ctx: HookContext): Promise<void> {
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
async function handleReviewRejected(review: any, ctx: HookContext): Promise<void> {
  console.log(`❌ Performance review rejected: ${review.review_name}`);
  
  try {
    // Send back to reviewer for revision
    await ctx.ql.doc.update('performance_review', review.id, {
      status: 'In Progress'
    });

    // TODO: Notify reviewer about rejection and required changes
    
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
  ctx: HookContext
): Promise<void> {
  try {
    console.log(`📝 Logging review status change: ${oldStatus} → ${newStatus} for ${review.review_name}`);
    
    // TODO: Create activity/audit log when available
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
export async function checkPerformanceReviewDueDates(ctx: HookContext): Promise<void> {
  try {
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + 7); // 7 days before due

    // Find reviews due soon
    const upcomingReviews = await ctx.ql.find('performance_review', {
      filters: [
        ['status', 'in', ['Not Started', 'In Progress']],
        ['due_date', '<=', reminderDate.toISOString().split('T')[0]],
        ['due_date', '>=', today.toISOString().split('T')[0]]
      ]
    });

    for (const review of upcomingReviews) {
      console.log(`⏰ Reminder: Review ${review.review_name} due on ${review.due_date}`);
      // TODO: Send reminder notifications
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
];
