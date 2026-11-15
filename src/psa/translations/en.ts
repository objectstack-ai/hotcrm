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
        source_project: {
          label: 'Won From',
          help: 'For a delivery project: the presales project it was won from.',
        },
        planned_start: { label: 'Planned Start' },
        planned_end: { label: 'Planned End' },
        actual_start: { label: 'Actual Start' },
        actual_end: { label: 'Actual End' },
        percent_complete: { label: 'Percent Complete' },
        planned_revenue: {
          label: 'Planned Revenue',
          help: 'What the customer pays for this project. Gross margin is measured against it.',
        },
        approved_budget: {
          label: 'Approved Budget',
          help: 'The cost this project may spend. Set before the project goes for approval.',
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
        budget_consumed_percent: { label: 'Budget Used' },
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
    crm_project_member: {
      label: 'Project Member',
      pluralLabel: 'Project Members',
      description: 'A person staffed on a project, with a responsibility, at a rate card',
      fields: {
        crm_project: { label: 'Project' },
        person: { label: 'Person' },
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
        total_cost: { label: 'Total Cost' },
        total_bill_amount: { label: 'Amount to Bill' },
        notes: { label: 'Notes' },
      },
      _views: {
        all_timesheets: { label: 'All Timesheets' },
        my_timesheets: { label: 'My Timesheets' },
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
    },
    crm_time_entry: {
      label: 'Time Entry',
      pluralLabel: 'Time Entries',
      description: 'A day\'s hours in a timesheet, and the cost they stand for',
      fields: {
        crm_timesheet: { label: 'Timesheet' },
        entry_date: {
          label: 'Date',
          help: 'A day inside the timesheet\'s period.',
        },
        hours: { label: 'Hours' },
        is_billable: { label: 'Billable' },
        notes: { label: 'Notes' },
        cost_rate: { label: 'Cost Rate (per hour)' },
        cost_amount: { label: 'Cost' },
        bill_rate: { label: 'Bill Rate (per hour)' },
        bill_amount: { label: 'Amount to Bill' },
      },
      _views: {
        all_time_entries: { label: 'All Time Entries' },
      },
      _sections: {
        basic: { label: 'Time Entry' },
        rates: { label: 'Cost and Billing' },
      },
    },
    crm_expense: {
      label: 'Expense',
      pluralLabel: 'Expenses',
      description: 'A cost spent on a project, with its receipt',
      fields: {
        owner_id: { label: 'Spent By' },
        name: { label: 'Description' },
        crm_project: { label: 'Project' },
        expense_date: { label: 'Date' },
        category: {
          label: 'Category',
          options: {
            travel: 'Travel',
            lodging: 'Lodging',
            meals: 'Meals',
            equipment: 'Equipment',
            other: 'Other',
          },
        },
        amount: { label: 'Amount' },
        is_billable: {
          label: 'Billable',
          help: 'Whether this expense is passed on to the customer.',
        },
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
        notes: { label: 'Notes' },
      },
      _views: {
        all_expenses: { label: 'All Expenses' },
        my_expenses: { label: 'My Expenses' },
        expenses_to_approve: { label: 'Expenses to Approve' },
      },
      _sections: {
        basic: { label: 'Expense' },
      },
      _validations: {
        expense_status_progression: { message: 'This status change is not allowed. An expense moves Draft → Submitted → Approved or Rejected; a rejected expense goes back to Draft to be corrected.' },
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
        group_time_expenses: { label: 'Time and Expenses' },
        nav_my_timesheets: { label: 'My Timesheets' },
        nav_my_expenses: { label: 'My Expenses' },
        nav_timesheets_to_approve: { label: 'Timesheets to Approve' },
        nav_expenses_to_approve: { label: 'Expenses to Approve' },
        group_rates: { label: 'Rates' },
        nav_rate_cards: { label: 'Rate Cards' },
        group_customers: { label: 'Customers and Contracts' },
        group_work: { label: 'My Work' },
        nav_approval_requests: { label: 'Inbox' },
      },
    },
  },
};
