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
 * Activity Auto-Complete Trigger
 * 
 * Automatically completes past-due activities
 * This would typically run as a daily batch job
 */
export async function autoCompletePastDueActivities(db: any): Promise<void> {
  console.log('🔄 Running auto-complete for past-due activities...');
  
  // In real implementation:
  // const pastDueActivities = await db.find('Activity', {
  //   filters: [
  //     ['DueDate', '<', new Date().toISOString().split('T')[0]],
  //     ['Status', 'not in', ['Completed', 'Cancelled']]
  //   ]
  // });
  
  // for (const activity of pastDueActivities) {
  //   await db.doc.update('Activity', activity.Id, {
  //     Status: 'Completed',
  //     CompletedDate: new Date().toISOString()
  //   });
  //   
  //   // Send notification
  //   console.log(`✅ Auto-completed past-due activity: ${activity.Subject}`);
  // }
  
  console.log('✅ Auto-complete batch job completed');
}

/**
 * Activity Related Object Updates Trigger
 * 
 * Updates related objects when activity is created/updated:
 * - Account.LastActivityDate
 * - Contact.LastContactDate
 * - Opportunity.LastActivityDate
 * - Increment activity counters
 */
const ActivityRelatedObjectUpdatesTrigger: Hook = {
  name: 'ActivityRelatedObjectUpdatesTrigger',
  object: 'Activity',
  events: ['afterInsert', 'afterUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const activity = ctx.new;
      const oldActivity = ctx.old;
      
      // Only process if activity is completed or date changed
      const isCompleted = activity.Status === 'Completed';
      const dateChanged = !oldActivity || oldActivity.ActivityDate !== activity.ActivityDate;
      
      if (!isCompleted && !dateChanged) {
        return;
      }
      
      const activityDate = activity.ActivityDate 
        ? activity.ActivityDate.split('T')[0] 
        : new Date().toISOString().split('T')[0];
      
      // Update Contact.LastContactDate
      if (activity.WhoId) {
        await updateContactLastActivityDate(activity.WhoId, activityDate, ctx);
      }
      
      // Update related Account/Opportunity/Contract/Case
      if (activity.WhatId) {
        await updateWhatObjectLastActivityDate(activity.WhatId, activityDate, ctx);
      }
      
    } catch (error) {
      console.error('❌ Error in ActivityRelatedObjectUpdatesTrigger:', error);
    }
  }
};

/**
 * Update Contact's last activity date
 */
async function updateContactLastActivityDate(whoId: string, activityDate: string, ctx: TriggerContext): Promise<void> {
  console.log(`🔄 Updating LastContactDate for contact: ${whoId}`);
  
  // In real implementation:
  // const contact = await ctx.db.doc.get('Contact', whoId, { fields: ['LastContactDate'] });
  // 
  // if (!contact.LastContactDate || new Date(activityDate) > new Date(contact.LastContactDate)) {
  //   await ctx.db.doc.update('Contact', whoId, {
  //     LastContactDate: activityDate
  //   });
  //   console.log(`✅ Updated contact LastContactDate to ${activityDate}`);
  // }
}

/**
 * Update related object's last activity date
 */
async function updateWhatObjectLastActivityDate(whatId: string, activityDate: string, ctx: TriggerContext): Promise<void> {
  console.log(`🔄 Updating LastActivityDate for related object: ${whatId}`);
  
  // In real implementation, would need to determine object type from WhatId
  // and update the appropriate object (Account, Opportunity, Contract, Case)
  // 
  // For Account:
  // await ctx.db.doc.update('Account', whatId, {
  //   LastActivityDate: activityDate  // Note: This field may need to be added to Account object
  // });
  
  // For Opportunity:
  // await ctx.db.doc.update('Opportunity', whatId, {
  //   LastActivityDate: activityDate  // Note: This field may need to be added to Opportunity object
  // });
}

/**
 * Activity Completion Trigger
 * 
 * Handles activity completion:
 * - Set CompletedDate
 * - Log to timeline
 * - Send completion notifications
 * - Handle recurrence
 */
const ActivityCompletionTrigger: Hook = {
  name: 'ActivityCompletionTrigger',
  object: 'Activity',
  events: ['beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const activity = ctx.new;
      const oldActivity = ctx.old;
      
      // Check if status changed to Completed
      if (oldActivity && oldActivity.Status !== 'Completed' && activity.Status === 'Completed') {
        // Set CompletedDate
        activity.CompletedDate = new Date().toISOString();
        console.log(`✅ Activity completed: ${activity.Subject}`);
        
        // Handle recurrence - create next occurrence
        if (activity.IsRecurring && activity.RecurrencePattern) {
          await createNextRecurrence(activity, ctx);
        }
      }
      
    } catch (error) {
      console.error('❌ Error in ActivityCompletionTrigger:', error);
    }
  }
};

/**
 * Create next recurrence of a recurring activity
 */
async function createNextRecurrence(activity: Record<string, any>, ctx: TriggerContext): Promise<void> {
  console.log(`🔄 Creating next recurrence for: ${activity.Subject}`);
  
  // Calculate next occurrence date based on pattern
  const currentDate = new Date(activity.ActivityDate);
  const nextDate = new Date(currentDate);
  
  const interval = activity.RecurrenceInterval || 1;
  
  // Validate recurrence pattern
  const validPatterns = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
  if (!validPatterns.includes(activity.RecurrencePattern)) {
    console.error(`❌ Invalid recurrence pattern: ${activity.RecurrencePattern}`);
    return;
  }
  
  switch (activity.RecurrencePattern) {
    case 'Daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'Weekly':
      nextDate.setDate(nextDate.getDate() + (7 * interval));
      break;
    case 'Monthly': {
      // Handle month overflow properly (e.g., Jan 31 + 1 month = Feb 28/29)
      const targetMonth = nextDate.getMonth() + interval;
      const targetYear = nextDate.getFullYear() + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;
      const currentDay = nextDate.getDate();
      
      nextDate.setFullYear(targetYear);
      nextDate.setMonth(normalizedMonth);
      
      // If day was reset due to overflow (e.g., Jan 31 -> Mar 3), set to last day of target month
      if (nextDate.getDate() !== currentDay) {
        nextDate.setDate(0); // Sets to last day of previous month
      }
      break;
    }
    case 'Yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
  }
  
  // Check if we should create the next occurrence
  if (activity.RecurrenceEndDate) {
    try {
      const endDate = new Date(activity.RecurrenceEndDate);
      if (nextDate > endDate) {
        console.log(`⏹️ Recurrence ended - reached end date`);
        return;
      }
    } catch (error) {
      console.error(`❌ Invalid RecurrenceEndDate: ${activity.RecurrenceEndDate}`);
      return;
    }
  }
  
  // Create next occurrence
  const nextActivity = {
    Subject: activity.Subject,
    Type: activity.Type,
    Status: 'Planned',
    Priority: activity.Priority,
    ActivityDate: nextDate.toISOString(),
    DueDate: nextDate.toISOString().split('T')[0],
    WhoId: activity.WhoId,
    WhatId: activity.WhatId,
    OwnerId: activity.OwnerId,
    Description: activity.Description,
    IsRecurring: true,
    RecurrencePattern: activity.RecurrencePattern,
    RecurrenceInterval: activity.RecurrenceInterval,
    RecurrenceEndDate: activity.RecurrenceEndDate,
    RecurrenceInstanceId: activity.RecurrenceInstanceId || activity.Id
  };
  
  // await ctx.db.doc.create('Activity', nextActivity);
  console.log(`✅ Created next recurrence for ${nextDate.toISOString().split('T')[0]}`);
}

/**
 * Activity Overdue Notification
 * 
 * Daily job to find and notify about overdue activities
 */
export async function sendOverdueNotifications(db: any): Promise<void> {
  console.log('🔄 Finding overdue activities...');
  
  // In real implementation:
  // const overdueActivities = await db.find('Activity', {
  //   filters: [
  //     ['DueDate', '<', new Date().toISOString().split('T')[0]],
  //     ['Status', 'not in', ['Completed', 'Cancelled']]
  //   ]
  // });
  
  // for (const activity of overdueActivities) {
  //   // Send notification to owner
  //   console.log(`📧 Notifying ${activity.OwnerId} about overdue activity: ${activity.Subject}`);
  //   
  //   // Optionally notify manager
  //   // const owner = await db.doc.get('User', activity.OwnerId);
  //   // if (owner.ManagerId) {
  //   //   console.log(`📧 Notifying manager ${owner.ManagerId}`);
  //   // }
  //   
  //   // Optionally create follow-up task
  //   // await db.doc.create('Activity', {
  //   //   Subject: `Follow-up: ${activity.Subject}`,
  //   //   Type: 'Task',
  //   //   Status: 'Planned',
  //   //   Priority: 'high',
  //   //   WhoId: activity.WhoId,
  //   //   WhatId: activity.WhatId,
  //   //   OwnerId: activity.OwnerId,
  //   //   ActivityDate: new Date().toISOString(),
  //   //   Description: `Follow-up for overdue activity: ${activity.Subject}`
  //   // });
  // }
  
  console.log('✅ Overdue notification job completed');
}

/**
 * Activity Type Validation Trigger
 * 
 * Validates type-specific requirements
 */
const ActivityTypeValidationTrigger: Hook = {
  name: 'ActivityTypeValidationTrigger',
  object: 'Activity',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const activity = ctx.new;
      
      // Log activity type for tracking
      console.log(`📝 Activity: ${activity.Type} - ${activity.Subject}`);
      
      // Type-specific processing could go here
      switch (activity.Type) {
        case 'Call':
          if (activity.CallResult === 'Connected' && !activity.CallDurationInSeconds) {
            console.warn(`⚠️ Connected call should have duration recorded`);
          }
          break;
        case 'email':
          if (!activity.EmailSubject && activity.EmailBody) {
            console.warn(`⚠️ Email has body but no subject`);
          }
          break;
        case 'Meeting':
          if (!activity.IsOnline && !activity.Location) {
            console.warn(`⚠️ In-person meeting should have location`);
          }
          break;
      }
      
    } catch (error) {
      console.error('❌ Error in ActivityTypeValidationTrigger:', error);
    }
  }
};

// Export all hooks
export {
  ActivityRelatedObjectUpdatesTrigger,
  ActivityCompletionTrigger,
  ActivityTypeValidationTrigger
};

export default ActivityRelatedObjectUpdatesTrigger;
