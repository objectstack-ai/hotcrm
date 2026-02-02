import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Candidate Scoring and Status Management Trigger
 * 
 * Automatically handles:
 * 1. Candidate score calculation based on qualifications
 * 2. Auto-screening based on minimum requirements
 * 3. Status lifecycle management
 * 4. Duplicate candidate detection
 */
const CandidateScoringTrigger: Hook = {
  name: 'CandidateScoringTrigger',
  object: 'candidate',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const candidate = ctx.input;

      // Check for duplicate candidates (same email)
      if (ctx.event === 'beforeInsert' || (ctx.previous && candidate.email !== ctx.previous.email)) {
        const duplicates = await ctx.ql.find('candidate', {
          filters: [
            ['email', '=', candidate.email],
            ['id', '!=', candidate.id || '']
          ],
          limit: 1
        });

        if (duplicates && duplicates.length > 0) {
          console.warn(`⚠️ Duplicate candidate detected: ${candidate.email}`);
          // Note: Could throw error or merge logic here
        }
      }

      // Calculate candidate score
      candidate.score = calculateCandidateScore(candidate);

      // Auto-screen based on minimum requirements
      if (ctx.event === 'beforeInsert' && candidate.status === 'New') {
        const passedScreening = await autoScreen(candidate, ctx);
        if (passedScreening) {
          candidate.status = 'Under Review';
          console.log(`✅ Candidate ${candidate.first_name} ${candidate.last_name} passed auto-screening`);
        } else {
          console.log(`❌ Candidate ${candidate.first_name} ${candidate.last_name} did not pass auto-screening`);
        }
      }

      console.log(`✨ Candidate scoring completed: Score=${candidate.score}`);

    } catch (error) {
      console.error('❌ Error in CandidateScoringTrigger:', error);
      // Don't throw - allow candidate to be saved
    }
  }
};

/**
 * Calculate candidate score (0-100) based on qualifications
 */
function calculateCandidateScore(candidate: any): number {
  let score = 0;

  // Education score (25 points)
  const educationScores = {
    'PhD': 25,
    'Master': 20,
    'Bachelor': 15,
    'Associate': 10,
    'High School': 5,
    'Other': 3
  };
  score += educationScores[candidate.highest_education as keyof typeof educationScores] || 0;

  // Experience score (30 points)
  const years = candidate.years_of_experience || 0;
  if (years >= 10) score += 30;
  else if (years >= 7) score += 25;
  else if (years >= 5) score += 20;
  else if (years >= 3) score += 15;
  else if (years >= 1) score += 10;
  else score += 5;

  // Source quality score (15 points)
  const sourceScores = {
    'Employee Referral': 15,
    'Headhunter': 12,
    'Campus': 10,
    'Job Board': 8,
    'Social Media': 7,
    'Direct Application': 6,
    'Other': 5
  };
  score += sourceScores[candidate.source as keyof typeof sourceScores] || 5;

  // Availability score (10 points)
  const availabilityScores = {
    'Immediate': 10,
    '1 Week': 9,
    '2 Weeks': 8,
    '1 Month': 6,
    '2 Months': 4,
    '3 Months': 2
  };
  score += availabilityScores[candidate.notice_period as keyof typeof availabilityScores] || 0;

  // Completeness score (20 points)
  const requiredFields = [
    'first_name', 'last_name', 'email', 'mobile_phone',
    'current_company', 'current_title', 'years_of_experience',
    'highest_education', 'expected_salary', 'resume_url'
  ];
  const filledFields = requiredFields.filter(field => 
    candidate[field] && candidate[field] !== ''
  ).length;
  score += Math.round((filledFields / requiredFields.length) * 20);

  return Math.min(100, Math.max(0, score));
}

/**
 * Auto-screen candidate against minimum requirements
 */
async function autoScreen(candidate: any, ctx: HookContext): Promise<boolean> {
  // Basic validation
  if (!candidate.email || !candidate.mobile_phone) {
    return false;
  }

  // Minimum experience requirement (can be customized)
  const minExperience = 0; // Default: accept all
  if ((candidate.years_of_experience || 0) < minExperience) {
    return false;
  }

  // Check resume is provided
  if (!candidate.resume_url) {
    return false;
  }

  return true;
}

/**
 * Candidate Status Change Trigger
 * 
 * Handles automation when candidate status changes
 */
const CandidateStatusChangeTrigger: Hook = {
  name: 'CandidateStatusChangeTrigger',
  object: 'candidate',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      // Check if status changed
      if (!ctx.previous || ctx.previous.status === ctx.input.status) {
        return;
      }

      const candidate = ctx.input;
      const oldStatus = ctx.previous.status;
      const newStatus = candidate.status;

      console.log(`🔄 Candidate status changed from "${oldStatus}" to "${newStatus}"`);

      // Handle different status transitions
      switch (newStatus) {
        case 'Interviewing':
          await handleInterviewingStatus(candidate, ctx);
          break;
        case 'Hired':
          await handleHiredStatus(candidate, ctx);
          break;
        case 'Rejected':
          await handleRejectedStatus(candidate, ctx);
          break;
        case 'Withdrawn':
          await handleWithdrawnStatus(candidate, ctx);
          break;
      }

      // Log status change activity
      await logStatusChange(candidate, oldStatus, newStatus, ctx);

    } catch (error) {
      console.error('❌ Error in CandidateStatusChangeTrigger:', error);
    }
  }
};

/**
 * Handle transition to Interviewing status
 */
async function handleInterviewingStatus(candidate: any, ctx: HookContext): Promise<void> {
  console.log(`📅 Candidate ${candidate.first_name} ${candidate.last_name} moved to interviewing stage`);
  
  // TODO: Schedule first interview
  // TODO: Send email notification to hiring manager
  // TODO: Create interview records
}

/**
 * Handle transition to Hired status
 */
async function handleHiredStatus(candidate: any, ctx: HookContext): Promise<void> {
  console.log(`🎉 Candidate ${candidate.first_name} ${candidate.last_name} has been hired`);
  
  // TODO: Create offer record if not exists
  // TODO: Create onboarding record
  // TODO: Send welcome email
  // TODO: Notify HR team
}

/**
 * Handle transition to Rejected status
 */
async function handleRejectedStatus(candidate: any, ctx: HookContext): Promise<void> {
  console.log(`❌ Candidate ${candidate.first_name} ${candidate.last_name} has been rejected`);
  
  // TODO: Send rejection email (if configured)
  // TODO: Archive candidate data
}

/**
 * Handle transition to Withdrawn status
 */
async function handleWithdrawnStatus(candidate: any, ctx: HookContext): Promise<void> {
  console.log(`🚪 Candidate ${candidate.first_name} ${candidate.last_name} has withdrawn`);
  
  // TODO: Log withdrawal reason
  // TODO: Update recruitment metrics
}

/**
 * Log status change activity
 */
async function logStatusChange(
  candidate: any,
  oldStatus: string,
  newStatus: string,
  ctx: HookContext
): Promise<void> {
  try {
    // Note: Activity object might need to be adapted for HR module
    // This is a placeholder implementation
    console.log(`📝 Logging status change: ${oldStatus} → ${newStatus}`);
    
    // TODO: Create activity record when activity system is available for HR
  } catch (error) {
    console.error('❌ Failed to log status change:', error);
  }
}

export { CandidateScoringTrigger, CandidateStatusChangeTrigger };
export default CandidateScoringTrigger;
