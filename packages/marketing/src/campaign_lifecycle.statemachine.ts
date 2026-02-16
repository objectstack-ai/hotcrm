// State machine configuration for campaign lifecycle
import { StateMachineSchema, type StateMachineConfig } from '@objectstack/spec/automation';

/**
 * Campaign Lifecycle State Machine
 * Manages the complete lifecycle of marketing campaigns from drafting through analysis.
 */
export const CampaignLifecycleStateMachine = {
  name: 'campaign_lifecycle',
  label: 'Campaign Lifecycle State Machine',
  object: 'campaign',
  description: 'Manages campaign states from initial draft through planning, active execution, completion, and post-campaign analysis',

  initial: 'draft',

  states: [
    {
      name: 'draft',
      label: 'Draft',
      description: 'Campaign is being defined and content is being created',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'draft' },
        { type: 'fieldUpdate', field: 'created_date', value: 'NOW()' },
      ],
      transitions: [
        {
          to: 'planned',
          event: 'plan',
          guard: 'name != NULL AND type != NULL AND budgeted_cost > 0',
          description: 'Campaign details finalized and ready for scheduling',
          actions: [
            { type: 'fieldUpdate', field: 'planned_date', value: 'NOW()' },
          ],
        },
      ],
    },
    {
      name: 'planned',
      label: 'Planned',
      description: 'Campaign has been planned and scheduled but not yet launched',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'planned' },
        {
          type: 'taskCreation',
          subject: 'Review campaign before launch: ${name}',
          assignee: '${owner.id}',
          dueDate: 'TODAY() + 3',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'active',
          event: 'launch',
          guard: 'start_date != NULL AND end_date != NULL',
          description: 'Launch the campaign',
          actions: [
            { type: 'fieldUpdate', field: 'is_active', value: true },
            {
              type: 'emailAlert',
              template: 'campaign_launched_notification',
              recipients: ['${owner.email}'],
            },
          ],
        },
        {
          to: 'draft',
          event: 'revise',
          description: 'Send back to draft for revisions',
        },
      ],
    },
    {
      name: 'active',
      label: 'Active',
      description: 'Campaign is currently running and engaging the target audience',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'active' },
      ],
      transitions: [
        {
          to: 'completed',
          event: 'complete',
          description: 'Campaign has finished running',
          actions: [
            { type: 'fieldUpdate', field: 'is_active', value: false },
            { type: 'fieldUpdate', field: 'end_date', value: 'NOW()' },
          ],
        },
        {
          to: 'planned',
          event: 'pause',
          description: 'Pause the campaign and return to planned state',
          actions: [
            { type: 'fieldUpdate', field: 'is_active', value: false },
          ],
        },
      ],
    },
    {
      name: 'completed',
      label: 'Completed',
      description: 'Campaign has finished running and is pending analysis',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'completed' },
        {
          type: 'taskCreation',
          subject: 'Analyze campaign results: ${name}',
          assignee: '${owner.id}',
          dueDate: 'TODAY() + 5',
          priority: 'medium',
        },
      ],
      transitions: [
        {
          to: 'analyzed',
          event: 'analyze',
          description: 'Post-campaign analysis has been completed',
          actions: [
            { type: 'fieldUpdate', field: 'analysis_date', value: 'NOW()' },
          ],
        },
      ],
    },
    {
      name: 'analyzed',
      label: 'Analyzed',
      description: 'Post-campaign analysis has been completed with ROI and performance metrics',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'analyzed' },
        {
          type: 'emailAlert',
          template: 'campaign_analysis_complete',
          recipients: ['${owner.email}', '${owner.manager.email}'],
        },
      ],
    },
  ],

  globalGuards: {
    hasOwner: 'owner != NULL',
    isNotAnalyzed: 'status != "analyzed"',
  },

  events: {
    plan: 'Finalize campaign planning',
    launch: 'Launch the campaign',
    complete: 'Mark campaign as completed',
    analyze: 'Complete post-campaign analysis',
    pause: 'Pause the active campaign',
    revise: 'Send back for revisions',
  },
};

// Spec-validated state machine definition
export const ValidatedCampaignLifecycleStateMachine = StateMachineSchema.parse({
  id: 'campaign_lifecycle',
  initial: 'draft',
  states: {
    draft: { type: 'atomic' },
    planned: { type: 'atomic' },
    active: { type: 'atomic' },
    completed: { type: 'atomic' },
    analyzed: { type: 'final' },
  },
} satisfies StateMachineConfig);

export default CampaignLifecycleStateMachine;
