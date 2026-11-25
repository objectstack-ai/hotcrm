// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — the expense module's own translations (hotcrm#2556, hotcrm#2559): every
 * row whose target this package registers. The object's rows moved here from
 * Project Delivery with the object; the Project field's label stays in that
 * module's pack, which contributes the field. Why per package: `./index.ts`.
 */
export const en: TranslationData = {
  objects: {
    crm_expense: {
      label: 'Expense',
      pluralLabel: 'Expenses',
      description: 'A cost a person spent for the company, with its receipt',
      fields: {
        owner_id: { label: 'Spent By' },
        name: { label: 'Description' },
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
        paid_by: {
          label: 'Paid By',
          help: 'The employee, who is paid back, or the company.',
          options: {
            employee: 'Employee',
            company: 'Company',
          },
        },
        merchant: { label: 'Merchant' },
        receipt_number: { label: 'Receipt Number' },
        source: {
          label: 'Source',
          help: 'Typed by a person, written by an agent, or imported.',
          options: {
            manual: 'Manual',
            agent: 'Agent',
            import: 'Import',
          },
        },
        is_billable: {
          label: 'Billable',
          help: 'Whether this expense is passed on to the customer.',
        },
        crm_expense_report: { label: 'Expense Report' },
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
        review_notes: { label: 'Review Notes', help: 'What a check found, for the approver to read.' },
      },
      _views: {
        all_expenses: { label: 'All Expenses' },
        my_expenses: {
          label: 'My Expenses',
          bulkActions: {
            delete: { label: 'Delete', confirmLabel: 'Delete', confirmText: 'Delete {{count}} expense(s)? They go to the recycle bin, where an administrator can restore them.' },
          },
        },
      },
      _sections: {
        basic: { label: 'Expense' },
      },
      _validations: {
        expense_status_progression: { message: 'This status change is not allowed. An expense follows its report: Draft → Submitted → Approved or Rejected, and back to Draft when the report is recalled or corrected.' },
      },
      _actions: {
        submit_for_reimbursement: { label: 'Submit for Reimbursement', successMessage: 'Submitted for reimbursement. Follow it in My Reports.' },
        submit_trip_for_reimbursement: {
          label: 'Submit for a Trip',
          description: 'Report these expenses against one of your approved travel requests.',
          submitText: 'Submit',
          successMessage: 'Submitted for reimbursement against the travel request. Follow it in My Reports.',
          params: {
            crm_expense_request: { label: 'Travel Request', helpText: 'Your approved travel request these expenses were spent on.' },
          },
        },
      },
    },
    crm_expense_report: {
      label: 'Expense Report',
      pluralLabel: 'Expense Reports',
      description: 'Expenses sent together to be approved and paid back',
      fields: {
        owner_id: { label: 'Submitted By' },
        report_number: { label: 'Report Number' },
        name: { label: 'Title' },
        crm_account: { label: 'Account', help: 'The customer the spend was for, when there is one.' },
        total_amount: { label: 'Total' },
        reimbursable_amount: { label: 'To Pay Back', help: 'The expenses the employee paid themselves.' },
        status: {
          label: 'Status',
          options: {
            draft: 'Draft',
            submitted: 'Submitted',
            approved: 'Approved',
            paid: 'Paid',
            rejected: 'Rejected',
          },
        },
        approver: { label: 'Approver' },
        submitted_date: { label: 'Submitted On' },
        approved_date: { label: 'Approved On' },
        description: { label: 'Remarks' },
        review_notes: { label: 'Review Notes', help: 'What a check found, for the approver to read.' },
        crm_expense_request: { label: 'Travel Request', help: 'The approved travel request these expenses were spent on.' },
        request_estimated_amount: { label: 'Trip Estimate', help: 'The estimated amount on the travel request.' },
        request_reported_amount: { label: 'Reported for the Trip', help: "The totals of the travel request's submitted, approved and paid reports." },
        request_over_estimate: { label: 'Over the Trip Estimate' },
        payment_date: { label: 'Paid On' },
        payment_reference: { label: 'Payment Reference' },
      },
      _views: {
        all_expense_reports: { label: 'All Expense Reports' },
        my_expense_reports: { label: 'My Reports' },
        expense_reports_to_approve: { label: 'Reports to Approve' },
        expense_reports_to_pay: { label: 'Reports to Pay' },
      },
      _sections: {
        basic: { label: 'Expense Report' },
        trip: { label: 'Travel Request' },
        payment: { label: 'Payment' },
      },
      _validations: {
        expense_report_status_progression: { message: 'This status change is not allowed. A report moves Draft → Submitted → Approved → Paid; a submitted report can be recalled to Draft, and a rejected one goes back to Draft to be corrected.' },
      },
      _actions: {
        submit_expense_report: { label: 'Submit', successMessage: 'Expense report {{ record.name }} submitted for approval.' },
        reopen_expense_report: { label: 'Back to Draft', successMessage: 'Expense report {{ record.name }} is back in Draft.' },
        mark_expense_report_paid: {
          label: 'Mark as Paid',
          successMessage: 'Expense report {{ record.name }} marked as paid.',
          params: {
            payment_date: { label: 'Paid On' },
            payment_reference: { label: 'Payment Reference' },
          },
        },
      },
    },
    // The travel request (hotcrm#2578).
    crm_expense_request: {
      label: 'Travel Request',
      pluralLabel: 'Travel Requests',
      description: 'Asking before a trip: where, when, why and roughly how much',
      fields: {
        owner_id: { label: 'Traveler' },
        request_number: { label: 'Request Number' },
        name: { label: 'Purpose' },
        destination: { label: 'Destination' },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        days: { label: 'Days' },
        crm_account: { label: 'Account' },
        estimated_amount: { label: 'Estimated Amount', help: 'One total for the whole trip, whoever pays.' },
        reported_amount: { label: 'Reported Amount', help: "The totals of this request's submitted, approved and paid expense reports." },
        estimate_difference: { label: 'Difference from Estimate', help: 'Reported minus estimated. Above zero is over the estimate.' },
        over_estimate: { label: 'Over the Estimate' },
        itinerary: { label: 'Itinerary' },
        notes: { label: 'Notes' },
        source: {
          label: 'Source',
          help: 'Typed by a person, written by an agent, or imported.',
          options: {
            manual: 'Manual',
            agent: 'Agent',
            import: 'Import',
          },
        },
        status: {
          label: 'Status',
          options: {
            draft: 'Draft',
            submitted: 'Submitted',
            approved: 'Approved',
            rejected: 'Rejected',
            cancelled: 'Cancelled',
            closed: 'Closed',
          },
        },
        approver: { label: 'Approver' },
        review_notes: { label: 'Review Notes', help: 'What an assistant or a rule found, for the approver to read.' },
      },
      _views: {
        all_travel_requests: { label: 'All Travel Requests' },
        my_travel_requests: { label: 'My Travel Requests' },
        travel_requests_to_approve: { label: 'Requests to Approve' },
      },
      _sections: {
        trip: { label: 'Trip' },
        spend: { label: 'Spending' },
        review: { label: 'Approval' },
      },
      _validations: {
        expense_request_dates: { message: 'End Date must be on or after Start Date.' },
        expense_request_status_progression: { message: 'This status change is not allowed. A travel request moves Draft → Submitted → Approved or Rejected; a rejected request goes back to Draft to be corrected; an approved one is Cancelled before the trip or Closed after it.' },
      },
      _actions: {
        submit_expense_request: { label: 'Submit', successMessage: 'Travel request {{ record.name }} submitted for approval.' },
        cancel_expense_request: { label: 'Cancel Trip', confirmText: 'Cancel this trip? A cancelled request cannot be reopened; file a new one for a new plan.', successMessage: 'Travel request {{ record.name }} cancelled.' },
        close_expense_request: { label: 'Close', successMessage: 'Travel request {{ record.name }} closed.' },
      },
    },
    crm_expense_request_line: {
      label: 'Itinerary Line',
      pluralLabel: 'Itinerary Lines',
      description: 'One leg of a trip: what to book, from where to where, and when',
      fields: {
        crm_expense_request: { label: 'Travel Request' },
        line_number: { label: 'Line #' },
        kind: {
          label: 'Kind',
          options: {
            flight: 'Flight',
            train: 'Train',
            car: 'Car',
            hotel: 'Hotel',
            other: 'Other',
          },
        },
        origin: { label: 'From' },
        destination: { label: 'To', help: 'Where this leg goes, or where the hotel is.' },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date', help: 'For a hotel, the day you check out. Leave empty for a one-day leg.' },
        details: { label: 'Details', help: 'Seat, hotel or other wishes.' },
        booking_reference: { label: 'Booking Reference', help: 'The confirmation, written after booking by the traveler, an assistant or whoever books.' },
      },
      _views: {
        all_itinerary_lines: { label: 'All Itinerary Lines' },
      },
      _sections: {
        leg: { label: 'Leg' },
        booking: { label: 'Booking' },
      },
      _validations: {
        expense_request_line_dates: { message: 'End Date must be on or after Start Date.' },
      },
    },
    crm_expense_standard: {
      label: 'Expense Standard',
      pluralLabel: 'Expense Standards',
      description: 'A rule the company states about what may be spent, read by people and assistants; nothing in the product enforces it',
      fields: {
        owner_id: { label: 'Owner' },
        name: { label: 'Name', help: 'For example "Hotel, tier-1 cities".' },
        category: {
          label: 'Category',
          help: 'The expense category this standard is about. Empty means any category.',
          options: {
            travel: 'Travel',
            lodging: 'Lodging',
            meals: 'Meals',
            equipment: 'Equipment',
            other: 'Other',
          },
        },
        limit_amount: { label: 'Limit', help: "The most that may be spent, in the organization's currency. Leave empty for a rule in words only." },
        limit_per: {
          label: 'Per',
          help: 'What the limit is counted per.',
          options: {
            night: 'Night',
            day: 'Day',
            item: 'Item',
            trip: 'Trip',
          },
        },
        applies_to: { label: 'Applies To', help: 'Who and where, in words: for example "Managers and above" or "Tier-1 cities".' },
        details: { label: 'Details', help: 'What a number cannot say: exceptions, what is included, whom to ask.' },
        is_active: { label: 'Active', help: 'Clear it to retire a standard without deleting it.' },
      },
      _views: {
        all_expense_standards: { label: 'Expense Standards' },
      },
      _sections: {
        basic: { label: 'Expense Standard' },
      },
    },
  },
  // Step names the approval request shows the submitter and the approvers.
  flows: {
    expense_report_approval: {
      label: 'Expense Report Approval',
      approvals: {
        approver_review: { label: 'Manager Review' },
        finance_review: { label: 'Finance Controller Review' },
      },
    },
    expense_request_approval: {
      label: 'Travel Request Approval',
      approvals: {
        approver_review: { label: 'Manager Review' },
      },
    },
    expense_request_approval_on_create: {
      label: 'Travel Request Approval (on create)',
      approvals: {
        approver_review: { label: 'Manager Review' },
      },
    },
  },
  apps: {
    crm_expenses: {
      label: 'Expenses',
      description: 'What you spent for the company, with its receipts, the trips you ask for beforehand, the reports that pay you back, and what waits for your approval',
      navigation: {
        group_expenses: { label: 'Expenses' },
        nav_my_expenses: { label: 'My Expenses' },
        nav_my_expense_reports: { label: 'My Reports' },
        nav_expense_reports_to_approve: { label: 'Reports to Approve' },
        nav_expense_reports_to_pay: { label: 'Reports to Pay' },
        nav_all_expenses: { label: 'All Expenses' },
        nav_expense_standards: { label: 'Expense Standards' },
        group_travel_requests: { label: 'Travel Requests' },
        nav_my_travel_requests: { label: 'My Travel Requests' },
        nav_travel_requests_to_approve: { label: 'Requests to Approve' },
        nav_all_travel_requests: { label: 'All Travel Requests' },
        group_work: { label: 'My Work' },
        nav_approval_requests: { label: 'Inbox' },
        group_help: { label: 'Help' },
        nav_help_expense: { label: 'Expenses Manual' },
      },
    },
    // My Expenses, Reports to Approve and My Travel Requests, contributed into the Project Delivery app.
    crm_psa: {
      navigation: {
        nav_my_expenses: { label: 'My Expenses' },
        nav_expense_reports_to_approve: { label: 'Reports to Approve' },
        nav_my_travel_requests: { label: 'My Travel Requests' },
      },
    },
  },
  books: {
    crm_expense_manual: {
      label: 'HotCRM Expenses Manual',
      description: 'Recording an expense with its receipt, asking before a trip, sending expenses on a report, who approves them, their payment back, what reaches a project, and what an assistant does for you.',
      groups: { expense: { label: 'Expenses' } },
    },
  },
};
