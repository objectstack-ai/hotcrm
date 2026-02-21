// State machine configuration for sync lifecycle
import { StateMachineSchema, type StateMachineConfig } from '@objectstack/spec/automation';

/**
 * Sync Lifecycle State Machine
 * Manages the complete lifecycle of data synchronization operations from pending through completion or failure.
 */
export const SyncLifecycleStateMachine = {
  name: 'sync_lifecycle',
  label: 'Sync Lifecycle State Machine',
  object: 'sync_config',
  description: 'Manages sync operation states from pending initiation through running, completion, failure, and cancellation',

  initial: 'pending',

  states: [
    {
      name: 'pending',
      label: 'Pending',
      description: 'Sync operation has been scheduled but not yet started',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'pending' },
        { type: 'fieldUpdate', field: 'queued_date', value: 'NOW()' },
      ],
      transitions: [
        {
          to: 'running',
          event: 'start',
          guard: 'connector_id != NULL AND field_mapping_count > 0',
          description: 'Start the sync operation',
          actions: [
            { type: 'fieldUpdate', field: 'started_date', value: 'NOW()' },
          ],
        },
        {
          to: 'cancelled',
          event: 'cancel',
          description: 'Cancel the pending sync operation',
          actions: [
            { type: 'fieldUpdate', field: 'cancelled_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'running',
      label: 'Running',
      description: 'Sync operation is actively processing records',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'running' },
        {
          type: 'taskCreation',
          subject: 'Monitor sync operation: ${sync_name}',
          assignee: '${owner.id}',
          dueDate: 'TODAY()',
          priority: 'medium',
        },
      ],
      transitions: [
        {
          to: 'completed',
          event: 'complete',
          description: 'Sync operation completed successfully',
          actions: [
            { type: 'fieldUpdate', field: 'completed_date', value: 'NOW()' },
          ],
        },
        {
          to: 'failed',
          event: 'fail',
          description: 'Sync operation encountered an unrecoverable error',
          actions: [
            { type: 'fieldUpdate', field: 'error_message', value: '${error}' },
            { type: 'fieldUpdate', field: 'failed_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'sync_failure_notification',
              recipients: ['${owner.email}'],
            },
          ],
        },
        {
          to: 'cancelled',
          event: 'cancel',
          description: 'Cancel the running sync operation',
          actions: [
            { type: 'fieldUpdate', field: 'cancelled_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'completed',
      label: 'Completed',
      description: 'Sync operation has completed successfully',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'completed' },
      ],
    },
    {
      name: 'failed',
      label: 'Failed',
      description: 'Sync operation has failed due to errors',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'failed' },
        {
          type: 'taskCreation',
          subject: 'Investigate sync failure: ${sync_name}',
          assignee: '${owner.id}',
          dueDate: 'TODAY() + 1',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'pending',
          event: 'retry',
          guard: 'retry_count < max_retries',
          description: 'Retry the failed sync operation',
          actions: [
            { type: 'fieldUpdate', field: 'retry_count', value: '${retry_count + 1}' },
          ],
        },
        {
          to: 'cancelled',
          event: 'cancel',
          description: 'Cancel the failed sync and stop retries',
          actions: [
            { type: 'fieldUpdate', field: 'cancelled_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'cancelled',
      label: 'Cancelled',
      description: 'Sync operation has been cancelled',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'cancelled' },
        { type: 'fieldUpdate', field: 'cancelled_date', value: 'NOW()' },
      ],
    },
  ],

  globalGuards: {
    hasConnector: 'connector_id != NULL',
    isNotCompleted: 'status != "completed"',
    isNotCancelled: 'status != "cancelled"',
  },

  events: {
    start: 'Start the sync operation',
    complete: 'Mark sync as completed',
    fail: 'Mark sync as failed',
    retry: 'Retry the failed sync',
    cancel: 'Cancel the sync operation',
  },
};

// Spec-validated state machine definition
export const ValidatedSyncLifecycleStateMachine = StateMachineSchema.parse({
  id: 'sync_lifecycle',
  initial: 'pending',
  states: {
    pending: { type: 'atomic' },
    running: { type: 'atomic' },
    completed: { type: 'final' },
    failed: { type: 'atomic' },
    cancelled: { type: 'final' },
  },
} satisfies StateMachineConfig);

export default SyncLifecycleStateMachine;
