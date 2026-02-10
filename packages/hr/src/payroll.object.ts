import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Payroll = ObjectSchema.create({
  name: 'payroll',
  label: 'Payroll',
  pluralLabel: 'Payroll Records',
  icon: 'money-bill-wave',
  description: 'Employee salary and payroll management',

  fields: {
    payroll_number: Field.text({
      label: 'Payroll Number',
      unique: true,
      maxLength: 40
    }),
    employee_id: Field.lookup('employee', {
      label: 'Employee',
      required: true
    }),
    pay_period_start: Field.date({
      label: 'Pay Period Start',
      required: true
    }),
    pay_period_end: Field.date({
      label: 'Pay Period End',
      required: true
    }),
    pay_date: Field.date({
      label: 'Pay Date',
      required: true
    }),
    base_salary: Field.currency({
      label: 'Base Salary',
      required: true,
      precision: 2
    }),
    overtime_pay: Field.currency({
      label: 'Overtime Pay',
      precision: 2
    }),
    bonus: Field.currency({
      label: 'Bonus',
      precision: 2
    }),
    commission: Field.currency({
      label: 'Commission',
      precision: 2
    }),
    allowances: Field.currency({
      label: 'Allowances',
      description: 'Transportation, meal, and other allowances',
      precision: 2
    }),
    gross_pay: Field.currency({
      label: 'Gross Pay',
      description: 'Total gross income before tax (auto-calculated)',
      readonly: true,
      precision: 2
    }),
    tax: Field.currency({
      label: 'Income Tax',
      precision: 2
    }),
    social_security: Field.currency({
      label: 'Social Security',
      precision: 2
    }),
    housing_fund: Field.currency({
      label: 'Housing Fund',
      precision: 2
    }),
    other_deductions: Field.currency({
      label: 'Other Deductions',
      precision: 2
    }),
    total_deductions: Field.currency({
      label: 'Total Deductions',
      description: 'Total deduction amount (auto-calculated)',
      readonly: true,
      precision: 2
    }),
    net_pay: Field.currency({
      label: 'Net Pay',
      description: 'Net pay after tax (auto-calculated)',
      readonly: true,
      precision: 2
    }),
    worked_days: Field.number({
      label: 'Worked Days',
      precision: 1
    }),
    overtime_hours: Field.number({
      label: 'Overtime Hours',
      precision: 1
    }),
    leave_days: Field.number({
      label: 'Leave Days',
      precision: 1
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'draft',
      options: [
        {
          "label": "Draft",
          "value": "draft"
        },
        {
          "label": "Pending Approval",
          "value": "pending_approval"
        },
        {
          "label": "Approved",
          "value": "approved"
        },
        {
          "label": "Paid",
          "value": "paid"
        },
        {
          "label": "Cancelled",
          "value": "cancelled"
        }
      ]
    }),
    payment_method: Field.select({
      label: 'Payment Method',
      defaultValue: 'bank_transfer',
      options: [
        {
          "label": "Bank Transfer",
          "value": "bank_transfer"
        },
        {
          "label": "Check",
          "value": "check"
        },
        {
          "label": "Cash",
          "value": "cash"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    bank_account: Field.text({
      label: 'Bank Account',
      maxLength: 100
    }),
    payslip_url: Field.url({ label: 'Payslip URL' }),
    notes: Field.textarea({
      label: 'Notes',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: false,
  },
});