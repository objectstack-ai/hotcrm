import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('hr:application');

// Valid application status transitions
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  'new': ['screening'],
  'screening': ['interview', 'rejected'],
  'interview': ['offer', 'rejected'],
  'offer': ['hired', 'rejected'],
  'hired': [],
  'rejected': []
};

/**
 * Application Status Workflow Trigger
 * 
 * Automatically handles:
 * 1. Validate status transitions follow the workflow
 * 2. Auto-create interview record when moved to 'interview'
 * 3. Update candidate status when application is hired
 */
const ApplicationStatusWorkflowTrigger: Hook = {
  name: 'ApplicationStatusWorkflowTrigger',
  object: 'application',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      // Check if status changed
      if (!ctx.previous || (ctx.previous as Record<string, any>).status === (ctx.result as Record<string, any>).status) {
        return;
      }

      const application = ctx.result as Record<string, any>;
      const oldStatus = (ctx.previous as Record<string, any>).status;
      const newStatus = application.status;

      logger.info(`Application ${application.application_number} status changed from "${oldStatus}" to "${newStatus}"`);

      // Validate transition
      const allowedTransitions = VALID_STATUS_TRANSITIONS[oldStatus] || [];
      if (!allowedTransitions.includes(newStatus)) {
        logger.warn(`Invalid status transition from "${oldStatus}" to "${newStatus}" for application ${application.application_number}`);
        return;
      }

      // Handle transition to 'interview'
      if (newStatus === 'interview') {
        await createInterviewRecord(application, ctx);
      }

      // Handle transition to 'hired'
      if (newStatus === 'hired') {
        await updateCandidateToHired(application, ctx);
      }

      // Log status change
      await logApplicationStatusChange(application, oldStatus, newStatus, ctx);

    } catch (error) {
      logger.error('Error in ApplicationStatusWorkflowTrigger:', error);
    }
  }
};

/**
 * Create an interview record when application moves to interview stage
 */
async function createInterviewRecord(application: Record<string, any>, ctx: HookContext): Promise<void> {
  try {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 3); // Default: 3 days from now

    await (ctx.ql as any).doc.create('interview', {
      title: `Interview - Application ${application.application_number}`,
      candidate_id: application.candidate_id,
      application_id: application.id,
      recruitment_id: application.recruitment_id,
      interview_type: 'Phone Screen',
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      duration: 60,
      status: 'scheduled',
      result: null,
      feedback: null
    });

    logger.info(`Auto-created interview record for application ${application.application_number}`);
  } catch (error) {
    logger.error('Failed to create interview record:', error);
  }
}

/**
 * Update candidate status to 'hired' when application is hired
 */
async function updateCandidateToHired(application: Record<string, any>, ctx: HookContext): Promise<void> {
  try {
    if (!application.candidate_id) {
      logger.warn('No candidate linked to application, skipping candidate update');
      return;
    }

    await (ctx.ql as any).doc.update('candidate', application.candidate_id, {
      status: 'hired'
    });

    logger.info(`Candidate ${application.candidate_id} status updated to hired`);
  } catch (error) {
    logger.error('Failed to update candidate status:', error);
  }
}

/**
 * Log application status change
 */
async function logApplicationStatusChange(
  application: Record<string, any>,
  oldStatus: string,
  newStatus: string,
  ctx: HookContext
): Promise<void> {
  try {
    logger.info(`Logging application status change: ${oldStatus} → ${newStatus} for ${application.application_number}`);

    logger.debug(`[application.hook] Audit log pending: record status change ${oldStatus} → ${newStatus} for application ${application.application_number}`);
  } catch (error) {
    logger.error('Failed to log application status change:', error);
  }
}

/**
 * Application Screening Trigger
 * 
 * Automatically handles:
 * 1. Calculate initial screening score based on candidate match
 * 2. Auto-progress to 'screening' if score >= 70
 */
const ApplicationScreeningTrigger: Hook = {
  name: 'ApplicationScreeningTrigger',
  object: 'application',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    try {
      const application = ctx.result as Record<string, any>;

      // Fetch candidate details for scoring
      const candidate = await fetchCandidate(application.candidate_id, ctx);
      if (!candidate) {
        logger.warn(`Candidate ${application.candidate_id} not found, skipping screening`);
        return;
      }

      // Fetch recruitment details for skill matching
      const recruitment = await fetchRecruitment(application.recruitment_id, ctx);

      // Calculate screening score
      const screeningScore = calculateScreeningScore(candidate, recruitment);
      logger.info(`Screening score for application ${application.application_number}: ${screeningScore}`);

      // Update application with screening score via notes
      const updates: Record<string, any> = {
        notes: `Auto-screening score: ${screeningScore}/100`
      };

      // Auto-progress to 'screening' if score >= 70
      if (screeningScore >= 70) {
        updates.status = 'screening';
        logger.info(`Application ${application.application_number} auto-progressed to screening (score: ${screeningScore})`);
      } else {
        logger.info(`ℹ Application ${application.application_number} remains in current status (score: ${screeningScore})`);
      }

      await (ctx.ql as any).doc.update('application', application.id, updates);

    } catch (error) {
      logger.error('Error in ApplicationScreeningTrigger:', error);
    }
  }
};

/**
 * Fetch candidate record
 */
async function fetchCandidate(candidateId: string, ctx: HookContext): Promise<any> {
  try {
    const candidates = await (ctx.ql as any).find('candidate', {
      filters: [['id', '=', candidateId]],
      limit: 1
    });
    return candidates && candidates.length > 0 ? candidates[0] : null;
  } catch (error) {
    logger.error('Failed to fetch candidate:', error);
    return null;
  }
}

/**
 * Fetch recruitment record
 */
async function fetchRecruitment(recruitmentId: string, ctx: HookContext): Promise<any> {
  try {
    if (!recruitmentId) return null;
    const recruitments = await (ctx.ql as any).find('recruitment', {
      filters: [['id', '=', recruitmentId]],
      limit: 1
    });
    return recruitments && recruitments.length > 0 ? recruitments[0] : null;
  } catch (error) {
    logger.error('Failed to fetch recruitment:', error);
    return null;
  }
}

/**
 * Calculate screening score based on candidate qualifications
 */
function calculateScreeningScore(candidate: Record<string, any>, recruitment: Record<string, any>): number {
  let score = 0;

  // Experience score (30 points)
  const years = candidate.years_of_experience || 0;
  if (years >= 10) score += 30;
  else if (years >= 7) score += 25;
  else if (years >= 5) score += 20;
  else if (years >= 3) score += 15;
  else if (years >= 1) score += 10;
  else score += 5;

  // Education score (20 points)
  const educationScores: Record<string, number> = {
    'PhD': 20,
    'Master': 17,
    'Bachelor': 14,
    'Associate': 10,
    'High School': 5,
    'Other': 3
  };
  score += educationScores[candidate.highest_education] || 0;

  // Resume provided (15 points)
  if (candidate.resume_url) {
    score += 15;
  }

  // Contact completeness (15 points)
  if (candidate.email) score += 5;
  if (candidate.mobile_phone) score += 5;
  if (candidate.current_company) score += 5;

  // Availability score (10 points)
  const availabilityScores: Record<string, number> = {
    'Immediate': 10,
    '1 Week': 9,
    '2 Weeks': 8,
    '1 Month': 6,
    '2 Months': 4,
    '3 Months': 2
  };
  score += availabilityScores[candidate.notice_period] || 0;

  // Source quality (10 points)
  const sourceScores: Record<string, number> = {
    'Employee Referral': 10,
    'Headhunter': 8,
    'Campus': 7,
    'Job Board': 5,
    'Social Media': 4,
    'Direct Application': 3,
    'Other': 2
  };
  score += sourceScores[candidate.source] || 2;

  return Math.min(100, Math.max(0, score));
}

export { ApplicationStatusWorkflowTrigger, ApplicationScreeningTrigger };
export default [ApplicationStatusWorkflowTrigger, ApplicationScreeningTrigger] as Hook[];
