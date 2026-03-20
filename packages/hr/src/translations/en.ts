import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — Human Capital Management Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 * Each file exports a single `TranslationData` object for its locale.
 *
 * Covers all 18 HR objects with field labels, select options, and help texts.
 */
export const en: TranslationData = {
  objects: {
    department: {
      label: 'Department',
      pluralLabel: 'Departments',
      fields: {
        name: { label: 'Department Name' },
        description: { label: 'Description' },
        parent_department_id: { label: 'Parent Department' },
        manager_id: { label: 'Department Manager' },
        cost_center: { label: 'Cost Center' },
        headcount: { label: 'Headcount' },
        budget: { label: 'Budget' },
        status: {
          label: 'Status',
          options: { Active: 'Active', Inactive: 'Inactive', Restructuring: 'Restructuring' },
        },
      },
    },

    position: {
      label: 'Position',
      pluralLabel: 'Positions',
      fields: {
        title: { label: 'Position Title' },
        description: { label: 'Description' },
        department_id: { label: 'Department' },
        reports_to_id: { label: 'Reports To' },
        level: {
          label: 'Level',
          options: {
            Entry: 'Entry', Junior: 'Junior', Mid: 'Mid', Senior: 'Senior',
            Lead: 'Lead', Manager: 'Manager', Director: 'Director', VP: 'VP', 'C-Level': 'C-Level',
          },
        },
        type: {
          label: 'Position Type',
          options: {
            'Full-Time': 'Full-Time', 'Part-Time': 'Part-Time',
            Contract: 'Contract', Intern: 'Intern', Temporary: 'Temporary',
          },
        },
        status: {
          label: 'Status',
          options: { Open: 'Open', Filled: 'Filled', 'On Hold': 'On Hold', Closed: 'Closed' },
        },
        min_salary: { label: 'Minimum Salary' },
        max_salary: { label: 'Maximum Salary' },
        location: { label: 'Location' },
        headcount: { label: 'Headcount' },
      },
    },

    employee: {
      label: 'Employee',
      pluralLabel: 'Employees',
      fields: {
        employee_number: { label: 'Employee Number' },
        first_name: { label: 'First Name' },
        last_name: { label: 'Last Name' },
        email: { label: 'Email' },
        phone: { label: 'Phone' },
        department_id: { label: 'Department' },
        position_id: { label: 'Position' },
        manager_id: { label: 'Manager' },
        hire_date: { label: 'Hire Date' },
        termination_date: { label: 'Termination Date' },
        status: {
          label: 'Status',
          options: {
            Active: 'Active', 'On Leave': 'On Leave', Terminated: 'Terminated',
            Probation: 'Probation', Retired: 'Retired',
          },
        },
        employment_type: {
          label: 'Employment Type',
          options: {
            'Full-Time': 'Full-Time', 'Part-Time': 'Part-Time',
            Contract: 'Contract', Intern: 'Intern', Temporary: 'Temporary',
          },
        },
        location: { label: 'Location' },
        date_of_birth: { label: 'Date of Birth' },
        gender: {
          label: 'Gender',
          options: {
            Male: 'Male', Female: 'Female',
            'Non-Binary': 'Non-Binary', 'Prefer Not to Say': 'Prefer Not to Say',
          },
        },
        emergency_contact_name: { label: 'Emergency Contact' },
        emergency_contact_phone: { label: 'Emergency Phone' },
        annual_salary: { label: 'Annual Salary' },
        profile_photo: { label: 'Photo' },
      },
    },

    recruitment: {
      label: 'Recruitment',
      pluralLabel: 'Recruitments',
      fields: {
        title: { label: 'Job Title' },
        description: { label: 'Description' },
        department_id: { label: 'Department' },
        position_id: { label: 'Position' },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft', Open: 'Open', 'In Progress': 'In Progress',
            'On Hold': 'On Hold', Filled: 'Filled', Cancelled: 'Cancelled',
          },
        },
        priority: {
          label: 'Priority',
          options: { Low: 'Low', Medium: 'Medium', High: 'High', Urgent: 'Urgent' },
        },
        number_of_openings: { label: 'Number of Openings' },
        target_hire_date: { label: 'Target Hire Date' },
        hiring_manager_id: { label: 'Hiring Manager' },
        recruiter_id: { label: 'Recruiter' },
        min_salary: { label: 'Minimum Salary' },
        max_salary: { label: 'Maximum Salary' },
        location: { label: 'Location' },
        employment_type: {
          label: 'Employment Type',
          options: {
            'Full-Time': 'Full-Time', 'Part-Time': 'Part-Time',
            Contract: 'Contract', Intern: 'Intern', Temporary: 'Temporary',
          },
        },
        source_channels: { label: 'Source Channels' },
      },
    },

    candidate: {
      label: 'Candidate',
      pluralLabel: 'Candidates',
      fields: {
        first_name: { label: 'First Name' },
        last_name: { label: 'Last Name' },
        email: { label: 'Email' },
        phone: { label: 'Phone' },
        status: {
          label: 'Status',
          options: {
            New: 'New', Screening: 'Screening', Interview: 'Interview',
            Assessment: 'Assessment', Offer: 'Offer', Hired: 'Hired',
            Rejected: 'Rejected', Withdrawn: 'Withdrawn',
          },
        },
        source: {
          label: 'Source',
          options: {
            LinkedIn: 'LinkedIn', Indeed: 'Indeed', Referral: 'Referral',
            'Career Page': 'Career Page', Agency: 'Agency',
            University: 'University', Other: 'Other',
          },
        },
        recruitment_id: { label: 'Recruitment' },
        resume: { label: 'Resume' },
        cover_letter: { label: 'Cover Letter' },
        current_company: { label: 'Current Company' },
        current_title: { label: 'Current Title' },
        experience_years: { label: 'Years of Experience' },
        expected_salary: { label: 'Expected Salary' },
        ai_score: { label: 'AI Score', help: 'AI-generated candidate match score' },
        skills: { label: 'Skills' },
        notes: { label: 'Notes' },
      },
    },

    application: {
      label: 'Application',
      pluralLabel: 'Applications',
      fields: {
        candidate_id: { label: 'Candidate' },
        recruitment_id: { label: 'Recruitment' },
        status: {
          label: 'Status',
          options: {
            Submitted: 'Submitted', 'Under Review': 'Under Review',
            Interview: 'Interview', Assessment: 'Assessment',
            Offer: 'Offer', Accepted: 'Accepted',
            Rejected: 'Rejected', Withdrawn: 'Withdrawn',
          },
        },
        applied_date: { label: 'Applied Date' },
        screening_score: { label: 'Screening Score' },
        notes: { label: 'Notes' },
        resume_match_score: { label: 'Resume Match Score', help: 'AI-calculated resume-to-job match percentage' },
      },
    },

    interview: {
      label: 'Interview',
      pluralLabel: 'Interviews',
      fields: {
        candidate_id: { label: 'Candidate' },
        recruitment_id: { label: 'Recruitment' },
        interviewer_id: { label: 'Interviewer' },
        type: {
          label: 'Interview Type',
          options: {
            'Phone Screen': 'Phone Screen', Video: 'Video', 'In-Person': 'In-Person',
            Panel: 'Panel', Technical: 'Technical', 'Culture Fit': 'Culture Fit',
          },
        },
        status: {
          label: 'Status',
          options: {
            Scheduled: 'Scheduled', Completed: 'Completed', Cancelled: 'Cancelled',
            'No Show': 'No Show', Rescheduled: 'Rescheduled',
          },
        },
        scheduled_date: { label: 'Scheduled Date' },
        duration_minutes: { label: 'Duration (min)' },
        location: { label: 'Location' },
        rating: { label: 'Rating' },
        feedback: { label: 'Feedback' },
        recommendation: {
          label: 'Recommendation',
          options: {
            'Strong Hire': 'Strong Hire', Hire: 'Hire',
            'No Hire': 'No Hire', 'Strong No Hire': 'Strong No Hire',
          },
        },
      },
    },

    offer: {
      label: 'Offer',
      pluralLabel: 'Offers',
      fields: {
        candidate_id: { label: 'Candidate' },
        recruitment_id: { label: 'Recruitment' },
        position_id: { label: 'Position' },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft', 'Pending Approval': 'Pending Approval',
            Approved: 'Approved', Extended: 'Extended',
            Accepted: 'Accepted', Rejected: 'Rejected',
            Expired: 'Expired', Withdrawn: 'Withdrawn',
          },
        },
        salary: { label: 'Salary' },
        start_date: { label: 'Start Date' },
        expiration_date: { label: 'Expiration Date' },
        signing_bonus: { label: 'Signing Bonus' },
        equity: { label: 'Equity' },
        benefits_package: { label: 'Benefits Package' },
        notes: { label: 'Notes' },
        approved_by_id: { label: 'Approved By' },
      },
    },

    onboarding: {
      label: 'Onboarding',
      pluralLabel: 'Onboardings',
      fields: {
        employee_id: { label: 'Employee' },
        status: {
          label: 'Status',
          options: {
            'Not Started': 'Not Started', 'In Progress': 'In Progress',
            Completed: 'Completed', Overdue: 'Overdue',
          },
        },
        start_date: { label: 'Start Date' },
        target_completion_date: { label: 'Target Completion' },
        actual_completion_date: { label: 'Actual Completion' },
        checklist_items: { label: 'Checklist Items' },
        completed_items: { label: 'Completed Items' },
        buddy_id: { label: 'Buddy/Mentor' },
        notes: { label: 'Notes' },
      },
    },

    performance_review: {
      label: 'Performance Review',
      pluralLabel: 'Performance Reviews',
      fields: {
        employee_id: { label: 'Employee' },
        reviewer_id: { label: 'Reviewer' },
        review_period: { label: 'Review Period' },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft', 'Self-Review': 'Self-Review', 'Manager Review': 'Manager Review',
            Calibration: 'Calibration', Completed: 'Completed',
          },
        },
        overall_rating: {
          label: 'Overall Rating',
          options: {
            'Exceeds Expectations': 'Exceeds Expectations', 'Meets Expectations': 'Meets Expectations',
            'Needs Improvement': 'Needs Improvement', 'Below Expectations': 'Below Expectations',
          },
        },
        self_assessment: { label: 'Self Assessment' },
        manager_assessment: { label: 'Manager Assessment' },
        goals_achievement: { label: 'Goals Achievement' },
        strengths: { label: 'Strengths' },
        areas_for_improvement: { label: 'Areas for Improvement' },
        development_plan: { label: 'Development Plan' },
        due_date: { label: 'Due Date' },
      },
    },

    goal: {
      label: 'Goal',
      pluralLabel: 'Goals',
      fields: {
        title: { label: 'Goal Title' },
        description: { label: 'Description' },
        employee_id: { label: 'Employee' },
        type: {
          label: 'Goal Type',
          options: { Individual: 'Individual', Team: 'Team', Department: 'Department', Company: 'Company' },
        },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft', Active: 'Active', Completed: 'Completed',
            Cancelled: 'Cancelled', 'On Hold': 'On Hold',
          },
        },
        priority: {
          label: 'Priority',
          options: { Low: 'Low', Medium: 'Medium', High: 'High', Critical: 'Critical' },
        },
        start_date: { label: 'Start Date' },
        due_date: { label: 'Due Date' },
        progress: { label: 'Progress' },
        metric: { label: 'Success Metric' },
        parent_goal_id: { label: 'Parent Goal' },
        review_id: { label: 'Performance Review' },
      },
    },

    training: {
      label: 'Training',
      pluralLabel: 'Trainings',
      fields: {
        name: { label: 'Training Name' },
        description: { label: 'Description' },
        type: {
          label: 'Training Type',
          options: {
            Online: 'Online', 'In-Person': 'In-Person', Workshop: 'Workshop',
            Conference: 'Conference', 'Self-Paced': 'Self-Paced', Mentoring: 'Mentoring',
          },
        },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft', Scheduled: 'Scheduled', 'In Progress': 'In Progress',
            Completed: 'Completed', Cancelled: 'Cancelled',
          },
        },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        duration_hours: { label: 'Duration (hours)' },
        max_participants: { label: 'Max Participants' },
        enrolled_count: { label: 'Enrolled' },
        completed_count: { label: 'Completed' },
        instructor_id: { label: 'Instructor' },
        location: { label: 'Location' },
        cost: { label: 'Cost' },
        is_mandatory: { label: 'Mandatory' },
      },
    },

    certification: {
      label: 'Certification',
      pluralLabel: 'Certifications',
      fields: {
        employee_id: { label: 'Employee' },
        name: { label: 'Certification Name' },
        issuing_body: { label: 'Issuing Body' },
        issue_date: { label: 'Issue Date' },
        expiration_date: { label: 'Expiration Date' },
        credential_id: { label: 'Credential ID' },
        status: {
          label: 'Status',
          options: {
            Active: 'Active', Expired: 'Expired',
            Revoked: 'Revoked', 'Pending Renewal': 'Pending Renewal',
          },
        },
        verification_url: { label: 'Verification URL' },
      },
    },

    time_off: {
      label: 'Time Off',
      pluralLabel: 'Time Off Requests',
      fields: {
        employee_id: { label: 'Employee' },
        type: {
          label: 'Leave Type',
          options: {
            Vacation: 'Vacation', 'Sick Leave': 'Sick Leave', Personal: 'Personal',
            Maternity: 'Maternity', Paternity: 'Paternity', Bereavement: 'Bereavement',
            'Jury Duty': 'Jury Duty', Other: 'Other',
          },
        },
        status: {
          label: 'Status',
          options: { Pending: 'Pending', Approved: 'Approved', Rejected: 'Rejected', Cancelled: 'Cancelled' },
        },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        days_requested: { label: 'Days Requested' },
        reason: { label: 'Reason' },
        approver_id: { label: 'Approver' },
        approved_date: { label: 'Approved Date' },
      },
    },

    attendance: {
      label: 'Attendance',
      pluralLabel: 'Attendance Records',
      fields: {
        employee_id: { label: 'Employee' },
        date: { label: 'Date' },
        clock_in: { label: 'Clock In' },
        clock_out: { label: 'Clock Out' },
        total_hours: { label: 'Total Hours' },
        status: {
          label: 'Status',
          options: {
            Present: 'Present', Absent: 'Absent', Late: 'Late',
            'Half Day': 'Half Day', Remote: 'Remote', Holiday: 'Holiday',
          },
        },
        notes: { label: 'Notes' },
      },
    },

    payroll: {
      label: 'Payroll',
      pluralLabel: 'Payroll Records',
      fields: {
        employee_id: { label: 'Employee' },
        period_start: { label: 'Period Start' },
        period_end: { label: 'Period End' },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft', Calculated: 'Calculated', Approved: 'Approved',
            Paid: 'Paid', Void: 'Void',
          },
        },
        base_salary: { label: 'Base Salary' },
        overtime_pay: { label: 'Overtime Pay' },
        deductions: { label: 'Deductions' },
        tax_amount: { label: 'Tax Amount' },
        net_pay: { label: 'Net Pay' },
        payment_date: { label: 'Payment Date' },
        payment_method: {
          label: 'Payment Method',
          options: {
            'Direct Deposit': 'Direct Deposit', Check: 'Check', 'Wire Transfer': 'Wire Transfer',
          },
        },
      },
    },

    benefit: {
      label: 'Benefit',
      pluralLabel: 'Benefits',
      fields: {
        name: { label: 'Benefit Name' },
        description: { label: 'Description' },
        type: {
          label: 'Benefit Type',
          options: {
            'Health Insurance': 'Health Insurance', Dental: 'Dental', Vision: 'Vision',
            'Life Insurance': 'Life Insurance', '401k': '401k', 'Stock Options': 'Stock Options',
            PTO: 'PTO', Education: 'Education', Wellness: 'Wellness', Other: 'Other',
          },
        },
        status: {
          label: 'Status',
          options: { Active: 'Active', Inactive: 'Inactive', Pending: 'Pending' },
        },
        provider: { label: 'Provider' },
        employer_contribution: { label: 'Employer Contribution' },
        employee_contribution: { label: 'Employee Contribution' },
        enrollment_start: { label: 'Enrollment Start' },
        enrollment_end: { label: 'Enrollment End' },
        is_mandatory: { label: 'Mandatory' },
      },
    },

    compensation_plan: {
      label: 'Compensation Plan',
      pluralLabel: 'Compensation Plans',
      fields: {
        employee_id: { label: 'Employee' },
        effective_date: { label: 'Effective Date' },
        base_salary: { label: 'Base Salary' },
        bonus_target: { label: 'Bonus Target' },
        commission_rate: { label: 'Commission Rate' },
        equity_grants: { label: 'Equity Grants' },
        total_compensation: { label: 'Total Compensation' },
        currency: { label: 'Currency' },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Active: 'Active', Expired: 'Expired', Superseded: 'Superseded' },
        },
        approved_by_id: { label: 'Approved By' },
        notes: { label: 'Notes' },
      },
    },
  },

  apps: {
    hr: {
      label: 'Human Capital Management',
      description: 'Complete HR/HCM solution for employee lifecycle management',
    },
  },

  messages: {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.back': 'Back',
    'common.confirm': 'Confirm',
    'common.refresh': 'Refresh',
    'nav.organization': 'Organization',
    'nav.talent_acquisition': 'Talent Acquisition',
    'nav.performance_development': 'Performance & Development',
    'nav.time_payroll': 'Time & Payroll',
    'nav.benefits_compensation': 'Benefits & Compensation',
    'nav.views_dashboards': 'Views & Dashboards',
    'nav.recruitment_pipeline': 'Recruitment Pipeline',
    'nav.hr_dashboard': 'HR Dashboard',
    'success.saved': 'Record saved successfully',
    'success.deleted': 'Record deleted successfully',
    'success.employee_created': 'Employee created successfully',
    'success.offer_extended': 'Offer extended successfully',
    'success.onboarding_completed': 'Onboarding completed successfully',
    'success.review_submitted': 'Performance review submitted successfully',
    'success.time_off_approved': 'Time off request approved',
    'success.payroll_processed': 'Payroll processed successfully',
    'confirm.delete': 'Are you sure you want to delete this record?',
    'confirm.terminate_employee': 'Terminate this employee? This action will update all related records.',
    'confirm.approve_offer': 'Approve this offer and send to candidate?',
    'confirm.submit_review': 'Submit this performance review? This cannot be undone.',
    'confirm.process_payroll': 'Process payroll for the selected period?',
    'error.required': 'This field is required',
    'error.load_failed': 'Failed to load data',
    'error.save_failed': 'Failed to save record',
    'error.employee_not_found': 'Employee not found',
    'error.duplicate_employee_number': 'An employee with this number already exists',
    'error.interview_conflict': 'This time slot conflicts with another interview',
  },

  validationMessages: {
    hire_date_required: 'Hire date is required for active employees',
    salary_range_invalid: 'Maximum salary must be greater than minimum salary',
    time_off_exceeds_balance: 'Requested days exceed available leave balance',
    review_incomplete: 'All required sections must be completed before submission',
    offer_expired: 'This offer has passed its expiration date',
    interview_date_past: 'Interview cannot be scheduled in the past',
    onboarding_already_completed: 'Onboarding has already been completed for this employee',
    termination_date_before_hire: 'Termination date cannot be before hire date',
    payroll_period_overlap: 'Payroll period overlaps with an existing record',
    certification_expired: 'This certification has expired and requires renewal',
    goal_due_date_required: 'Due date is required for active goals',
    compensation_effective_date_required: 'Effective date is required for compensation plans',
  },
};
