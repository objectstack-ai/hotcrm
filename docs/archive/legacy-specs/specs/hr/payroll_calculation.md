# Payroll Calculation — Technical Specification

## Object Definition

**Object**: `payroll` (`src/payroll.object.ts`)
**Hook**: `src/hooks/payroll.hook.ts`

The payroll object manages employee salary records including gross pay computation, deductions, taxes, and net pay. Key calculated fields (`gross_pay`, `total_deductions`, `net_pay`) are `readonly` and auto-computed by hook logic.

---

## Fields Reference

### Employee & Period

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payroll_number` | text | — | Unique payroll identifier (max 40) |
| `employee_id` | lookup → `employee` | ✅ | Employee receiving payment |
| `pay_period_start` | date | ✅ | Start of pay period |
| `pay_period_end` | date | ✅ | End of pay period |
| `pay_date` | date | ✅ | Scheduled payment date |

### Earnings (Input)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `base_salary` | currency | ✅ | Base salary for the period |
| `overtime_pay` | currency | — | Overtime compensation |
| `bonus` | currency | — | Bonus payment |
| `commission` | currency | — | Sales commission |
| `allowances` | currency | — | Transportation, meal, and other allowances |

### Calculated Fields (Readonly)

| Field | Type | Description |
|-------|------|-------------|
| `gross_pay` | currency | Total gross income before deductions (auto-calculated) |
| `total_deductions` | currency | Sum of all deductions (auto-calculated) |
| `net_pay` | currency | Final pay after deductions (auto-calculated) |

### Deductions (Input)

| Field | Type | Description |
|-------|------|-------------|
| `tax` | currency | Income tax withholding |
| `social_security` | currency | Social security contribution |
| `housing_fund` | currency | Housing fund contribution |
| `other_deductions` | currency | Any additional deductions |

### Time Tracking

| Field | Type | Description |
|-------|------|-------------|
| `worked_days` | number | Days worked in period (precision: 1) |
| `overtime_hours` | number | Overtime hours (precision: 1) |
| `leave_days` | number | Leave days taken (precision: 1) |

### Payment Details

| Field | Type | Description |
|-------|------|-------------|
| `payment_method` | select | `bank_transfer` (default) · `check` · `cash` · `other` |
| `bank_account` | text | Bank account number (max 100) |
| `payslip_url` | url | Link to generated payslip |
| `status` | select | Payroll status (default: `draft`) |

---

## Calculation Flow

```
┌─────────────────────────────────────────────────┐
│                 EARNINGS (Input)                 │
│                                                  │
│  base_salary + overtime_pay + bonus +            │
│  commission + allowances                         │
│              │                                   │
│              ▼                                   │
│  ┌─────────────────────┐                        │
│  │     gross_pay       │  (auto-calculated)     │
│  │                     │                        │
│  │  = base_salary      │  Hook sets gross_pay   │
│  │    + overtime_pay   │  to base_salary when   │
│  │    + bonus          │  not explicitly set    │
│  │    + commission     │                        │
│  │    + allowances     │                        │
│  └────────┬────────────┘                        │
│           │                                     │
│           ▼                                     │
│  ┌─────────────────────┐                        │
│  │   DEDUCTIONS        │                        │
│  │                     │                        │
│  │  tax                │                        │
│  │  + social_security  │                        │
│  │  + housing_fund     │                        │
│  │  + other_deductions │                        │
│  │  ─────────────────  │                        │
│  │  = total_deductions │  (auto-calculated)     │
│  └────────┬────────────┘                        │
│           │                                     │
│           ▼                                     │
│  ┌─────────────────────┐                        │
│  │     net_pay         │  (auto-calculated)     │
│  │                     │                        │
│  │  = gross_pay        │                        │
│  │    - total_deductions                        │
│  └─────────────────────┘                        │
└─────────────────────────────────────────────────┘
```

### Formulas

```
gross_pay        = base_salary + overtime_pay + bonus + commission + allowances
total_deductions = tax + social_security + housing_fund + other_deductions
net_pay          = gross_pay - total_deductions
```

> **Note**: The current hook implementation (`PayrollCalculationValidationTrigger`) sets `gross_pay = base_salary` when `gross_pay` is not explicitly provided. The full calculation including all earnings components is implied by the object schema design.

---

## Validation Rules

### PayrollCalculationValidationTrigger

**Events**: `beforeInsert`, `beforeUpdate`

| Rule | Validation | Error Behavior |
|------|-----------|----------------|
| Base salary range | `base_salary` must be ≥ 0 | Throws error, blocks save |
| Pay period type | `pay_period` must be one of: `weekly`, `bi_weekly`, `semi_monthly`, `monthly` | Throws error, blocks save |
| Gross pay auto-calc | If `base_salary` is set and `gross_pay` is not, `gross_pay` is set to `base_salary` | Silent auto-calculation |

```typescript
// Validation example from payroll.hook.ts
if (doc.base_salary !== undefined && doc.base_salary < 0) {
  throw new Error('❌ base_salary must be greater than or equal to 0');
}

if (doc.pay_period && !VALID_PAY_PERIODS.includes(doc.pay_period)) {
  throw new Error(`❌ Invalid pay_period "${doc.pay_period}". Must be one of: weekly, bi_weekly, semi_monthly, monthly`);
}
```

### Valid Pay Periods

| Value | Description |
|-------|-------------|
| `weekly` | Paid every week |
| `bi_weekly` | Paid every two weeks |
| `semi_monthly` | Paid twice per month |
| `monthly` | Paid once per month |

---

## Approval Workflow

### Status Transitions

```
draft → pending_approval → approved → paid
                              ↓
                          cancelled
```

| Value | Label |
|-------|-------|
| `draft` | Draft (default) |
| `pending_approval` | Pending Approval |
| `approved` | Approved |
| `paid` | Paid |
| `cancelled` | Cancelled |

### PayrollApprovalTrigger

**Events**: `beforeUpdate`

This trigger manages the approval lifecycle:

| Transition | Validation | Action |
|-----------|-----------|--------|
| → `approved` | Checks required fields: `employee`, `pay_period`, `base_salary` | Throws error if any required field is missing |
| → `processed` | None | Auto-sets `processed_date` to current date |

```typescript
// Approval validation from payroll.hook.ts
if (doc.status === 'approved') {
  const requiredFields = ['employee', 'pay_period', 'base_salary'];
  const missingFields = requiredFields.filter(field => !doc[field] && doc[field] !== 0);
  if (missingFields.length > 0) {
    throw new Error(`❌ Cannot approve payroll. Missing required fields: ${missingFields.join(', ')}`);
  }
}
```

### Workflow Steps

1. **Draft**: Payroll record is created with earnings and deduction data. Calculated fields are auto-populated.
2. **Pending Approval**: Record is submitted for review. All data should be finalized.
3. **Approved**: Approval trigger validates required fields (`employee`, `pay_period`, `base_salary`). Record is locked for payment processing.
4. **Paid**: Payment has been executed. `processed_date` is auto-set.
5. **Cancelled**: Record is voided (terminal state).

---

## ObjectQL Usage Examples

### Create a Payroll Record

```typescript
await broker.doc.create('payroll', {
  employee_id: 'emp_001',
  pay_period_start: '2024-01-01',
  pay_period_end: '2024-01-31',
  pay_date: '2024-02-05',
  base_salary: 15000,
  overtime_pay: 2000,
  bonus: 5000,
  allowances: 1500,
  tax: 3200,
  social_security: 1800,
  housing_fund: 1200,
  payment_method: 'bank_transfer',
  bank_account: '6222-XXXX-XXXX-1234'
});
// gross_pay auto-calculated by hook
```

### Query Payroll by Employee

```typescript
const records = await broker.find('payroll', {
  filters: [
    ['employee_id', '=', 'emp_001'],
    ['status', '=', 'approved']
  ],
  sort: 'pay_date desc'
});
```

### Submit for Approval

```typescript
await broker.doc.update('payroll', payrollId, {
  status: 'pending_approval'
});
```

### Approve Payroll

```typescript
// Will throw if employee, pay_period, or base_salary is missing
await broker.doc.update('payroll', payrollId, {
  status: 'approved'
});
```

---

## Related Objects

| Object | Relationship | Description |
|--------|-------------|-------------|
| `employee` | `employee_id` (lookup) | The employee this payroll belongs to |
| `attendance` | Indirect | Attendance data feeds into `worked_days` and `overtime_hours` |
| `time_off` | Indirect | Time off records feed into `leave_days` |
