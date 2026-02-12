// State machine configuration for opportunity lifecycle
import { StateMachineSchema, type StateMachineConfig } from '@objectstack/spec/automation';

/**
 * Opportunity Lifecycle State Machine
 * Manages the sales pipeline stages from prospecting to close
 */
export const OpportunityLifecycleStateMachine = {
  name: 'opportunity_lifecycle',
  label: 'Opportunity Lifecycle State Machine',
  object: 'opportunity',
  description: 'Manages opportunity stages through the sales pipeline from prospecting to close',

  initial: 'prospecting',

  states: [
    {
      name: 'prospecting',
      label: 'Prospecting',
      description: 'Initial stage - identifying and researching the opportunity',
      probability: 10,
      onEntry: [
        { type: 'fieldUpdate', field: 'stage', value: 'prospecting' },
        { type: 'fieldUpdate', field: 'probability', value: 10 },
      ],
      transitions: [
        {
          to: 'qualification',
          event: 'qualify',
          description: 'Move to qualification after initial interest confirmed',
          actions: [
            { type: 'fieldUpdate', field: 'qualification_date', value: 'NOW()' },
          ],
        },
        {
          to: 'closed_lost',
          event: 'lose',
          description: 'Opportunity lost during prospecting',
        },
      ],
    },
    {
      name: 'qualification',
      label: 'Qualification',
      description: 'Validating budget, authority, need, and timeline (BANT)',
      probability: 25,
      onEntry: [
        { type: 'fieldUpdate', field: 'stage', value: 'qualification' },
        { type: 'fieldUpdate', field: 'probability', value: 25 },
        {
          type: 'taskCreation',
          subject: 'Complete BANT qualification: ${name}',
          assignee: '${owner.id}',
          dueDate: 'TODAY() + 7',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'needs_analysis',
          event: 'analyze_needs',
          guard: 'budget_confirmed = true AND decision_maker_identified = true',
          description: 'Budget and decision-maker confirmed, proceed to needs analysis',
        },
        {
          to: 'closed_lost',
          event: 'lose',
          description: 'Failed qualification criteria',
        },
      ],
    },
    {
      name: 'needs_analysis',
      label: 'Needs Analysis',
      description: 'Deep-dive into customer requirements and pain points',
      probability: 50,
      onEntry: [
        { type: 'fieldUpdate', field: 'stage', value: 'needs_analysis' },
        { type: 'fieldUpdate', field: 'probability', value: 50 },
      ],
      transitions: [
        {
          to: 'proposal',
          event: 'propose',
          guard: 'requirements_documented = true',
          description: 'Requirements gathered, prepare proposal',
          actions: [
            {
              type: 'emailAlert',
              template: 'proposal_preparation_reminder',
              recipients: ['${owner.email}'],
            },
          ],
        },
        {
          to: 'qualification',
          event: 'requalify',
          description: 'Need to re-validate qualification criteria',
        },
        {
          to: 'closed_lost',
          event: 'lose',
          description: 'Opportunity lost during needs analysis',
        },
      ],
    },
    {
      name: 'proposal',
      label: 'Proposal / Price Quote',
      description: 'Formal proposal and pricing have been presented to the prospect',
      probability: 65,
      onEntry: [
        { type: 'fieldUpdate', field: 'stage', value: 'proposal' },
        { type: 'fieldUpdate', field: 'probability', value: 65 },
        { type: 'fieldUpdate', field: 'proposal_date', value: 'NOW()' },
      ],
      transitions: [
        {
          to: 'negotiation',
          event: 'negotiate',
          description: 'Customer engaged, entering negotiation phase',
        },
        {
          to: 'needs_analysis',
          event: 'revise_requirements',
          description: 'Customer requires scope changes',
        },
        {
          to: 'closed_lost',
          event: 'lose',
          description: 'Proposal rejected',
        },
      ],
    },
    {
      name: 'negotiation',
      label: 'Negotiation / Review',
      description: 'Final negotiations on terms, pricing, and contract details',
      probability: 80,
      onEntry: [
        { type: 'fieldUpdate', field: 'stage', value: 'negotiation' },
        { type: 'fieldUpdate', field: 'probability', value: 80 },
        {
          type: 'emailAlert',
          template: 'deal_in_negotiation',
          recipients: ['${owner.email}', '${owner.manager.email}'],
        },
      ],
      transitions: [
        {
          to: 'closed_won',
          event: 'win',
          guard: 'contract_signed = true',
          description: 'Deal closed successfully',
          actions: [
            { type: 'fieldUpdate', field: 'close_date', value: 'NOW()' },
          ],
        },
        {
          to: 'proposal',
          event: 'revise_proposal',
          description: 'Need to revise proposal terms',
        },
        {
          to: 'closed_lost',
          event: 'lose',
          description: 'Deal lost during negotiations',
        },
      ],
    },
    {
      name: 'closed_won',
      label: 'Closed Won',
      description: 'Deal has been won and contract signed',
      probability: 100,
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'stage', value: 'closed_won' },
        { type: 'fieldUpdate', field: 'probability', value: 100 },
        { type: 'fieldUpdate', field: 'is_won', value: true },
        { type: 'fieldUpdate', field: 'is_closed', value: true },
        {
          type: 'emailAlert',
          template: 'deal_won_celebration',
          recipients: ['${owner.email}', '${owner.manager.email}', 'sales-wins@company.com'],
        },
      ],
    },
    {
      name: 'closed_lost',
      label: 'Closed Lost',
      description: 'Deal has been lost',
      probability: 0,
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'stage', value: 'closed_lost' },
        { type: 'fieldUpdate', field: 'probability', value: 0 },
        { type: 'fieldUpdate', field: 'is_closed', value: true },
        { type: 'fieldUpdate', field: 'lost_date', value: 'NOW()' },
      ],
      transitions: [
        {
          to: 'prospecting',
          event: 'reopen',
          guard: 'DAYS_BETWEEN(lost_date, NOW()) <= 180',
          description: 'Reopen a lost opportunity within 6 months',
        },
      ],
    },
  ],

  globalGuards: {
    hasOwner: 'owner != NULL',
    isNotClosed: 'is_closed != true',
    hasAmount: 'amount > 0',
  },

  events: {
    qualify: 'Move to qualification stage',
    analyze_needs: 'Begin needs analysis',
    propose: 'Present proposal to customer',
    negotiate: 'Enter negotiation phase',
    win: 'Close deal as won',
    lose: 'Close deal as lost',
    requalify: 'Return to qualification',
    revise_requirements: 'Revise scope and requirements',
    revise_proposal: 'Revise proposal terms',
    reopen: 'Reopen a closed opportunity',
  },
};

// Spec-validated state machine definition
export const ValidatedOpportunityLifecycleStateMachine = StateMachineSchema.parse({
  id: 'opportunity_lifecycle',
  initial: 'prospecting',
  states: {
    prospecting: { type: 'atomic' },
    qualification: { type: 'atomic' },
    needs_analysis: { type: 'atomic' },
    proposal: { type: 'atomic' },
    negotiation: { type: 'atomic' },
    closed_won: { type: 'final' },
    closed_lost: { type: 'final' },
  },
} satisfies StateMachineConfig);

export default OpportunityLifecycleStateMachine;
