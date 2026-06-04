# HR Package — Technical Specifications

Technical specification documents for the `packages/hr` module of HotCRM.

## Documents

| Document | Description |
|----------|-------------|
| [Recruitment Pipeline](./recruitment_pipeline.md) | Recruitment lifecycle stages, object relationships, status transitions, and hook automation |
| [Payroll Calculation](./payroll_calculation.md) | Payroll calculation flow, validation rules, and approval workflow |

## Package Overview

The HR package (`packages/hr`) provides human resource management capabilities built on `@objectstack/runtime`. It covers the full employee lifecycle from recruitment through payroll.

### Core Objects

| Object | Source File | Description |
|--------|------------|-------------|
| `recruitment` | `src/recruitment.object.ts` | Job requisition and hiring plan management |
| `candidate` | `src/candidate.object.ts` | Job candidate information management |
| `application` | `src/application.object.ts` | Candidate job application records |
| `interview` | `src/interview.object.ts` | Interview scheduling and evaluation |
| `offer` | `src/offer.object.ts` | Employment offer management |
| `onboarding` | `src/onboarding.object.ts` | New employee onboarding process |
| `employee` | `src/employee.object.ts` | Employee master data |
| `payroll` | `src/payroll.object.ts` | Salary and payroll management |

### Hook Files

| Hook | Source File | Triggers |
|------|------------|----------|
| Recruitment | `src/hooks/recruitment.hook.ts` | Pipeline validation, metrics tracking |
| Candidate | `src/hooks/candidate.hook.ts` | Scoring, auto-screening, status transitions |
| Application | `src/hooks/application.hook.ts` | Status workflow, screening score, auto-progression |
| Interview | `src/hooks/interview.hook.ts` | Scheduling validation, feedback processing |
| Offer | `src/hooks/offer.hook.ts` | Number generation, approval workflow, status automation |
| Onboarding | `src/hooks/onboarding.hook.ts` | Checklist creation, progress tracking |
| Employee | `src/hooks/employee.hook.ts` | Lifecycle management, data validation |
| Payroll | `src/hooks/payroll.hook.ts` | Calculation validation, approval workflow |
