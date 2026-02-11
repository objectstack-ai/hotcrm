import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Onboarding Checklist Trigger
 * 
 * Automatically handles:
 * 1. Create onboarding record when offer status changes to 'accepted'
 * 2. Set default checklist items
 * 3. Set onboarding start_date based on offer start_date
 */
const OnboardingChecklistTrigger: Hook = {
  name: 'OnboardingChecklistTrigger',
  object: 'offer',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      // Check if status changed to 'accepted'
      if (!ctx.previous || (ctx.previous as Record<string, any>).status === (ctx.result as Record<string, any>).status) {
        return;
      }

      const offer = ctx.result as Record<string, any>;
      const newStatus = offer.status;

      if (newStatus !== 'accepted') {
        return;
      }

      console.log(`🎉 Offer ${offer.offer_number} accepted, creating onboarding record`);

      // Create onboarding record with default checklist items
      await createOnboardingFromOffer(offer, ctx);

    } catch (error) {
      console.error('❌ Error in OnboardingChecklistTrigger:', error);
    }
  }
};

/**
 * Create onboarding record from accepted offer
 */
async function createOnboardingFromOffer(offer: any, ctx: any): Promise<void> {
  try {
    const startDate = offer.start_date || new Date().toISOString().split('T')[0];
    const start = new Date(startDate);
    const probationEnd = new Date(start);
    probationEnd.setDate(probationEnd.getDate() + 90); // 90-day probation

    await (ctx.ql as any).doc.create('onboarding', {
      title: `Onboarding - Offer ${offer.offer_number}`,
      offer_id: offer.id,
      start_date: startDate,
      status: 'in_progress',
      completion_percentage: 0,
      manager_id: offer.hiring_manager_id,
      probation_end_date: probationEnd.toISOString().split('T')[0],

      // Default checklist items
      it_setup_completed: false,
      workspace_setup_completed: false,
      training_completed: false,
      system_access_granted: false,
      paperwork_completed: false,

      // Default goals
      first_day_checklist: 'IT setup, workspace tour, team introduction',
      first_week_goals: 'Benefits enrollment, compliance training, system onboarding',
      first_month_goals: 'Complete all onboarding tasks, initial project assignment',
      notes: 'Auto-created from accepted offer'
    });

    console.log(`📋 Created onboarding record for offer ${offer.offer_number} with start date ${startDate}`);
  } catch (error) {
    console.error('❌ Failed to create onboarding record:', error);
  }
}

/**
 * Onboarding Progress Trigger
 * 
 * Automatically handles:
 * 1. Recalculate completion percentage when checklist items are updated
 * 2. Set status to 'completed' when all items are done
 * 3. Track days since start for progress reporting
 */
const OnboardingProgressTrigger: Hook = {
  name: 'OnboardingProgressTrigger',
  object: 'onboarding',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const onboarding = ctx.input.doc as Record<string, any>;
      const previous = ctx.previous as Record<string, any> | undefined;

      // Checklist items to track
      const checklistItems = [
        'it_setup_completed',
        'workspace_setup_completed',
        'training_completed',
        'system_access_granted',
        'paperwork_completed'
      ];

      // Count completed items
      let completedCount = 0;
      for (const item of checklistItems) {
        const value = onboarding[item] !== undefined ? onboarding[item] : (previous ? previous[item] : false);
        if (value === true) {
          completedCount++;
        }
      }

      // Recalculate completion percentage
      const completionPercentage = Math.round((completedCount / checklistItems.length) * 100);
      onboarding.completion_percentage = completionPercentage;

      console.log(`📊 Onboarding completion: ${completionPercentage}% (${completedCount}/${checklistItems.length} items)`);

      // Set status to 'completed' if all items are done
      if (completionPercentage === 100 && onboarding.status !== 'completed') {
        onboarding.status = 'completed';
        console.log('🎉 All onboarding checklist items completed, status set to completed');
      }

      // Track days since start for progress reporting
      const startDate = onboarding.start_date || (previous ? previous.start_date : null);
      if (startDate) {
        const start = new Date(startDate);
        const today = new Date();
        const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`📅 Days since onboarding start: ${daysSinceStart}`);
      }

    } catch (error) {
      console.error('❌ Error in OnboardingProgressTrigger:', error);
    }
  }
};

export { OnboardingChecklistTrigger, OnboardingProgressTrigger };
export default [OnboardingChecklistTrigger, OnboardingProgressTrigger] as Hook[];
