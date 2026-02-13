import type { Action } from '@objectstack/spec/ui';
import { ActionSchema } from '@objectstack/spec/ui';

/**
 * CRM Quick Actions
 * Log a Call, Convert Lead, Create Follow-up Task, Send Quote
 */

export const LogACallAction = {
  name: 'log_a_call',
  label: 'Log a Call',
  icon: 'phone',
  type: 'modal' as const,
  locations: ['record_header' as const, 'list_item' as const],
  params: [
    { name: 'subject', label: 'Subject', type: 'text' as const, required: true },
    { name: 'description', label: 'Notes', type: 'textarea' as const },
    { name: 'duration_minutes', label: 'Duration (min)', type: 'number' as const },
    { name: 'call_result', label: 'Result', type: 'select' as const, options: [{ label: 'Connected', value: 'connected' }, { label: 'Left Voicemail', value: 'left_voicemail' }, { label: 'No Answer', value: 'no_answer' }, { label: 'Busy', value: 'busy' }] }
  ],
  variant: 'secondary' as const,
  successMessage: 'Call logged successfully'
} satisfies Action;

export const ConvertLeadAction = {
  name: 'convert_lead',
  label: 'Convert Lead',
  icon: 'user-check',
  type: 'modal' as const,
  locations: ['record_header' as const],
  params: [
    { name: 'create_account', label: 'Create Account', type: 'boolean' as const, required: true },
    { name: 'create_opportunity', label: 'Create Opportunity', type: 'boolean' as const },
    { name: 'opportunity_name', label: 'Opportunity Name', type: 'text' as const }
  ],
  variant: 'primary' as const,
  confirmText: 'Are you sure you want to convert this lead?',
  successMessage: 'Lead converted successfully'
} satisfies Action;

export const CreateFollowUpTaskAction = {
  name: 'create_follow_up_task',
  label: 'Create Follow-up Task',
  icon: 'calendar-plus',
  type: 'modal' as const,
  locations: ['record_header' as const, 'record_more' as const],
  params: [
    { name: 'subject', label: 'Task Subject', type: 'text' as const, required: true },
    { name: 'due_date', label: 'Due Date', type: 'date' as const, required: true },
    { name: 'priority', label: 'Priority', type: 'select' as const, options: [{ label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' }] },
    { name: 'description', label: 'Description', type: 'textarea' as const }
  ],
  variant: 'secondary' as const,
  successMessage: 'Follow-up task created'
} satisfies Action;

export const SendQuoteAction = {
  name: 'send_quote',
  label: 'Send Quote',
  icon: 'file-text',
  type: 'modal' as const,
  locations: ['record_header' as const],
  params: [
    { name: 'recipient_email', label: 'Recipient Email', type: 'email' as const, required: true },
    { name: 'message', label: 'Message', type: 'textarea' as const },
    { name: 'include_terms', label: 'Include Terms & Conditions', type: 'boolean' as const }
  ],
  variant: 'primary' as const,
  confirmText: 'Send this quote to the customer?',
  successMessage: 'Quote sent successfully'
} satisfies Action;

ActionSchema.parse(LogACallAction);
ActionSchema.parse(ConvertLeadAction);
ActionSchema.parse(CreateFollowUpTaskAction);
ActionSchema.parse(SendQuoteAction);

export const CrmActions = {
  logACall: LogACallAction,
  convertLead: ConvertLeadAction,
  createFollowUpTask: CreateFollowUpTaskAction,
  sendQuote: SendQuoteAction
};

export default CrmActions;
