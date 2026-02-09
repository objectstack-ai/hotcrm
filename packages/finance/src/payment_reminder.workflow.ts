// Workflow rules for Payment reminder automation

/**
 * Invoice Payment Reminder Workflow
 * Scheduled daily - when invoice is overdue and status is 'Sent', send reminder email
 */
export const InvoicePaymentReminder = {
  name: 'invoice_payment_reminder',
  label: 'Overdue Invoice Reminder',
  object: 'invoice',
  description: 'Send payment reminder emails for overdue invoices',

  // Trigger: Scheduled daily
  triggerType: 'scheduled',
  schedule: {
    frequency: 'daily',
    time: '09:00',
    timezone: 'UTC'
  },

  // Condition: Invoice is overdue and still in Sent status
  condition: 'due_date < TODAY() AND status = "Sent"',

  // Actions to execute
  actions: [
    // 1. Send payment reminder email to account
    {
      type: 'emailAlert',
      template: 'invoice_payment_reminder',
      recipients: ['${account.billing_email}'],
      cc: ['${created_by}'],
      description: 'Send overdue payment reminder to the customer'
    },

    // 2. Log reminder activity
    {
      type: 'customAction',
      handler: 'logPaymentReminder',
      parameters: {
        invoice_id: '${id}',
        invoice_number: '${invoice_number}',
        account_id: '${account}',
        days_overdue: 'DAYS_BETWEEN(due_date, TODAY())'
      }
    },

    // 3. Post to Slack finance channel
    {
      type: 'httpCall',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        text: '💰 Payment Reminder Sent',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Invoice Payment Reminder Sent*\n\n*Invoice:* ${invoice_number}\n*Account:* ${account.name}\n*Amount:* ${total_amount}\n*Due Date:* ${due_date}\n*Days Overdue:* ${DAYS_BETWEEN(due_date, TODAY())}'
            }
          }
        ]
      }
    }
  ],

  executionOrder: 1,
  active: true
};

/**
 * Invoice Overdue Escalation Workflow
 * When invoice is 30+ days overdue, escalate to finance manager
 */
export const InvoiceOverdueEscalation = {
  name: 'invoice_overdue_escalation',
  label: 'Overdue Invoice Escalation',
  object: 'invoice',
  description: 'Escalate invoices that are 30+ days overdue to the finance manager',

  // Trigger: Scheduled daily
  triggerType: 'scheduled',
  schedule: {
    frequency: 'daily',
    time: '10:00',
    timezone: 'UTC'
  },

  // Condition: Invoice is 30+ days overdue and still unpaid
  condition: 'due_date < TODAY() - 30 AND status = "Sent"',

  actions: [
    // 1. Update status to Overdue
    {
      type: 'fieldUpdate',
      field: 'status',
      value: 'Overdue'
    },

    // 2. Send escalation email to finance manager
    {
      type: 'emailAlert',
      template: 'invoice_overdue_escalation',
      recipients: ['${created_by}', '${created_by.manager_email}'],
      description: 'Escalate severely overdue invoice to finance manager'
    },

    // 3. Create collection task
    {
      type: 'taskCreation',
      subject: 'Collections: Invoice ${invoice_number} is 30+ days overdue',
      description: 'Invoice ${invoice_number} for account ${account.name} is over 30 days past due.\nAmount: ${total_amount}\nDue Date: ${due_date}\nPlease initiate collection procedures.',
      assignee: '${created_by.manager_id}',
      dueDate: 'TODAY() + 3',
      priority: 'High',
      status: 'Not Started'
    },

    // 4. Post to Slack
    {
      type: 'httpCall',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        text: '🚨 Invoice Overdue Escalation',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Invoice Overdue - Escalated*\n\n*Invoice:* ${invoice_number}\n*Account:* ${account.name}\n*Amount:* ${total_amount}\n*Days Overdue:* ${DAYS_BETWEEN(due_date, TODAY())}'
            }
          }
        ]
      }
    }
  ],

  executionOrder: 2,
  active: true
};

/**
 * Payment Confirmation Workflow
 * When payment is received (status changes to 'Paid'), send confirmation email
 */
export const PaymentConfirmation = {
  name: 'payment_confirmation',
  label: 'Payment Received Confirmation',
  object: 'payment',
  description: 'Send confirmation email when a payment is received',

  // Trigger: When payment is updated
  triggerType: 'onUpdate',

  // Condition: Status changed to Paid
  condition: 'status = "Paid" AND ISCHANGED(status)',

  actions: [
    // 1. Send payment confirmation to customer
    {
      type: 'emailAlert',
      template: 'payment_confirmation',
      recipients: ['${account.billing_email}'],
      cc: ['${created_by}'],
      description: 'Send payment receipt and confirmation to the customer'
    },

    // 2. Update related invoice status
    {
      type: 'customAction',
      handler: 'reconcileInvoicePayment',
      parameters: {
        payment_id: '${id}',
        payment_number: '${payment_number}',
        invoice_number: '${invoice_number}',
        received_amount: '${received_amount}'
      }
    },

    // 3. Post to Slack finance channel
    {
      type: 'httpCall',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        text: '✅ Payment Received',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Payment Received*\n\n*Payment:* ${payment_number}\n*Account:* ${account.name}\n*Amount:* ${received_amount}\n*Method:* ${payment_method}\n*Invoice:* ${invoice_number}'
            }
          }
        ]
      }
    }
  ],

  executionOrder: 3,
  active: true
};

/**
 * Contract Renewal Reminder Workflow
 * Scheduled weekly - when contract end_date is within 90 days, create renewal task
 */
export const ContractRenewalReminder = {
  name: 'contract_renewal_reminder',
  label: 'Contract Renewal Reminder',
  object: 'contract',
  description: 'Create renewal tasks for contracts expiring within 90 days',

  // Trigger: Scheduled weekly
  triggerType: 'scheduled',
  schedule: {
    frequency: 'weekly',
    day: 'Monday',
    time: '08:00',
    timezone: 'UTC'
  },

  // Condition: Contract is active and end_date is within 90 days
  condition: 'status = "Active" AND end_date <= TODAY() + 90 AND end_date >= TODAY()',

  actions: [
    // 1. Create renewal task
    {
      type: 'taskCreation',
      subject: 'Contract renewal due: ${contract_number} - ${account.name}',
      description: 'Contract ${contract_number} for ${account.name} expires on ${end_date}.\nContract Value: ${contract_value}\nPlease initiate renewal discussions with the customer.',
      assignee: '${created_by}',
      dueDate: '${end_date} - 30',
      priority: 'High',
      status: 'Not Started'
    },

    // 2. Notify account owner
    {
      type: 'emailAlert',
      template: 'contract_renewal_reminder',
      recipients: ['${created_by}'],
      cc: ['${account.owner_id}'],
      description: 'Remind account team of upcoming contract renewal'
    },

    // 3. Post to Slack
    {
      type: 'httpCall',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        text: '📋 Contract Renewal Reminder',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Contract Renewal Due*\n\n*Contract:* ${contract_number}\n*Account:* ${account.name}\n*Value:* ${contract_value}\n*Expires:* ${end_date}\n*Days Remaining:* ${DAYS_BETWEEN(TODAY(), end_date)}'
            }
          }
        ]
      }
    }
  ],

  executionOrder: 4,
  active: true
};

export const PaymentReminderWorkflows = {
  invoicePaymentReminder: InvoicePaymentReminder,
  invoiceOverdueEscalation: InvoiceOverdueEscalation,
  paymentConfirmation: PaymentConfirmation,
  contractRenewalReminder: ContractRenewalReminder
};

export default PaymentReminderWorkflows;
