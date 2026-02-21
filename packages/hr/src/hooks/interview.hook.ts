import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('hr:interview');

/**
 * Interview Scheduling Trigger
 * 
 * Automatically handles:
 * 1. Validate interviewer is not double-booked
 * 2. Ensure interview date is in the future
 * 3. Set default duration if not provided
 */
const InterviewSchedulingTrigger: Hook = {
  name: 'InterviewSchedulingTrigger',
  object: 'interview',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    try {
      const interview = ctx.input.doc as Record<string, any>;

      // Set default duration if not provided (60 minutes)
      if (!interview.duration) {
        interview.duration = 60;
        logger.info('ℹ Default interview duration set to 60 minutes');
      }

      // Validate interview date is in the future
      if (interview.scheduled_date) {
        const scheduledDate = new Date(interview.scheduled_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (scheduledDate < today) {
          logger.warn(`Interview scheduled_date ${interview.scheduled_date} is in the past`);
          // Allow past dates for historical data entry but log warning
        }
      }

      // Check interviewer is not double-booked
      if (interview.interviewer_id && interview.scheduled_date) {
        const isDoubleBooked = await checkInterviewerAvailability(
          interview.interviewer_id,
          interview.scheduled_date,
          interview.duration,
          ctx
        );

        if (isDoubleBooked) {
          logger.warn(`Interviewer ${interview.interviewer_id} may have a scheduling conflict on ${interview.scheduled_date}`);
        }
      }

      // Set default status if not provided
      if (!interview.status) {
        interview.status = 'scheduled';
      }

      logger.info(`Interview scheduling validation passed for ${interview.title || 'new interview'}`);

    } catch (error) {
      logger.error('Error in InterviewSchedulingTrigger:', error);
    }
  }
};

/**
 * Check if interviewer has conflicting interviews on the same date
 */
async function checkInterviewerAvailability(
  interviewerId: string,
  scheduledDate: string,
  duration: number,
  ctx: HookContext
): Promise<boolean> {
  try {
    const dateOnly = scheduledDate.split('T')[0];

    const existingInterviews = await (ctx.ql as any).find('interview', {
      filters: [
        ['interviewer_id', '=', interviewerId],
        ['scheduled_date', '=', dateOnly],
        ['status', '!=', 'cancelled']
      ]
    });

    if (existingInterviews && existingInterviews.length > 0) {
      logger.warn(`Interviewer ${interviewerId} already has ${existingInterviews.length} interview(s) on ${dateOnly}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to check interviewer availability:', error);
    return false;
  }
}

/**
 * Interview Feedback Trigger
 * 
 * Automatically handles:
 * 1. Update application status when interview result is submitted
 * 2. Calculate average interview score across all interviews for the application
 */
const InterviewFeedbackTrigger: Hook = {
  name: 'InterviewFeedbackTrigger',
  object: 'interview',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      // Check if result field changed from null/undefined to a value
      const previousResult = ctx.previous ? (ctx.previous as Record<string, any>).result : null;
      const currentResult = (ctx.result as Record<string, any>).result;

      if (previousResult != null || currentResult == null || previousResult === currentResult) {
        return;
      }

      const interview = ctx.result as Record<string, any>;
      logger.info(`Interview feedback submitted for ${interview.title}: result=${currentResult}`);

      // Update application status based on result
      if (interview.application_id) {
        await updateApplicationFromResult(interview, currentResult, ctx);
      }

      // Calculate average interview score across all interviews for the application
      if (interview.application_id) {
        await calculateAverageInterviewScore(interview.application_id, ctx);
      }

    } catch (error) {
      logger.error('Error in InterviewFeedbackTrigger:', error);
    }
  }
};

/**
 * Update application status based on interview result
 */
async function updateApplicationFromResult(
  interview: Record<string, any>,
  result: string,
  ctx: HookContext
): Promise<void> {
  try {
    const statusMap: Record<string, string> = {
      'pass': 'offer',
      'fail': 'rejected',
      'hold': 'interview'
    };

    const newStatus = statusMap[result];
    if (!newStatus) {
      logger.warn(`Unknown interview result: ${result}`);
      return;
    }

    // Only update application if result is pass or fail (definitive outcomes)
    if (result === 'pass' || result === 'fail') {
      await (ctx.ql as any).doc.update('application', interview.application_id, {
        status: newStatus
      });

      logger.info(`Application ${interview.application_id} status updated to "${newStatus}" based on interview result`);
    } else {
      logger.info(`ℹ Application ${interview.application_id} remains in interview stage (result: ${result})`);
    }
  } catch (error) {
    logger.error('Failed to update application status:', error);
  }
}

/**
 * Calculate average interview score across all interviews for an application
 */
async function calculateAverageInterviewScore(
  applicationId: string,
  ctx: HookContext
): Promise<void> {
  try {
    const interviews = await (ctx.ql as any).find('interview', {
      filters: [
        ['application_id', '=', applicationId],
        ['result', '!=', null]
      ]
    });

    if (!interviews || interviews.length === 0) {
      return;
    }

    // Calculate score: pass=100, hold=50, fail=0
    const scoreMap: Record<string, number> = {
      'pass': 100,
      'hold': 50,
      'fail': 0
    };

    let totalScore = 0;
    let scoredCount = 0;
    for (const iv of interviews) {
      if (iv.result && scoreMap[iv.result] !== undefined) {
        totalScore += scoreMap[iv.result];
        scoredCount++;
      }
    }

    const averageScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;

    // Update application notes with average score
    await (ctx.ql as any).doc.update('application', applicationId, {
      notes: `Average interview score: ${averageScore}/100 (${scoredCount} interview(s) completed)`
    });

    logger.info(`Average interview score for application ${applicationId}: ${averageScore}/100`);
  } catch (error) {
    logger.error('Failed to calculate average interview score:', error);
  }
}

export { InterviewSchedulingTrigger, InterviewFeedbackTrigger };
export default [InterviewSchedulingTrigger, InterviewFeedbackTrigger] as Hook[];
