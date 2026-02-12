// State machine configuration for lead lifecycle
import { StateMachineSchema, type StateMachineConfig } from '@objectstack/spec/automation';

/**
 * Lead Lifecycle State Machine
 * Manages the complete lifecycle of leads from creation to conversion or disqualification
 */
export const LeadLifecycleStateMachine = {
  name: 'lead_lifecycle',
  label: 'Lead Lifecycle State Machine',
  object: 'lead',
  description: 'Manages lead states from initial capture through qualification to conversion or disqualification',

  initial: 'new',

  states: [
    {
      name: 'new',
      label: 'New',
      description: 'Lead has been captured but not yet contacted',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'new' },
        { type: 'fieldUpdate', field: 'created_date', value: 'NOW()' },
        {
          type: 'emailAlert',
          template: 'new_lead_notification',
          recipients: ['${owner.email}'],
        },
      ],
      transitions: [
        {
          to: 'contacted',
          event: 'contact',
          guard: 'owner != NULL',
          description: 'First outreach to lead has been made',
          actions: [
            { type: 'fieldUpdate', field: 'first_contact_date', value: 'NOW()' },
          ],
        },
        {
          to: 'unqualified',
          event: 'disqualify',
          description: 'Lead does not meet basic qualification criteria',
          actions: [
            { type: 'fieldUpdate', field: 'disqualified_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'contacted',
      label: 'Contacted',
      description: 'Initial outreach has been made, awaiting response or follow-up',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'contacted' },
      ],
      transitions: [
        {
          to: 'working',
          event: 'engage',
          description: 'Lead has responded and engagement is in progress',
        },
        {
          to: 'unqualified',
          event: 'disqualify',
          description: 'Lead unresponsive or not a fit',
        },
        {
          to: 'new',
          event: 'reset',
          guard: 'contact_attempts < 3',
          description: 'Re-queue for another contact attempt',
        },
      ],
    },
    {
      name: 'working',
      label: 'Working',
      description: 'Active engagement with the lead, gathering qualification data',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'working' },
        {
          type: 'taskCreation',
          subject: 'Qualify lead: ${name}',
          assignee: '${owner.id}',
          dueDate: 'TODAY() + 5',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'qualified',
          event: 'qualify',
          guard: 'lead_score >= 60 AND budget_confirmed = true',
          description: 'Lead meets qualification criteria (BANT)',
          actions: [
            { type: 'fieldUpdate', field: 'qualified_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'lead_qualified_notification',
              recipients: ['${owner.email}', '${owner.manager.email}'],
            },
          ],
        },
        {
          to: 'unqualified',
          event: 'disqualify',
          description: 'Lead does not meet qualification criteria',
        },
      ],
    },
    {
      name: 'qualified',
      label: 'Qualified',
      description: 'Lead has been qualified and is ready for conversion to opportunity',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'qualified' },
        { type: 'fieldUpdate', field: 'rating', value: 'Hot' },
      ],
      transitions: [
        {
          to: 'converted',
          event: 'convert',
          description: 'Convert lead to account, contact, and opportunity',
          actions: [
            { type: 'fieldUpdate', field: 'converted_date', value: 'NOW()' },
            { type: 'fieldUpdate', field: 'is_converted', value: true },
          ],
        },
        {
          to: 'working',
          event: 'rework',
          description: 'Need more qualification data',
        },
      ],
    },
    {
      name: 'converted',
      label: 'Converted',
      description: 'Lead has been converted to an account, contact, and opportunity',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'converted' },
      ],
    },
    {
      name: 'unqualified',
      label: 'Unqualified',
      description: 'Lead has been disqualified and will not be pursued',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'unqualified' },
        { type: 'fieldUpdate', field: 'disqualified_date', value: 'NOW()' },
      ],
      transitions: [
        {
          to: 'new',
          event: 'reopen',
          guard: 'DAYS_BETWEEN(disqualified_date, NOW()) <= 90',
          description: 'Reopen a previously disqualified lead',
        },
      ],
    },
  ],

  globalGuards: {
    hasOwner: 'owner != NULL',
    isNotConverted: 'status != "converted"',
    isNotDisqualified: 'status != "unqualified"',
  },

  events: {
    contact: 'Make first contact with lead',
    engage: 'Begin active engagement with lead',
    qualify: 'Mark lead as qualified',
    convert: 'Convert lead to opportunity',
    disqualify: 'Disqualify lead',
    rework: 'Send back for more qualification',
    reset: 'Reset to new for re-contact',
    reopen: 'Reopen a disqualified lead',
  },
};

// Spec-validated state machine definition
export const ValidatedLeadLifecycleStateMachine = StateMachineSchema.parse({
  id: 'lead_lifecycle',
  initial: 'new',
  states: {
    new: { type: 'atomic' },
    contacted: { type: 'atomic' },
    working: { type: 'atomic' },
    qualified: { type: 'atomic' },
    converted: { type: 'final' },
    unqualified: { type: 'final' },
  },
} satisfies StateMachineConfig);

export default LeadLifecycleStateMachine;
