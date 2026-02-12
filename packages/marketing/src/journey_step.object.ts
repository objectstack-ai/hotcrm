import { ObjectSchema, Field } from '@objectstack/spec/data';

export const JourneyStep = ObjectSchema.create({
  name: 'journey_step',
  label: 'Journey Step',
  pluralLabel: 'Journey Steps',
  icon: 'shoe-prints',
  description: 'Individual steps within a customer journey',

  fields: {
    journey_id: Field.masterDetail('journey', { label: 'Journey', required: true }),
    name: Field.text({ label: 'Step Name', required: true, maxLength: 255 }),
    step_type: Field.select({
      label: 'Step Type', required: true,
      options: [
        { label: '📧 Send Email', value: 'send_email' },
        { label: '⏱️ Wait', value: 'wait' },
        { label: '🔀 Decision Split', value: 'decision_split' },
        { label: '🎯 Update Record', value: 'update_record' },
        { label: '📱 Send SMS', value: 'send_sms' },
        { label: '🔔 Send Notification', value: 'send_notification' },
        { label: '📋 Add to List', value: 'add_to_list' },
        { label: '🏷️ Add Tag', value: 'add_tag' },
        { label: '🤖 AI Decision', value: 'ai_decision' },
        { label: '🔗 Webhook', value: 'webhook' }
      ]
    }),
    step_order: Field.number({ label: 'Step Order', required: true, precision: 0 }),
    config: Field.textarea({ label: 'Step Configuration', maxLength: 8000, description: 'JSON configuration for this step' }),
    wait_duration_hours: Field.number({ label: 'Wait Duration (Hours)', precision: 0, description: 'Hours to wait (for wait steps)' }),
    email_template_id: Field.lookup('email_template', { label: 'Email Template', description: 'Template for email steps' }),
    decision_criteria: Field.textarea({ label: 'Decision Criteria', maxLength: 4000, description: 'JSON criteria for decision splits' }),
    true_next_step: Field.number({ label: 'True Branch Next Step', precision: 0 }),
    false_next_step: Field.number({ label: 'False Branch Next Step', precision: 0 }),
    contacts_processed: Field.number({ label: 'Contacts Processed', readonly: true, precision: 0, defaultValue: 0 }),
    contacts_in_step: Field.number({ label: 'Contacts In Step', readonly: true, precision: 0, defaultValue: 0 }),
    success_rate: Field.percent({ label: 'Success Rate', readonly: true }),
    is_active: Field.boolean({ label: 'Active', defaultValue: true })
  },

  enable: { searchable: true, trackHistory: true, feeds: false, files: false },
});
