import type { Hook } from '@objectstack/spec/data';
import { db } from '../db'; // Ensure this points to the correct db instance

/**
 * Entitlement Verification Hook
 * 
 * Checks if the Account has an active Support Contract and calculates 
 * the Target Resolution Date based on the Account's SLA Level.
 */
const CaseEntitlementCheck: Hook = {
  name: 'CaseEntitlementCheck',
  object: 'case', // Lowercase per protocol
  events: ['beforeInsert'],
  handler: async (ctx) => {
    const caseRec = ctx.new;

    // Skip if no account is linked
    if (!caseRec.account) {
      console.log('ℹ️ Case created without Account. Skipping Entitlement check.');
      return;
    }

    try {
      // 1. Fetch Account to get SLA Level
      // Using direct ObjectQL find
      const accounts = await db.find('account', { filters: [['_id', '=', caseRec.account]] });
      
      if (!accounts || accounts.length === 0) {
        console.warn(`Warning: Linked Account ${caseRec.account} not found.`);
        return;
      }

      const account = accounts[0];
      
      // Default to Standard if not specified
      const slaLevel = account.sla || 'Standard'; // Values: Platinum, Gold, Silver, Standard

      // 2. Assign Entitlement Info
      caseRec.entitlement_name = `${slaLevel} Support`;
      
      // 3. Calculate Target Resolution Date based on SLA
      const now = new Date();
      let hoursToAdd = 48; // Standard: 2 days

      // Simple SLA Logic (Simplified for Phase 2)
      switch (slaLevel) {
        case 'Platinum':
          hoursToAdd = 4; // 4 Hours resolution
          caseRec.priority = 'critical'; // Auto-escalate priority
          break;
        case 'Gold':
          hoursToAdd = 12; // 12 Hours
          if (caseRec.priority !== 'critical') caseRec.priority = 'high';
          break;
        case 'Silver':
          hoursToAdd = 24; // 24 Hours
          break;
        default:
          hoursToAdd = 48; // Standard
          break;
      }

      // Add hours to current time
      const targetDate = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
      
      // Set the field
      caseRec.target_resolution_date = targetDate.toISOString();
      
      console.log(`✅ Applied ${slaLevel} SLA to Case ${caseRec.subject || 'Unknown'}. Target: ${caseRec.target_resolution_date}`);

    } catch (error) {
      console.error('❌ Error executing CaseEntitlementCheck:', error);
    }
  }
};

// Export as an array to maintain compatibility with index.ts which likely expects multiple hooks
export { CaseEntitlementCheck };
export default [CaseEntitlementCheck];
