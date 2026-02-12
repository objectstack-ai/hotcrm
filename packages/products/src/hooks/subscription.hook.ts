import type { Hook, HookContext } from '@objectstack/spec/data';

const SubscriptionValidationTrigger: Hook = {
  name: 'SubscriptionValidationTrigger',
  object: 'subscription',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    try {
      // Validate start_date < end_date
      if (doc.start_date && doc.end_date) {
        const startDate = new Date(doc.start_date);
        const endDate = new Date(doc.end_date);

        if (startDate >= endDate) {
          throw new Error('Start date must be before end date');
        }
      }

      // Calculate MRR based on quantity, unit_price, discount, and billing frequency
      if (doc.unit_price !== undefined && doc.quantity !== undefined) {
        const quantity = doc.quantity || 1;
        const unitPrice = doc.unit_price || 0;
        const discount = doc.discount_percent || 0;
        const netPrice = unitPrice * quantity * (1 - discount / 100);

        const billingFrequency = doc.billing_frequency || 'monthly';
        let mrr: number;
        switch (billingFrequency) {
          case 'quarterly':
            mrr = netPrice / 3;
            break;
          case 'semi_annually':
            mrr = netPrice / 6;
            break;
          case 'annually':
            mrr = netPrice / 12;
            break;
          default: // monthly
            mrr = netPrice;
        }

        doc.mrr = Math.round(mrr * 100) / 100;
        doc.arr = Math.round(doc.mrr * 12 * 100) / 100;
      }

      // Calculate total_contract_value
      if (doc.mrr !== undefined && doc.term_months) {
        doc.total_contract_value = Math.round(doc.mrr * doc.term_months * 100) / 100;
      }

      // Calculate days_until_renewal
      if (doc.end_date) {
        const now = new Date();
        const endDate = new Date(doc.end_date);
        const diffMs = endDate.getTime() - now.getTime();
        doc.days_until_renewal = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 0);
      }

      console.log(`✅ Subscription validated: MRR=${doc.mrr}, ARR=${doc.arr}, TCV=${doc.total_contract_value}, days_until_renewal=${doc.days_until_renewal}`);
    } catch (err) {
      console.error('❌ Subscription Validation Error:', err);
      throw err;
    }
  }
};

const SubscriptionRenewalReminderTrigger: Hook = {
  name: 'SubscriptionRenewalReminderTrigger',
  object: 'subscription',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    const oldDoc = ctx.previous as Record<string, any> | undefined;

    if (!oldDoc || doc.status === oldDoc.status) return;
    if (doc.status !== 'pending_renewal') return;

    try {
      console.log(`🔔 Subscription renewal reminder: "${doc.name}" is now pending renewal. End date: ${doc.end_date}, auto_renew: ${doc.auto_renew}`);
    } catch (err) {
      console.error('❌ Subscription Renewal Reminder Error:', err);
    }
  }
};

export { SubscriptionValidationTrigger, SubscriptionRenewalReminderTrigger };
export default [SubscriptionValidationTrigger, SubscriptionRenewalReminderTrigger] as Hook[];
