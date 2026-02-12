// Workflow rules for HR automation
import { WorkflowRuleSchema, type WorkflowRule } from '@objectstack/spec/automation';

/**
 * Onboarding Automation Workflow
 * Automatically creates onboarding tasks when a new hire record is created
 */
export const OnboardingAutomation = {
  name: 'onboarding_automation',
  label: 'New Hire Onboarding Automation',
  object: 'onboarding',
  description: 'Create onboarding tasks for IT setup, HR orientation, manager welcome, benefits, and training',
  triggerType: 'onCreate',
  condition: 'status = "new" AND employee_id != NULL',
  actions: [
    { type: 'fieldUpdate', field: 'status', value: 'in_progress' },
    {
      type: 'taskCreation',
      subject: 'IT Setup for ${employee.name}',
      description: 'Provision laptop, email, software licenses, VPN access, and security credentials',
      assignee: '${department.it_contact_id}',
      dueDate: 'TODAY() + 2',
      priority: 'high',
      status: 'not_started'
    },
    {
      type: 'taskCreation',
      subject: 'HR Orientation: ${employee.name}',
      description: 'Company policies, code of conduct, emergency procedures, and handbook review',
      assignee: '${hr_specialist_id}',
      dueDate: 'TODAY() + 3',
      priority: 'high',
      status: 'not_started'
    },
    {
      type: 'taskCreation',
      subject: 'Welcome Meeting with ${employee.name}',
      description: 'Role expectations, team structure, first-week goals, and key stakeholder introductions',
      assignee: '${employee.manager_id}',
      dueDate: 'TODAY() + 1',
      priority: 'high',
      status: 'not_started'
    },
    {
      type: 'taskCreation',
      subject: 'Benefits Enrollment: ${employee.name}',
      description: 'Health insurance, retirement plan, life insurance, and additional perks enrollment',
      assignee: '${hr_specialist_id}',
      dueDate: 'TODAY() + 5',
      priority: 'medium',
      status: 'not_started'
    },
    {
      type: 'taskCreation',
      subject: 'Training Schedule for ${employee.name}',
      description: 'Compliance training, role-specific modules, tool walkthroughs, and mentorship pairing',
      assignee: '${employee.manager_id}',
      dueDate: 'TODAY() + 5',
      priority: 'medium',
      status: 'not_started'
    },
    {
      type: 'emailAlert',
      template: 'new_hire_welcome',
      recipients: ['${employee.email}'],
      cc: ['${employee.manager_email}', '${hr_specialist_email}']
    },
    {
      type: 'httpCall',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: { 'Content-Type': 'application/json' },
      body: {
        text: '👋 New hire onboarding started',
        blocks: [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*New Hire Onboarding*\n*Employee:* ${employee.name}\n*Department:* ${employee.department}\n*Manager:* ${employee.manager_name}'
          }
        }]
      }
    }
  ],
  executionOrder: 1,
  active: true
};

/**
 * Time-Off Approval Workflow
 * Routes new time-off requests to the employee's manager for approval
 */
export const TimeOffApproval = {
  name: 'time_off_approval',
  label: 'Time-Off Request Approval Routing',
  object: 'time_off',
  description: 'Route time-off requests to manager for approval based on leave type and balance',
  triggerType: 'onCreate',
  condition: 'status = "pending" AND employee_id != NULL AND days_requested > 0',
  actions: [
    {
      type: 'customAction',
      handler: 'validateLeaveBalance',
      parameters: {
        employee_id: '${employee_id}',
        leave_type: '${leave_type}',
        days_requested: '${days_requested}'
      }
    },
    {
      type: 'fieldUpdate',
      field: 'approver_id',
      formula: `
        CASE
          WHEN leave_type = 'Medical' AND days_requested > 5 THEN getHRDirector(employee.department_id)
          WHEN leave_type = 'Parental' THEN getHRDirector(employee.department_id)
          ELSE employee.manager_id
        END
      `
    },
    {
      type: 'emailAlert',
      template: 'time_off_approval_request',
      recipients: ['${approver_id}'],
      cc: ['${employee.email}']
    },
    {
      type: 'taskCreation',
      subject: 'Time-Off Approval: ${employee.name} - ${leave_type}',
      description: '${employee.name} requested ${days_requested} day(s) of ${leave_type} from ${start_date} to ${end_date}',
      assignee: '${approver_id}',
      dueDate: 'TODAY() + 2',
      priority: 'high',
      status: 'not_started'
    }
  ],
  executionOrder: 2,
  active: true
};

/**
 * Time-Off Auto-Approval Workflow
 * Auto-approves short time-off requests when balance is sufficient and no conflicts
 */
export const TimeOffAutoApproval = {
  name: 'time_off_auto_approval',
  label: 'Auto-Approve Short Time-Off Requests',
  object: 'time_off',
  description: 'Auto-approve requests for 1 day or less with sufficient balance and no scheduling conflicts',
  triggerType: 'onCreate',
  condition: 'status = "pending" AND days_requested <= 1 AND leave_balance >= days_requested AND has_scheduling_conflict = false',
  actions: [
    { type: 'fieldUpdate', field: 'status', value: 'approved' },
    { type: 'fieldUpdate', field: 'approved_date', value: 'NOW()' },
    { type: 'fieldUpdate', field: 'approval_notes', value: 'Auto-approved: 1 day or less with sufficient balance and no conflicts' },
    {
      type: 'customAction',
      handler: 'deductLeaveBalance',
      parameters: {
        employee_id: '${employee_id}',
        leave_type: '${leave_type}',
        days: '${days_requested}'
      }
    },
    {
      type: 'emailAlert',
      template: 'time_off_auto_approved',
      recipients: ['${employee.email}'],
      cc: ['${employee.manager_email}']
    },
    {
      type: 'httpCall',
      method: 'POST',
      url: '${env.CALENDAR_API_URL}/events',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ${env.CALENDAR_API_TOKEN}' },
      body: {
        title: '${employee.name} - ${leave_type}',
        start: '${start_date}',
        end: '${end_date}',
        calendar_id: '${employee.department_calendar_id}',
        type: 'out_of_office'
      }
    }
  ],
  executionOrder: 1,
  active: true
};

/**
 * Performance Review Cycle Workflow
 * Scheduled quarterly to create performance review records for all active employees
 */
export const PerformanceReviewCycle = {
  name: 'performance_review_cycle',
  label: 'Quarterly Performance Review Cycle',
  object: 'performance_review',
  description: 'Create performance review records for all active employees on a quarterly schedule',
  triggerType: 'scheduled',
  schedule: { frequency: 'quarterly', dayOfMonth: 1, time: '08:00', timezone: 'UTC' },
  condition: 'QUARTER(TODAY()) IN (1, 2, 3, 4)',
  actions: [
    {
      type: 'customAction',
      handler: 'createQuarterlyReviews',
      parameters: {
        review_period: '${CURRENT_QUARTER()}',
        year: '${YEAR(TODAY())}',
        employee_filter: 'status = "active" AND employment_type IN ("Full-Time", "Part-Time")',
        template: 'quarterly_performance_review'
      }
    },
    {
      type: 'customAction',
      handler: 'setReviewDeadlines',
      parameters: {
        self_review_deadline: 'QUARTER_END() - 21',
        manager_review_deadline: 'QUARTER_END() - 14',
        calibration_deadline: 'QUARTER_END() - 7',
        final_deadline: 'QUARTER_END()'
      }
    },
    {
      type: 'emailAlert',
      template: 'performance_review_cycle_start',
      recipients: ['ALL_MANAGERS'],
      cc: ['${env.HR_TEAM_EMAIL}']
    },
    {
      type: 'emailAlert',
      template: 'self_review_notification',
      recipients: ['ALL_ACTIVE_EMPLOYEES']
    },
    {
      type: 'httpCall',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: { 'Content-Type': 'application/json' },
      body: {
        text: '📊 Quarterly Performance Review Cycle has started',
        blocks: [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Q${CURRENT_QUARTER()} ${YEAR(TODAY())} Performance Reviews*\n📝 Self-review: *${QUARTER_END() - 21}*\n👔 Manager review: *${QUARTER_END() - 14}*\n✅ Final: *${QUARTER_END()}*'
          }
        }]
      }
    }
  ],
  executionOrder: 1,
  active: true
};

/**
 * Performance Review Reminder Workflow
 * Weekly check for overdue reviews with escalating reminders to managers
 */
export const PerformanceReviewReminder = {
  name: 'performance_review_reminder',
  label: 'Overdue Performance Review Reminders',
  object: 'performance_review',
  description: 'Send weekly reminders for overdue or approaching-deadline performance reviews',
  triggerType: 'scheduled',
  schedule: { frequency: 'weekly', dayOfWeek: 'Monday', time: '09:00', timezone: 'UTC' },
  condition: 'status IN ("not_started", "in_progress", "Self-Review Pending", "Manager Review Pending") AND deadline <= TODAY() + 7',
  actions: [
    {
      type: 'emailAlert',
      template: 'self_review_reminder',
      recipients: ['${employee.email}'],
      condition: 'status = "Self-Review Pending" AND self_review_deadline <= TODAY() + 5'
    },
    {
      type: 'emailAlert',
      template: 'manager_review_reminder',
      recipients: ['${reviewer_id}'],
      condition: 'status = "Manager Review Pending" AND manager_review_deadline <= TODAY() + 5'
    },
    {
      type: 'emailAlert',
      template: 'overdue_review_escalation',
      recipients: ['${env.HR_TEAM_EMAIL}'],
      cc: ['${reviewer.manager_email}'],
      condition: 'deadline < TODAY() AND status != "completed"'
    },
    {
      type: 'taskCreation',
      subject: 'OVERDUE: Complete review for ${employee.name}',
      description: 'Review for ${employee.name} (${review_period}) was due ${deadline}. Please complete immediately.',
      assignee: '${reviewer_id}',
      dueDate: 'TODAY() + 2',
      priority: 'high',
      status: 'not_started',
      condition: 'deadline < TODAY() AND status = "Manager Review Pending"'
    },
    {
      type: 'fieldUpdate',
      field: 'escalation_level',
      formula: `
        CASE
          WHEN DAYS_BETWEEN(deadline, TODAY()) > 14 THEN 'critical'
          WHEN DAYS_BETWEEN(deadline, TODAY()) > 7 THEN 'high'
          WHEN DAYS_BETWEEN(deadline, TODAY()) > 0 THEN 'medium'
          ELSE 'normal'
        END
      `,
      condition: 'deadline < TODAY()'
    }
  ],
  executionOrder: 2,
  active: true
};

export const HRWorkflows = {
  onboardingAutomation: OnboardingAutomation,
  timeOffApproval: TimeOffApproval,
  timeOffAutoApproval: TimeOffAutoApproval,
  performanceReviewCycle: PerformanceReviewCycle,
  performanceReviewReminder: PerformanceReviewReminder
};

export default HRWorkflows;

// Spec-validated workflow definitions
export const ValidatedWorkflows = {
  onboardingAutomation: WorkflowRuleSchema.parse({
    name: 'onboarding_automation',
    objectName: 'onboarding',
    triggerType: 'on_create',
    active: true,
    actions: [{ type: 'field_update', name: 'set_in_progress', field: 'status', value: 'in_progress' }],
  } satisfies WorkflowRule),

  timeOffApproval: WorkflowRuleSchema.parse({
    name: 'time_off_approval',
    objectName: 'time_off',
    triggerType: 'on_create',
    active: true,
    actions: [{ type: 'field_update', name: 'set_approver', field: 'approver_id', value: 'manager_id' }],
  } satisfies WorkflowRule),

  timeOffAutoApproval: WorkflowRuleSchema.parse({
    name: 'time_off_auto_approval',
    objectName: 'time_off',
    triggerType: 'on_create',
    active: true,
    actions: [{ type: 'field_update', name: 'auto_approve', field: 'status', value: 'approved' }],
  } satisfies WorkflowRule),

  performanceReviewCycle: WorkflowRuleSchema.parse({
    name: 'performance_review_cycle',
    objectName: 'performance_review',
    triggerType: 'schedule',
    active: true,
    actions: [{ type: 'email_alert', name: 'notify_managers', template: 'performance_review_cycle_start', recipients: ['ALL_MANAGERS'] }],
  } satisfies WorkflowRule),

  performanceReviewReminder: WorkflowRuleSchema.parse({
    name: 'performance_review_reminder',
    objectName: 'performance_review',
    triggerType: 'schedule',
    active: true,
    actions: [{ type: 'email_alert', name: 'send_reminder', template: 'self_review_reminder', recipients: ['employee_email'] }],
  } satisfies WorkflowRule),
};
