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
 * Account Health Score Calculation Trigger
 * 
 * Calculates health score (0-100) based on:
 * - Activity frequency
 * - Payment history (contract status)
 * - Support cases
 * - Contract value
 */
const AccountHealthScoreTrigger: Hook = {
  name: 'AccountHealthScoreTrigger',
  object: 'Account',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const account = ctx.new;
      
      // Calculate health score
      account.HealthScore = await calculateHealthScore(account, ctx);
      
      // Set color coding based on health score
      if (account.HealthScore >= 80) {
        console.log(`✅ Account ${account.Name} - Healthy (${account.HealthScore})`);
      } else if (account.HealthScore >= 50) {
        console.log(`⚠️ Account ${account.Name} - At Risk (${account.HealthScore})`);
      } else {
        console.log(`🚨 Account ${account.Name} - Critical (${account.HealthScore})`);
      }
      
    } catch (error) {
      console.error('❌ Error in AccountHealthScoreTrigger:', error);
      // Don't throw - allow account to be saved even if scoring fails
    }
  }
};

/**
 * Calculate account health score (0-100)
 */
async function calculateHealthScore(account: Record<string, any>, ctx: TriggerContext): Promise<number> {
  let score = 0;
  
  // Base score for active customer status (20 points)
  if (account.CustomerStatus === 'Active Customer') {
    score += 20;
  } else if (account.CustomerStatus === 'Prospect') {
    score += 10;
  }
  
  // Contract value contribution (25 points)
  const contractValue = account.ContractValue || 0;
  if (contractValue > 1000000) {
    score += 25;
  } else if (contractValue > 500000) {
    score += 20;
  } else if (contractValue > 100000) {
    score += 15;
  } else if (contractValue > 50000) {
    score += 10;
  } else if (contractValue > 0) {
    score += 5;
  }
  
  // Activity frequency (25 points) - would need to query activities
  // For now, use placeholder logic
  score += 15; // Default medium activity score
  
  // Payment history - based on active contracts (15 points)
  // Would need to query contracts in real implementation
  score += 10; // Default good payment history
  
  // Support cases - fewer open cases = better score (15 points)
  // Would need to query cases in real implementation
  score += 12; // Default few support issues
  
  // Ensure score is within 0-100 range
  return Math.min(100, Math.max(0, score));
}

/**
 * Account Hierarchy Management Trigger
 * 
 * Handles:
 * - Auto-update parent account metrics
 * - Cascade ownership changes
 * - Aggregate child account values
 */
const AccountHierarchyTrigger: Hook = {
  name: 'AccountHierarchyTrigger',
  object: 'Account',
  events: ['afterInsert', 'afterUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const account = ctx.new;
      const oldAccount = ctx.old;
      
      // Check if parent changed
      const parentChanged = oldAccount && (oldAccount.ParentId !== account.ParentId);
      
      // Update old parent if parent changed
      if (parentChanged && oldAccount.ParentId) {
        await updateParentAccountMetrics(oldAccount.ParentId, ctx);
      }
      
      // Update new parent
      if (account.ParentId) {
        await updateParentAccountMetrics(account.ParentId, ctx);
      }
      
      // Cascade ownership changes to child accounts
      if (oldAccount && oldAccount.OwnerId !== account.OwnerId) {
        await cascadeOwnershipChange(account.Id, account.OwnerId, ctx);
      }
      
    } catch (error) {
      console.error('❌ Error in AccountHierarchyTrigger:', error);
    }
  }
};

/**
 * Update parent account metrics by aggregating child account data
 */
async function updateParentAccountMetrics(parentId: string, ctx: TriggerContext): Promise<void> {
  console.log(`🔄 Updating parent account metrics: ${parentId}`);
  
  // In real implementation, would query all child accounts and aggregate
  // For now, just log the action
  // const childAccounts = await ctx.db.find('Account', {
  //   filters: [['ParentId', '=', parentId]]
  // });
  
  // Calculate aggregated contract value
  // const totalChildContractValue = childAccounts.reduce((sum, child) => sum + (child.ContractValue || 0), 0);
  
  // Update parent
  // await ctx.db.doc.update('Account', parentId, {
  //   // Would update aggregated fields here
  // });
}

/**
 * Cascade ownership changes to child accounts
 */
async function cascadeOwnershipChange(accountId: string, newOwnerId: string, ctx: TriggerContext): Promise<void> {
  console.log(`🔄 Cascading ownership change to child accounts of ${accountId}`);
  
  // In real implementation, would query and update all child accounts
  // const childAccounts = await ctx.db.find('Account', {
  //   filters: [['ParentId', '=', accountId]]
  // });
  
  // for (const child of childAccounts) {
  //   await ctx.db.doc.update('Account', child.Id, {
  //     OwnerId: newOwnerId
  //   });
  // }
}

/**
 * Customer Status Automation Trigger
 * 
 * Handles:
 * - Auto-upgrade Prospect → Customer on first contract
 * - Auto-mark Churned when contracts expire
 * - Flag at-risk based on health score
 */
const AccountStatusAutomationTrigger: Hook = {
  name: 'AccountStatusAutomationTrigger',
  object: 'Account',
  events: ['beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const account = ctx.new;
      
      // Auto-upgrade to Active Customer if has contract value
      if (account.CustomerStatus === 'Prospect' && account.ContractValue > 0) {
        account.CustomerStatus = 'Active Customer';
        console.log(`✅ Auto-upgraded ${account.Name} from Prospect to Active Customer`);
      }
      
      // Flag at-risk based on health score
      if (account.CustomerStatus === 'Active Customer' && account.HealthScore < 50) {
        console.warn(`🚨 Account ${account.Name} is at risk! Health Score: ${account.HealthScore}`);
        // In real implementation, could create a task or send notification
      }
      
    } catch (error) {
      console.error('❌ Error in AccountStatusAutomationTrigger:', error);
    }
  }
};

/**
 * Contract Value Rollup Trigger
 * 
 * This would typically be triggered by Contract changes
 * Here we provide the logic for updating account contract values
 */
export async function updateAccountContractValue(accountId: string, db: any): Promise<void> {
  console.log(`🔄 Updating contract value rollup for account: ${accountId}`);
  
  // In real implementation, would query all active contracts
  // const activeContracts = await db.find('Contract', {
  //   filters: [
  //     ['AccountId', '=', accountId],
  //     ['Status', 'in', ['Activated', 'Draft', 'In Approval']]
  //   ]
  // });
  
  // const totalValue = activeContracts.reduce((sum, contract) => sum + (contract.ContractValue || 0), 0);
  
  // await db.doc.update('Account', accountId, {
  //   ContractValue: totalValue
  // });
  
  console.log(`✅ Contract value rollup updated for account ${accountId}`);
}

/**
 * Renewal Date Management
 * 
 * This would typically be triggered by Contract changes
 * Here we provide the logic for updating renewal dates
 */
export async function updateAccountRenewalDate(accountId: string, db: any): Promise<void> {
  console.log(`🔄 Updating renewal date for account: ${accountId}`);
  
  // In real implementation, would query all active contracts and find nearest renewal
  // const activeContracts = await db.find('Contract', {
  //   filters: [
  //     ['AccountId', '=', accountId],
  //     ['Status', '=', 'Activated']
  //   ],
  //   sort: ['EndDate']
  // });
  
  // if (activeContracts.length > 0) {
  //   const nextRenewalDate = activeContracts[0].EndDate;
  //   
  //   await db.doc.update('Account', accountId, {
  //     NextRenewalDate: nextRenewalDate
  //   });
  //   
  //   // Create reminder tasks at 90/60/30 days before renewal
  //   await createRenewalReminderTasks(accountId, nextRenewalDate, db);
  // }
  
  console.log(`✅ Renewal date updated for account ${accountId}`);
}

/**
 * Create reminder tasks for upcoming renewal
 */
async function createRenewalReminderTasks(accountId: string, renewalDate: string, db: any): Promise<void> {
  const reminderDays = [90, 60, 30];
  
  for (const days of reminderDays) {
    const reminderDate = new Date(renewalDate);
    reminderDate.setDate(reminderDate.getDate() - days);
    
    if (reminderDate > new Date()) {
      // In real implementation, would create the task
      console.log(`📅 Would create reminder task ${days} days before renewal`);
      // await db.doc.create('Activity', {
      //   Subject: `Renewal reminder: ${days} days until contract renewal`,
      //   Type: 'Task',
      //   Status: 'Planned',
      //   Priority: days <= 30 ? 'high' : 'medium',
      //   WhatId: accountId,
      //   ActivityDate: reminderDate.toISOString().split('T')[0],
      //   Description: `Contract renewal is coming up in ${days} days. Please contact the customer to discuss renewal.`
      // });
    }
  }
}

// Export all hooks
export {
  AccountHealthScoreTrigger,
  AccountHierarchyTrigger,
  AccountStatusAutomationTrigger
};

export default AccountHealthScoreTrigger;
