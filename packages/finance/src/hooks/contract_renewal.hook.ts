import type { Hook, HookContext } from '@objectstack/spec/data';

const RENEWAL_WINDOW_DAYS = 90;
const ALERT_WINDOW_DAYS = 30;

const ContractRenewalCheck: Hook = {
  name: 'ContractRenewalCheck',
  object: 'contract',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const newDoc = ctx.result as Record<string, any>;
    const oldDoc = ctx.previous as Record<string, any> | undefined;

    const isActivated = newDoc.status === 'Activated' && oldDoc?.status !== 'Activated';
    const endDateChanged = newDoc.end_date !== oldDoc?.end_date && newDoc.status === 'Activated';

    if (!isActivated && !endDateChanged) return;
    if (!newDoc.end_date) return;

    try {
      const endDate = new Date(newDoc.end_date);
      const now = new Date();
      const daysUntilExpiry = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry > RENEWAL_WINDOW_DAYS) return;

      console.log(`🔄 Contract ${newDoc.contract_number} expires in ${daysUntilExpiry} days — creating renewal opportunity`);

      // Check if a renewal opportunity already exists for this contract
      const existing = await (ctx.ql as any).find('opportunity', {
        filters: [
          ['source_contract', '=', newDoc._id],
          ['type', '=', 'Renewal']
        ]
      });

      if (existing && existing.length > 0) {
        console.log(`ℹ️ Renewal opportunity already exists for Contract ${newDoc.contract_number}`);
        return;
      }

      // Close date is 30 days before contract end
      const closeDate = new Date(endDate);
      closeDate.setDate(closeDate.getDate() - 30);

      const opportunity = await (ctx.ql as any).doc.create('opportunity', {
        name: `Renewal: ${newDoc.contract_number}`,
        account: newDoc.account,
        source_contract: newDoc._id,
        type: 'Renewal',
        stage: 'Prospecting',
        amount: newDoc.contract_value,
        close_date: closeDate.toISOString()
      });

      console.log(`✅ Created renewal opportunity ${opportunity.name} for Contract ${newDoc.contract_number}`);

      // Create a task for the account owner to initiate renewal conversation
      await (ctx.ql as any).doc.create('task', {
        subject: `Initiate renewal for Contract ${newDoc.contract_number}`,
        description: `Contract ${newDoc.contract_number} expires on ${endDate.toISOString().split('T')[0]}. Please reach out to the customer to discuss renewal.`,
        related_to: newDoc.account,
        opportunity: opportunity._id,
        status: 'Open',
        priority: daysUntilExpiry <= ALERT_WINDOW_DAYS ? 'High' : 'Normal',
        due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      console.log(`✅ Created renewal task for account owner — Contract ${newDoc.contract_number}`);

    } catch (err) {
      console.error('❌ Contract Renewal Check Error:', err);
    }
  }
};

const ContractExpirationAlert: Hook = {
  name: 'ContractExpirationAlert',
  object: 'contract',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const newDoc = ctx.result as Record<string, any>;
    const oldDoc = ctx.previous as Record<string, any> | undefined;

    if (newDoc.status !== 'Activated') return;
    if (newDoc.renewal_reminder_sent) return;
    if (!newDoc.end_date) return;

    const endDateChanged = newDoc.end_date !== oldDoc?.end_date;
    const statusChanged = newDoc.status !== oldDoc?.status;
    if (!endDateChanged && !statusChanged) return;

    try {
      const endDate = new Date(newDoc.end_date);
      const now = new Date();
      const daysUntilExpiry = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry > ALERT_WINDOW_DAYS) return;

      console.log(`⚠️ Contract ${newDoc.contract_number} expires in ${daysUntilExpiry} days — sending expiration alert`);

      // Log urgent renewal activity
      await (ctx.ql as any).doc.create('activity', {
        type: 'Alert',
        subject: `Urgent: Contract ${newDoc.contract_number} expiring in ${daysUntilExpiry} days`,
        description: `Contract ${newDoc.contract_number} with value ${newDoc.contract_value} is expiring on ${endDate.toISOString().split('T')[0]}. Immediate action required for renewal.`,
        related_to: newDoc.account,
        contract: newDoc._id,
        priority: 'High',
        status: 'Open'
      });

      // Flag contract so we don't send duplicate reminders
      await (ctx.ql as any).doc.update('contract', newDoc._id, {
        renewal_reminder_sent: true
      });

      console.log(`✅ Expiration alert sent and flag set for Contract ${newDoc.contract_number}`);

    } catch (err) {
      console.error('❌ Contract Expiration Alert Error:', err);
    }
  }
};

export { ContractRenewalCheck, ContractExpirationAlert };
export default [ContractRenewalCheck, ContractExpirationAlert] as Hook[];
