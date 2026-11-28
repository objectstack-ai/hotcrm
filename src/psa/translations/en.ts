// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — the PSA module's own translations: every row whose target this
 * package registers. Why they live here and not in the app package's pack:
 * `./index.ts`.
 */
export const en: TranslationData = {
  objects: {
    crm_project: {
      label: 'Project',
      pluralLabel: 'Projects',
      description: 'A customer engagement the delivery team runs, with its staffing, time, expenses, cost and margin',
      fields: {
        owner_id: { label: 'Project Owner' },
        project_number: { label: 'Project Number' },
        name: { label: 'Project Name' },
        kind: {
          label: 'Kind',
          options: {
            presales: 'Presales',
            delivery: 'Delivery',
            internal: 'Internal',
          },
        },
        billing_type: {
          label: 'Billing Type',
          help: 'How the customer pays for the work. Invoicing itself is done in Order to Cash.',
          options: {
            fixed_fee: 'Fixed Fee',
            time_and_materials: 'Time and Materials',
            retainer: 'Retainer',
            non_billable: 'Non-billable',
          },
        },
        status: {
          label: 'Status',
          options: {
            draft: 'Draft',
            in_approval: 'In Approval',
            approved: 'Approved',
            rejected: 'Rejected',
            active: 'Active',
            on_hold: 'On Hold',
            completed: 'Completed',
            closed: 'Closed',
            cancelled: 'Cancelled',
          },
        },
        description: { label: 'Description' },
        crm_account: { label: 'Account' },
        crm_opportunity: { label: 'Opportunity' },
        crm_contract: { label: 'Contract' },
        crm_sales_order: {
          label: 'Order',
          help: 'The sales order this project delivers.',
        },
        source_project: {
          label: 'Won From',
          help: 'For a delivery project: the presales project it was won from.',
        },
        planned_start: { label: 'Planned Start' },
        planned_end: { label: 'Planned End' },
        actual_start: { label: 'Actual Start' },
        actual_end: { label: 'Actual End' },
        percent_complete: {
          label: 'Percent Complete',
          help: 'Computed from the project\'s tasks, weighted by their planned hours. A task with subtasks counts through them.',
        },
        planned_revenue: {
          label: 'Planned Revenue',
          help: 'What the customer pays for this project. Gross margin is measured against it.',
        },
        approved_budget: {
          label: 'Approved Budget',
          help: 'The baseline budget version\'s total: what this project may spend. It changes when a new version is approved, never by typing.',
        },
        actual_labor_cost: { label: 'Labor Cost' },
        actual_expense_cost: { label: 'Expense Cost' },
        billable_labor_amount: { label: 'Billable Labor' },
        billable_expense_amount: { label: 'Billable Expenses' },
        billable_amount: {
          label: 'Approved to Bill',
          help: 'Approved billable hours at their bill rate, plus approved billable expenses. Order to Cash invoices it.',
        },
        actual_cost: { label: 'Actual Cost' },
        cost_variance: { label: 'Budget Remaining' },
        budget_consumed_percent: { label: 'Budget Used %' },
        budget_status: {
          label: 'Budget Status',
          help: 'On Track below 80 % of the Approved Budget, Warning from 80 %, Exceeded from 100 %.',
          options: {
            on_track: 'On Track',
            warning: 'Warning',
            exceeded: 'Exceeded',
          },
        },
        time_entry_locked: {
          label: 'Lock Time and Expenses',
          help: 'While ticked, no timesheet or expense on this project can be submitted. Drafts can still be written.',
        },
        gross_margin: { label: 'Gross Margin' },
        gross_margin_percent: { label: 'Gross Margin %' },
        project_manager: {
          label: 'Project Manager',
          help: 'The person staffed on this project as its project manager.',
        },
        team_members: { label: 'Team' },
      },
      _views: {
        all_projects: { label: 'All Projects' },
        my_projects: { label: 'My Projects' },
        active_projects: { label: 'Active Projects' },
      },
      _sections: {
        identity: { label: 'Project' },
        provenance: { label: 'Customer' },
        plan: { label: 'Plan' },
        financials: { label: 'Financials' },
        team: { label: 'Team' },
      },
      _validations: {
        project_planned_dates: { message: 'Planned End must be on or after Planned Start.' },
        project_status_progression: { message: 'This status change is not allowed. A project moves Draft → In Approval → Approved → Active → Completed → Closed; Active and On Hold switch back and forth, a rejected project goes back to Draft, and an open project can be Cancelled.' },
      },
    },
    crm_project_task: {
      label: 'Project Task',
      pluralLabel: 'Project Tasks',
      description: 'A piece of a project\'s plan, with its dates, planned hours, owner and progress',
      fields: {
        crm_project: { label: 'Project' },
        name: { label: 'Task Name' },
        parent_task: {
          label: 'Parent Task',
          help: 'The task this one is part of. A task with subtasks is a summary: its progress comes from them.',
        },
        task_owner: {
          label: 'Task Owner',
          help: 'The person who does the task or answers for it.',
        },
        status: {
          label: 'Status',
          options: {
            not_started: 'Not Started',
            in_progress: 'In Progress',
            on_hold: 'On Hold',
            completed: 'Completed',
            cancelled: 'Cancelled',
          },
        },
        is_milestone: {
          label: 'Milestone',
          help: 'A checkpoint rather than work: drawn as a diamond on the Gantt, usually with no planned hours.',
        },
        description: { label: 'Description' },
        planned_start: { label: 'Planned Start' },
        planned_end: { label: 'Planned End' },
        predecessors: {
          label: 'Predecessors',
          help: 'The tasks that must finish before this one starts.',
        },
        schedule_type: { label: 'Schedule Type' },
        planned_hours: {
          label: 'Planned Hours',
          help: 'The effort the task is planned at. The project\'s Percent Complete weighs each task by it.',
        },
        percent_complete: {
          label: 'Percent Complete',
          help: 'How far along the task is. Set to 100 when the task is Completed, and back to 0 when it is moved out of Completed.',
        },
        actual_hours: { label: 'Actual Hours' },
      },
      _views: {
        all_project_tasks: { label: 'All Project Tasks' },
        project_plan: { label: 'Project Plan' },
        project_task_tree: { label: 'Task Tree' },
        my_project_tasks: { label: 'My Project Tasks' },
      },
      _sections: {
        basic: { label: 'Task' },
        schedule: { label: 'Schedule' },
        effort: { label: 'Effort' },
      },
      _validations: {
        project_task_planned_dates: { message: 'Planned End must be on or after Planned Start.' },
      },
    },
    // Budget versions and their lines (hotcrm#2547).
    crm_project_budget: {
      label: 'Project Budget',
      pluralLabel: 'Project Budgets',
      description: 'One version of a project\'s budget: its lines, its total and its approval. The approved one is the baseline.',
      fields: {
        crm_project: { label: 'Project' },
        name: { label: 'Budget' },
        version: { label: 'Version', help: 'Numbered 1, 2, 3… in the order the versions were made.' },
        status: {
          label: 'Status',
          options: {
            draft: 'Draft',
            in_approval: 'In Approval',
            approved: 'Approved',
            rejected: 'Rejected',
            superseded: 'Superseded',
          },
        },
        is_baseline: { label: 'Baseline', help: 'The approved version the project\'s Approved Budget is. One per project; a later approved version takes it over.' },
        with_initiation: { label: 'Approved With the Project', help: 'Sent for approval with the project itself, as its first budget, rather than as a top-up.' },
        reason: { label: 'Reason', help: 'Why this version is needed. Required to send a top-up (version 2 or later) for approval.' },
        total_cost: { label: 'Total Cost' },
        labor_cost: { label: 'Labor Cost' },
        labor_hours: { label: 'Labor Hours' },
        notes: { label: 'Notes' },
      },
      _views: {
        all_project_budgets: { label: 'All Budget Versions' },
        baseline_budgets: { label: 'Baselines' },
        open_budgets: { label: 'Open Versions' },
      },
      _sections: {
        basic: { label: 'Budget Version' },
        lines: { label: 'Budget Lines' },
        totals: { label: 'Totals' },
      },
      _validations: {
        project_budget_status_progression: { message: 'This status change is not allowed. A budget version moves Draft → In Approval → Approved or Rejected; a rejected one goes back to Draft, and an approved one is Superseded when a later version is approved.' },
      },
    },
    crm_project_budget_line: {
      label: 'Budget Line',
      pluralLabel: 'Budget Lines',
      description: 'One planned cost of a budget version: category, month, quantity and unit cost',
      fields: {
        crm_project_budget: { label: 'Budget' },
        category: {
          label: 'Category',
          options: {
            labor: 'Labor',
            subcontract_service: 'Subcontracted Services',
            third_party_goods: 'Third-Party Goods',
            expense: 'Expenses',
            other: 'Other',
          },
        },
        description: { label: 'Description' },
        period: { label: 'Month', help: 'The month the cost falls in. Saved as the first day of that month.' },
        rate_card: { label: 'Rate Card', help: 'For a labor line: the level the hours are planned at. Its cost rate is the unit cost unless you type one.' },
        hours: { label: 'Hours', help: 'For a labor line: the hours planned.' },
        quantity: { label: 'Quantity', help: 'For any other line: how many units.' },
        unit_cost: { label: 'Unit Cost', help: 'Per hour for labor, per unit otherwise.' },
        amount: { label: 'Amount', help: 'Hours × unit cost for labor, quantity × unit cost otherwise.' },
      },
      _views: {
        all_project_budget_lines: { label: 'All Budget Lines' },
      },
      _sections: {
        basic: { label: 'Budget Line' },
      },
    },
    crm_project_member: {
      label: 'Project Member',
      pluralLabel: 'Project Members',
      description: 'A person staffed on a project, with a responsibility, at a rate card',
      fields: {
        crm_project: { label: 'Project' },
        person: { label: 'Person' },
        person_name: { label: 'Person Name', help: "The person's name, kept in step with the user record. It names this staffing row." },
        responsibility: {
          label: 'Responsibility',
          options: {
            project_manager: 'Project Manager',
            project_director: 'Project Director',
            account_manager: 'Account Manager',
            architect: 'Architect',
            consultant: 'Consultant',
            quality_assurance: 'Quality Assurance',
            finance_partner: 'Finance Partner',
            subcontractor: 'Subcontractor',
          },
        },
        rate_card: {
          label: 'Rate Card',
          help: 'The cost and bill rate this person\'s hours on this project are counted at.',
        },
        allocation_percent: { label: 'Allocation' },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        is_billable: {
          label: 'Billable',
          help: 'Whether this person\'s hours on this project are billed to the customer.',
        },
      },
      _views: {
        all_project_members: { label: 'All Project Members' },
      },
      _sections: {
        basic: { label: 'Staffing' },
      },
      _validations: {
        project_member_dates: { message: 'End Date must be on or after Start Date.' },
      },
    },
    crm_rate_card: {
      label: 'Rate Card',
      pluralLabel: 'Rate Cards',
      description: 'The cost rate and bill rate of one seniority level',
      fields: {
        owner_id: { label: 'Owner' },
        name: {
          label: 'Name',
          help: 'For example "Senior Consultant".',
        },
        seniority: {
          label: 'Seniority',
          options: {
            junior: 'Junior',
            intermediate: 'Intermediate',
            senior: 'Senior',
            lead: 'Lead',
            principal: 'Principal',
          },
        },
        unit: {
          label: 'Unit',
          help: 'A day rate is counted as eight hours.',
          options: {
            hour: 'Per Hour',
            day: 'Per Day',
          },
        },
        cost_rate: {
          label: 'Cost Rate',
          help: 'What one unit of this role costs the company.',
        },
        bill_rate: {
          label: 'Bill Rate',
          help: 'What one unit of this role is billed to the customer at.',
        },
        is_internal: {
          label: 'Internal',
          help: 'An internal card may bill below cost, or not at all.',
        },
        effective_from: { label: 'Effective From' },
        effective_to: { label: 'Effective To' },
      },
      _views: {
        all_rate_cards: { label: 'All Rate Cards' },
      },
      _sections: {
        basic: { label: 'Rate Card' },
        rates: { label: 'Rates' },
      },
      _validations: {
        rate_card_bill_not_below_cost: { message: 'Bill Rate may not be below Cost Rate unless the card is Internal.' },
        rate_card_dates: { message: 'Effective To must be on or after Effective From.' },
      },
    },
    crm_timesheet: {
      label: 'Timesheet',
      pluralLabel: 'Timesheets',
      description: 'One person\'s hours on one project for one period, approved as a unit',
      fields: {
        owner_id: { label: 'Person' },
        name: { label: 'Timesheet' },
        crm_project: { label: 'Project' },
        period_start: { label: 'Period Start' },
        period_end: { label: 'Period End' },
        status: {
          label: 'Status',
          options: {
            draft: 'Draft',
            submitted: 'Submitted',
            approved: 'Approved',
            rejected: 'Rejected',
          },
        },
        approver: { label: 'Approver' },
        total_hours: { label: 'Total Hours' },
        billable_hours: { label: 'Billable Hours' },
        total_cost: { label: 'Total Cost' },
        total_bill_amount: { label: 'Amount to Bill' },
        notes: { label: 'Notes' },
      },
      _views: {
        all_timesheets: { label: 'All Timesheets' },
        my_timesheets: { label: 'My Timesheets' },
        my_week_timesheets: {
          label: 'This Week\'s Timesheets',
          bulkActions: {
            submit_week: { label: 'Submit', confirmText: 'Submit {{count}} timesheet(s) for approval? Each goes to its project manager.' },
          },
        },
        timesheets_to_approve: { label: 'Timesheets to Approve' },
      },
      _sections: {
        basic: { label: 'Timesheet' },
        totals: { label: 'Totals' },
      },
      _validations: {
        timesheet_period: { message: 'Period End must be on or after Period Start, and a timesheet covers at most 31 days.' },
        timesheet_status_progression: { message: 'This status change is not allowed. A timesheet moves Draft → Submitted → Approved or Rejected; a rejected timesheet goes back to Draft to be corrected.' },
      },
      _actions: {
        submit_timesheet: { label: 'Submit', successMessage: 'Timesheet {{ record.name }} submitted for approval.' },
      },
    },
    crm_time_entry: {
      label: 'Time Entry',
      pluralLabel: 'Time Entries',
      description: 'A day\'s hours in a timesheet, and the cost they stand for',
      fields: {
        crm_project: {
          label: 'Project',
          help: 'The project the hours are for. On a new line, the timesheet for this project and week is found or created for you.',
        },
        crm_timesheet: {
          label: 'Timesheet',
          help: 'Filled in for you from the project and the date. Pick one only to book onto a timesheet with another period.',
        },
        entry_date: {
          label: 'Date',
          help: 'The day the hours were worked.',
        },
        hours: { label: 'Hours' },
        is_billable: { label: 'Billable' },
        crm_project_task: {
          label: 'Task',
          help: 'The task of this project the hours were spent on.',
        },
        notes: { label: 'Notes' },
        cost_rate: { label: 'Cost Rate (per hour)' },
        cost_amount: { label: 'Cost' },
        bill_rate: { label: 'Bill Rate (per hour)' },
        bill_amount: { label: 'Amount to Bill' },
      },
      _views: {
        all_time_entries: { label: 'All Time Entries' },
        my_week_time: { label: 'My Week' },
        my_time_entries: { label: 'My Time' },
      },
      _sections: {
        basic: { label: 'Time Entry' },
        rates: { label: 'Cost and Billing' },
      },
    },
    // The Project field it contributes to the expense module's objects (hotcrm#2556, hotcrm#2581).
    crm_expense: {
      fields: {
        crm_project: { label: 'Project' },
      },
    },
    crm_expense_report: {
      fields: {
        crm_project: { label: 'Project' },
      },
    },
    crm_expense_request: {
      fields: {
        crm_project: { label: 'Project' },
      },
    },
  },
  // Step names the approval request shows the submitter and the approvers (#2316 phase 1b).
  flows: {
    project_initiation_approval: {
      label: 'Project Initiation Approval',
      approvals: {
        leadership_review: { label: 'Project Director Review' },
        finance_review: { label: 'Finance Controller Review' },
      },
    },
    project_budget_approval: {
      label: 'Budget Top-Up Approval',
      approvals: {
        leadership_review: { label: 'Project Director Review' },
        finance_review: { label: 'Finance Controller Review' },
      },
    },
    timesheet_approval: {
      label: 'Timesheet Approval',
      approvals: { approver_review: { label: 'Project Manager Review' } },
    },
    timesheet_approval_on_create: {
      label: 'Timesheet Approval (on create)',
      approvals: { approver_review: { label: 'Project Manager Review' } },
    },
    project_budget_alert: { label: 'Project Budget Alert' },
    expense_report_project_approval: {
      label: 'Project Expense Report Approval',
      approvals: {
        approver_review: { label: 'Project Manager Review' },
        finance_review: { label: 'Finance Controller Review' },
      },
    },
    expense_request_project_approval: {
      label: 'Project Travel Request Approval',
      approvals: {
        approver_review: { label: 'Project Manager Review' },
      },
    },
    expense_request_project_approval_on_create: {
      label: 'Project Travel Request Approval (on create)',
      approvals: {
        approver_review: { label: 'Project Manager Review' },
      },
    },
  },
  apps: {
    // This package's own app (#2316). The contributed entries' labels are the
    // app package's, which contributes them.
    crm_psa: {
      label: 'Project Delivery',
      description: 'Projects, the people staffed on them, their time and expenses, and the margin that results',
      navigation: {
        group_projects: { label: 'Projects' },
        nav_projects: { label: 'All Projects' },
        nav_my_projects: { label: 'My Projects' },
        nav_project_members: { label: 'Staffing' },
        nav_project_budgets: { label: 'Budgets' },
        nav_project_plan: { label: 'Project Plan' },
        nav_my_project_tasks: { label: 'My Project Tasks' },
        group_time_expenses: { label: 'Time and Expenses' },
        nav_my_week: { label: 'My Week' },
        nav_my_week_timesheets: { label: 'Submit This Week' },
        nav_my_timesheets: { label: 'My Timesheets' },
        nav_timesheets_to_approve: { label: 'Timesheets to Approve' },
        group_rates: { label: 'Rates' },
        nav_rate_cards: { label: 'Rate Cards' },
        group_customers: { label: 'Customers and Contracts' },
        group_work: { label: 'My Work' },
        nav_approval_requests: { label: 'Inbox' },
        nav_projects_overview: { label: 'Projects Overview' },
        group_help: { label: 'Help' },
        nav_help_psa: { label: 'Project Delivery Manual' },
      },
    },
  },
  // Phase 1c: the module's datasets, its manual and its dashboard.
  datasets: {
    project_financials: {
      label: 'Project Financials',
      description: 'Approved budget, planned revenue, cost and margin per project',
      dimensions: {
        project: { label: 'Project' },
        status: { label: 'Status' },
        kind: { label: 'Kind' },
        billing_type: { label: 'Billing Type' },
        budget_status: { label: 'Budget Status' },
        project_manager: { label: 'Project Manager' },
        planned_start: { label: 'Planned Start' },
      },
      measures: {
        project_count: { label: 'Projects' },
        approved_budget_sum: { label: 'Approved Budget' },
        planned_revenue_sum: { label: 'Planned Revenue' },
        labor_cost_sum: { label: 'Labor Cost' },
        expense_cost_sum: { label: 'Expense Cost' },
        actual_cost_sum: { label: 'Actual Cost' },
        gross_margin_sum: { label: 'Gross Margin' },
        budget_used: { label: 'Budget Used' },
        billable_labor_sum: { label: 'Billable Labor' },
        billable_expense_sum: { label: 'Billable Expenses' },
        approved_to_bill_sum: { label: 'Approved to Bill' },
      },
    },
    time_utilization: {
      label: 'Time Utilization',
      description: 'Hours booked per person, project and week, and the billable share',
      dimensions: {
        period_week: { label: 'Week' },
        period_month: { label: 'Month' },
        person: { label: 'Person' },
        project: { label: 'Project' },
        status: { label: 'Timesheet Status' },
      },
      measures: {
        total_hours: { label: 'Hours' },
        billable_hours: { label: 'Billable Hours' },
        utilization: { label: 'Billable Share' },
      },
    },
  },
  books: {
    crm_psa_manual: {
      label: 'HotCRM Project Delivery Manual',
      description: 'Projects, staffing, cost, approvals and the budget lock: what each figure counts, and who decides.',
      groups: {
        psa: { label: 'Project Delivery' },
      },
    },
  },
  dashboards: {
    projects_overview: {
      label: 'Projects Overview',
      description: 'Budget, cost, margin and approved hours across the delivery portfolio',
      widgets: {
        delivering_projects: { title: 'Projects Delivering', description: 'Active, On Hold and Completed projects' },
        delivering_budget: { title: 'Approved Budget', description: 'Approved budgets of the projects delivering' },
        delivering_cost: { title: 'Actual Cost', description: 'Approved labor and expenses of the projects delivering' },
        delivering_budget_used: { title: 'Budget Used', description: 'Actual cost over approved budget, across the projects delivering' },
        budget_vs_cost: { title: 'Budget and Cost by Project', description: 'Approved budget beside actual cost, per project delivering' },
        budget_status_mix: { title: 'Projects by Budget Status', description: 'On Track, Warning (from 80 %) and Exceeded (from 100 %), projects with a budget' },
        project_margin: { title: 'Margin by Project', description: 'Planned revenue, actual cost, gross margin and budget used, per project delivering' },
        projects_by_status: { title: 'Projects by Status', description: 'Every project, from Draft to Closed' },
        hours_by_week: { title: 'Approved Hours by Week', description: 'Hours on approved timesheets, and the billable part of them' },
        billable_share_by_person: { title: 'Billable Share by Person', description: 'Approved hours per person and the share billed to customers' },
      },
    },
  },
};
