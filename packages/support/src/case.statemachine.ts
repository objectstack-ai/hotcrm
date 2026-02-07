import { StateMachine } from '@objectstack/spec/automation';

/**
 * Case Lifecycle State Machine
 * Manages the complete lifecycle of support cases from creation to closure
 */
export const CaseLifecycleStateMachine = StateMachine.create({
  name: 'case_lifecycle',
  label: 'Case Lifecycle State Machine',
  object: 'case',
  description: 'Manages case states, transitions, and automated actions throughout the case lifecycle',

  // Initial state for new cases
  initial: 'new',

  // State definitions
  states: [
    // New State
    {
      name: 'new',
      label: 'New',
      description: 'Case has been created but not yet assigned',

      // Actions when entering this state
      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'New'
        },
        {
          type: 'fieldUpdate',
          field: 'received_date',
          value: 'NOW()'
        },
        {
          type: 'emailAlert',
          template: 'case_created_confirmation',
          recipients: ['${contact.email}']
        }
      ],

      // Possible transitions from this state
      transitions: [
        {
          to: 'assigned',
          event: 'assign',
          guard: 'owner != NULL',
          actions: [
            {
              type: 'emailAlert',
              template: 'case_assigned_notification',
              recipients: ['${owner.email}']
            },
            {
              type: 'taskCreation',
              subject: 'Review new case: ${case_number}',
              assignee: '${owner.id}',
              dueDate: 'NOW() + 4 HOURS',
              priority: '${priority}'
            }
          ]
        },
        {
          to: 'auto_resolved',
          event: 'auto_resolve',
          guard: 'priority = "Low" AND auto_resolvable = true',
          description: 'Automatically resolve simple cases'
        }
      ]
    },

    // Assigned State
    {
      name: 'assigned',
      label: 'Assigned',
      description: 'Case has been assigned to an agent and work is in progress',

      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'In Progress'
        },
        {
          type: 'fieldUpdate',
          field: 'assigned_date',
          value: 'NOW()'
        }
      ],

      transitions: [
        {
          to: 'waiting_customer',
          event: 'request_info',
          description: 'Agent needs more information from customer',
          actions: [
            {
              type: 'emailAlert',
              template: 'info_requested_from_customer',
              recipients: ['${contact.email}']
            },
            {
              type: 'fieldUpdate',
              field: 'waiting_since',
              value: 'NOW()'
            }
          ]
        },
        {
          to: 'waiting_internal',
          event: 'request_internal_help',
          description: 'Agent needs help from another team',
          actions: [
            {
              type: 'fieldUpdate',
              field: 'waiting_for_team',
              value: '${requested_team}'
            }
          ]
        },
        {
          to: 'escalated',
          event: 'escalate',
          guard: 'sla_violation = true OR priority = "Critical" OR escalated_by_customer = true',
          actions: [
            {
              type: 'fieldUpdate',
              field: 'escalated_date',
              value: 'NOW()'
            },
            {
              type: 'emailAlert',
              template: 'case_escalated_notification',
              recipients: ['${owner.manager.email}', 'support_escalation@company.com']
            }
          ]
        },
        {
          to: 'resolved',
          event: 'resolve',
          guard: 'resolution != NULL',
          description: 'Agent has resolved the case'
        }
      ],

      // Auto-escalate if SLA is about to breach
      timeout: {
        duration: 4,
        unit: 'hours',
        event: 'auto_escalate',
        to: 'escalated',
        condition: 'priority IN ["High", "Critical"] AND owner_responded = false'
      }
    },

    // Waiting on Customer State
    {
      name: 'waiting_customer',
      label: 'Waiting on Customer',
      description: 'Waiting for customer response or additional information',

      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'Waiting on Customer'
        }
      ],

      transitions: [
        {
          to: 'assigned',
          event: 'customer_responded',
          description: 'Customer provided requested information',
          actions: [
            {
              type: 'emailAlert',
              template: 'customer_response_received',
              recipients: ['${owner.email}']
            }
          ]
        },
        {
          to: 'auto_closed',
          event: 'timeout',
          description: 'No response from customer'
        }
      ],

      // Auto-close if no response after 7 days
      timeout: {
        duration: 7,
        unit: 'days',
        event: 'timeout',
        to: 'auto_closed'
      }
    },

    // Waiting on Internal Team State
    {
      name: 'waiting_internal',
      label: 'Waiting on Internal Team',
      description: 'Waiting for response from internal team (Engineering, Product, etc.)',

      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'Waiting on Internal Team'
        },
        {
          type: 'emailAlert',
          template: 'internal_help_requested',
          recipients: ['${waiting_for_team}.email']
        }
      ],

      transitions: [
        {
          to: 'assigned',
          event: 'internal_responded',
          description: 'Internal team provided resolution or guidance'
        }
      ],

      // Remind internal team after 2 days
      timeout: {
        duration: 2,
        unit: 'days',
        event: 'remind',
        actions: [
          {
            type: 'emailAlert',
            template: 'internal_help_reminder',
            recipients: ['${waiting_for_team}.manager.email']
          }
        ]
      }
    },

    // Escalated State
    {
      name: 'escalated',
      label: 'Escalated',
      description: 'Case has been escalated to management',

      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'Escalated'
        },
        {
          type: 'fieldUpdate',
          field: 'escalated_date',
          value: 'NOW()'
        },
        {
          type: 'fieldUpdate',
          field: 'priority',
          value: 'Critical'
        },
        {
          type: 'emailAlert',
          template: 'case_escalated_notification',
          recipients: ['${owner.manager.email}', 'support_director@company.com']
        }
      ],

      transitions: [
        {
          to: 'assigned',
          event: 'de_escalate',
          guard: 'sla_violation = false',
          description: 'Issue resolved, de-escalate'
        },
        {
          to: 'resolved',
          event: 'resolve',
          description: 'Escalated case resolved'
        }
      ]
    },

    // Resolved State
    {
      name: 'resolved',
      label: 'Resolved',
      description: 'Case has been resolved, awaiting customer confirmation',

      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'Resolved'
        },
        {
          type: 'fieldUpdate',
          field: 'resolved_date',
          value: 'NOW()'
        },
        {
          type: 'emailAlert',
          template: 'case_resolved_notification',
          recipients: ['${contact.email}']
        },
        {
          type: 'customAction',
          handler: 'sendSatisfactionSurvey',
          parameters: {
            case_id: '${id}',
            contact_email: '${contact.email}'
          }
        }
      ],

      transitions: [
        {
          to: 'closed',
          event: 'close',
          description: 'Customer confirmed resolution'
        },
        {
          to: 'assigned',
          event: 'reopen',
          guard: 'customer_satisfied = false',
          description: 'Customer not satisfied, reopen case',
          actions: [
            {
              type: 'emailAlert',
              template: 'case_reopened_notification',
              recipients: ['${owner.email}']
            }
          ]
        }
      ],

      // Auto-close if no response from customer after 24 hours
      timeout: {
        duration: 24,
        unit: 'hours',
        event: 'auto_close',
        to: 'closed',
        condition: 'customer_response = NULL'
      }
    },

    // Closed State (Final State)
    {
      name: 'closed',
      label: 'Closed',
      description: 'Case is closed and archived',
      type: 'final',

      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'Closed'
        },
        {
          type: 'fieldUpdate',
          field: 'closed_date',
          value: 'NOW()'
        },
        {
          type: 'fieldUpdate',
          field: 'resolution_time',
          formula: 'HOURS_BETWEEN(received_date, closed_date)'
        },
        {
          type: 'customAction',
          handler: 'updateCaseMetrics',
          parameters: {
            case_id: '${id}',
            owner_id: '${owner.id}'
          }
        }
      ],

      // Closed cases can be reopened within 30 days
      transitions: [
        {
          to: 'assigned',
          event: 'reopen',
          guard: 'DAYS_BETWEEN(closed_date, NOW()) <= 30',
          description: 'Reopen closed case',
          actions: [
            {
              type: 'fieldUpdate',
              field: 'reopened_count',
              formula: 'reopened_count + 1'
            },
            {
              type: 'emailAlert',
              template: 'case_reopened_notification',
              recipients: ['${owner.email}']
            }
          ]
        }
      ]
    },

    // Auto-Closed State
    {
      name: 'auto_closed',
      label: 'Auto-Closed',
      description: 'Case was automatically closed due to no customer response',
      type: 'final',

      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'Auto-Closed'
        },
        {
          type: 'fieldUpdate',
          field: 'closed_date',
          value: 'NOW()'
        },
        {
          type: 'fieldUpdate',
          field: 'closure_reason',
          value: 'No customer response'
        },
        {
          type: 'emailAlert',
          template: 'case_auto_closed_notification',
          recipients: ['${contact.email}']
        }
      ],

      transitions: [
        {
          to: 'assigned',
          event: 'reopen',
          description: 'Customer responds after auto-closure'
        }
      ]
    },

    // Auto-Resolved State
    {
      name: 'auto_resolved',
      label: 'Auto-Resolved',
      description: 'Case was automatically resolved by AI',
      type: 'final',

      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'Auto-Resolved'
        },
        {
          type: 'fieldUpdate',
          field: 'resolved_date',
          value: 'NOW()'
        },
        {
          type: 'fieldUpdate',
          field: 'auto_resolved',
          value: true
        },
        {
          type: 'emailAlert',
          template: 'case_auto_resolved_notification',
          recipients: ['${contact.email}']
        }
      ]
    }
  ],

  // Global guards that apply across all transitions
  globalGuards: {
    hasOwner: 'owner != NULL',
    isNotClosed: 'status NOT IN ["Closed", "Auto-Closed"]',
    isHighPriority: 'priority IN ["High", "Critical"]'
  },

  // Event handlers
  events: {
    assign: 'Assign case to agent',
    request_info: 'Request information from customer',
    request_internal_help: 'Request help from internal team',
    escalate: 'Escalate case to management',
    de_escalate: 'De-escalate case',
    resolve: 'Mark case as resolved',
    close: 'Close case',
    reopen: 'Reopen closed case',
    customer_responded: 'Customer provided response',
    internal_responded: 'Internal team responded',
    auto_resolve: 'Automatically resolve simple case',
    auto_escalate: 'Automatically escalate due to SLA',
    auto_close: 'Automatically close due to timeout',
    timeout: 'Timeout occurred'
  }
});

export default CaseLifecycleStateMachine;
