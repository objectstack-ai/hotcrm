# Recruitment Pipeline — Technical Specification

## Lifecycle Overview

The recruitment pipeline follows a linear lifecycle through six interconnected objects:

```
Recruitment → Candidate → Application → Interview → Offer → Onboarding → Employee
```

Each stage is backed by a dedicated object and hook file that manages validation, automation, and cross-object transitions.

---

## Object Relationships

```
┌──────────────┐
│  recruitment │──────────────────────────────────────────┐
│              │                                          │
│ position_id ─┼──► position                              │
│ department_id┼──► department                            │
│ hiring_mgr_id┼──► employee                              │
└──────┬───────┘                                          │
       │ referenced by                                    │
       ▼                                                  │
┌──────────────┐     ┌──────────────┐                     │
│  candidate   │◄────┤  application │                     │
│              │     │              │                     │
│              │     │ candidate_id ┼──► candidate         │
│              │     │ recruitment_id──► recruitment       │
│              │     │ referrer_id ─┼──► employee          │
└──────────────┘     └──────┬───────┘                     │
                            │ referenced by               │
                            ▼                             │
                     ┌──────────────┐                     │
                     │  interview   │                     │
                     │              │                     │
                     │ candidate_id ┼──► candidate         │
                     │ application_id──► application       │
                     │ recruitment_id──► recruitment       │
                     │ interviewer_id──► employee          │
                     └──────┬───────┘                     │
                            │ referenced by               │
                            ▼                             │
                     ┌──────────────┐                     │
                     │    offer     │                     │
                     │              │                     │
                     │ candidate_id ┼──► candidate         │
                     │ application_id──► application       │
                     │ recruitment_id──► recruitment ◄─────┘
                     │ position_id ─┼──► position
                     │ department_id┼──► department
                     │ hiring_mgr_id┼──► employee
                     └──────┬───────┘
                            │ triggers creation of
                            ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  onboarding  │────►│   employee   │
                     │              │     │              │
                     │ employee_id ─┼──►  │ department_id┼──► department
                     │ offer_id ────┼──►  │ position_id ─┼──► position
                     │ buddy_id ────┼──►  │ manager_id ──┼──► employee
                     │ manager_id ──┼──►  └──────────────┘
                     └──────────────┘
```

---

## Stage 1: Recruitment Requisition

**Object**: `recruitment` (`src/recruitment.object.ts`)
**Hook**: `src/hooks/recruitment.hook.ts`

### Key Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | text | ✅ | Recruitment title (max 255) |
| `requisition_number` | text | — | Unique requisition number (max 40) |
| `position_id` | lookup → `position` | ✅ | Target position |
| `department_id` | lookup → `department` | ✅ | Requesting department |
| `hiring_manager_id` | lookup → `employee` | ✅ | Responsible manager |
| `headcount` | number | ✅ | Number of openings (default: 1) |
| `priority` | select | — | `urgent` · `high` · `medium` (default) · `low` |
| `status` | select | — | See status transitions below |
| `target_start_date` | date | — | Desired start date |
| `posted_date` | date | — | Date position was posted |
| `close_date` | date | — | Date position was closed |
| `salary_range_min` | currency | — | Minimum salary |
| `salary_range_max` | currency | — | Maximum salary |
| `job_description` | textarea | — | Position responsibilities and requirements |
| `requirements` | textarea | — | Education, experience, skills |

### Status Transitions

```
draft → pending_approval → open → in_progress → filled
                             ↓         ↓
                          on_hold   cancelled
```

| Value | Label |
|-------|-------|
| `draft` | Draft |
| `pending_approval` | Pending Approval |
| `open` | Open (default) |
| `in_progress` | In Progress |
| `on_hold` | On Hold |
| `filled` | Completed |
| `cancelled` | Cancelled |

### Hook Automation

**RecruitmentPipelineValidationTrigger** (`beforeInsert`, `beforeUpdate`)
- Validates the `stage` field against allowed values: `sourcing`, `screening`, `interviewing`, `offer`, `hired`, `closed`
- Auto-sets `status` to `open` on insert if not provided

**RecruitmentMetricsTrigger** (`afterUpdate`)
- Logs pipeline stage transitions for analytics when the `stage` field changes

---

## Stage 2: Candidate

**Object**: `candidate` (`src/candidate.object.ts`)
**Hook**: `src/hooks/candidate.hook.ts`

### Key Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | text | ✅ | First name (max 40) |
| `last_name` | text | ✅ | Last name (max 80) |
| `email` | email | ✅ | Unique email |
| `phone` | phone | — | Phone number |
| `mobile_phone` | phone | ✅ | Mobile phone |
| `linkedin_url` | url | — | LinkedIn profile |
| `current_company` | text | — | Current employer |
| `current_title` | text | — | Current job title |
| `years_of_experience` | number | — | Total years of experience (precision: 1) |
| `highest_education` | select | — | `phd` · `master` · `bachelor` · `associate` · `high_school` · `other` |
| `current_salary` | currency | — | Current compensation |
| `expected_salary` | currency | — | Desired compensation |
| `notice_period` | select | — | `immediate` · `one_week` · `two_weeks` · `one_month` · `two_months` · `three_months` |
| `source` | select | — | `job_board` · `employee_referral` · `headhunter` · `social_media` · `campus` · `direct_application` · `other` |
| `status` | select | — | See status transitions below |
| `resume_url` | url | — | Link to resume |

### Status Transitions

```
new → under_review → interviewing → hired
                          ↓
                      rejected / withdrawn
```

| Value | Label |
|-------|-------|
| `new` | New (default) |
| `under_review` | Under Review |
| `interviewing` | Interviewing |
| `hired` | Hired |
| `rejected` | Rejected |
| `withdrawn` | Withdrawn |

### Hook Automation

**CandidateScoringTrigger** (`beforeInsert`, `beforeUpdate`)

Calculates a candidate score (0–100) from four dimensions:

| Dimension | Max Points | Scoring Logic |
|-----------|-----------|---------------|
| Education | 25 | PhD=25, Master=20, Bachelor=15, Associate=10, High School=5, Other=3 |
| Experience | 30 | ≥10y=30, ≥7y=25, ≥5y=20, ≥3y=15, ≥1y=10, <1y=5 |
| Source Quality | 15 | Referral=15, Headhunter=12, Campus=10, Job Board=8, Social=7, Direct=6, Other=5 |
| Availability | 10 | Immediate=10, 1wk=9, 2wk=8, 1mo=6, 2mo=4, 3mo=2 |
| Profile Completeness | 20 | Ratio of filled fields × 20 (checks 10 key fields) |

Additional automation:
- **Duplicate detection**: Queries for existing candidates with the same `email` on insert or email change
- **Auto-screening**: On insert, if `status` is `new`, auto-promotes to `under_review` when `email`, `mobile_phone`, and `resume_url` are all present

**CandidateStatusChangeTrigger** (`afterUpdate`)

Executes side effects when `status` changes:

| New Status | Action |
|------------|--------|
| `interviewing` | Logs interview stage transition; schedules interview process |
| `hired` | Initiates offer record, onboarding, welcome email |
| `rejected` | Triggers rejection email, archives candidate data |
| `withdrawn` | Logs withdrawal reason, updates recruitment metrics |

---

## Stage 3: Application

**Object**: `application` (`src/application.object.ts`)
**Hook**: `src/hooks/application.hook.ts`

### Key Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `application_number` | text | — | Unique application number (max 40) |
| `candidate_id` | lookup → `candidate` | ✅ | Linked candidate |
| `recruitment_id` | lookup → `recruitment` | ✅ | Linked requisition |
| `applied_date` | date | ✅ | Application date (default: today) |
| `status` | select | — | Application status (default: `submitted`) |
| `stage` | select | — | Current pipeline stage |
| `source` | select | — | Source channel (mirrors candidate source options) |
| `referrer_id` | lookup → `employee` | — | Employee referrer |
| `resume_url` | url | — | Resume link |
| `cover_letter` | textarea | — | Cover letter text |
| `rejection_reason` | textarea | — | Reason if rejected |

### Status Values

| Value | Label |
|-------|-------|
| `submitted` | Submitted (default) |
| `screening` | Screening |
| `interview_scheduled` | Interview Scheduled |
| `interviewing` | Interviewing |
| `shortlisted` | Shortlisted |
| `offer_extended` | Hired |
| `rejected` | Rejected |
| `withdrawn` | Withdrawn |

### Stage Values (Pipeline Position)

| Value | Label |
|-------|-------|
| `resume_review` | Resume Review |
| `phone_screen` | Phone Screen |
| `first_interview` | First Interview |
| `second_interview` | Second Interview |
| `final_interview` | Final Interview |
| `offer_discussion` | Offer Discussion |
| `background_check` | Background Check |

### Hook Automation

**ApplicationStatusWorkflowTrigger** (`afterUpdate`)

Enforces valid status transitions:

```
new → screening → interview → offer → hired
                      ↓          ↓
                  rejected    rejected
```

Actions on transition:
- **→ `interview`**: Auto-creates an `interview` record (Phone Screen type, scheduled 3 days out, 60 min duration)
- **→ `hired`**: Updates the linked `candidate` status to `hired`

**ApplicationScreeningTrigger** (`afterInsert`)

On new application creation:
1. Fetches the linked `candidate` and `recruitment` records
2. Calculates a screening score (0–100) based on:

| Dimension | Max Points |
|-----------|-----------|
| Experience | 30 |
| Education | 20 |
| Resume provided | 15 |
| Contact completeness | 15 |
| Availability | 10 |
| Source quality | 10 |

3. If score ≥ 70, auto-progresses application status to `screening`
4. Stores the score in `notes` field

---

## Stage 4: Interview

**Object**: `interview` (`src/interview.object.ts`)
**Hook**: `src/hooks/interview.hook.ts`

### Key Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | text | ✅ | Interview title (max 255) |
| `candidate_id` | lookup → `candidate` | ✅ | Candidate being interviewed |
| `application_id` | lookup → `application` | ✅ | Linked application |
| `recruitment_id` | lookup → `recruitment` | ✅ | Linked requisition |
| `interview_type` | select | — | Type of interview (default: `first_round`) |
| `scheduled_date` | datetime | ✅ | Interview date and time |
| `duration` | number | — | Duration in minutes (default: 60) |
| `location` | text | — | Physical location or meeting link |
| `interviewer_id` | lookup → `employee` | ✅ | Lead interviewer |
| `panel_members` | text | — | Comma-separated panel members |
| `status` | select | — | Interview status (default: `scheduled`) |
| `result` | select | — | Interview outcome |
| `feedback` | textarea | — | Detailed evaluation |
| `strengths` | textarea | — | Candidate strengths |
| `weaknesses` | textarea | — | Candidate weaknesses |

### Interview Types

| Value | Label |
|-------|-------|
| `phone_screen` | Phone Screen |
| `video_interview` | Video Interview |
| `first_round` | First Interview (default) |
| `second_round` | Second Interview |
| `final_round` | Final Interview |
| `technical` | Technical |
| `hr` | HR Interview |

### Status Values

| Value | Label |
|-------|-------|
| `scheduled` | Scheduled (default) |
| `confirmed` | Confirmed |
| `in_progress` | In Progress |
| `completed` | Completed |
| `cancelled` | Cancelled |
| `no_show` | No Show |
| `rescheduled` | Rescheduled |

### Result Values

| Value | Label |
|-------|-------|
| `strong_hire` | Strong Hire |
| `hire` | Hire |
| `maybe` | Maybe |
| `no_hire` | No Hire |
| `strong_no_hire` | Strong No Hire |

### Hook Automation

**InterviewSchedulingTrigger** (`beforeInsert`)
- Sets default duration to 60 minutes if not provided
- Warns if `scheduled_date` is in the past (allows for historical entry)
- Checks interviewer double-booking by querying existing non-cancelled interviews on the same date
- Sets default `status` to `scheduled` if not provided

**InterviewFeedbackTrigger** (`afterUpdate`)

Fires when `result` changes from null to a value:
- Updates application status based on result (`pass` → `offer`, `fail` → `rejected`, `hold` → remains in `interview`)
- Calculates average interview score across all completed interviews for the same application (pass=100, hold=50, fail=0)
- Stores average score in the application's `notes` field

---

## Stage 5: Offer

**Object**: `offer` (`src/offer.object.ts`)
**Hook**: `src/hooks/offer.hook.ts`

### Key Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `offer_number` | text | — | Auto-generated unique number (format: `OFF-YYYYMM-NNNN`) |
| `candidate_id` | lookup → `candidate` | ✅ | Candidate receiving offer |
| `application_id` | lookup → `application` | ✅ | Linked application |
| `recruitment_id` | lookup → `recruitment` | ✅ | Linked requisition |
| `position_id` | lookup → `position` | ✅ | Offered position |
| `department_id` | lookup → `department` | ✅ | Target department |
| `hiring_manager_id` | lookup → `employee` | ✅ | Hiring manager |
| `offer_date` | date | ✅ | Offer date (default: today) |
| `expiry_date` | date | — | Auto-set to 7 days after `offer_date` |
| `start_date` | date | ✅ | Expected start date |
| `base_salary` | currency | ✅ | Base salary |
| `bonus` | currency | — | Signing/annual bonus |
| `equity` | text | — | Equity/stock options description |
| `benefits` | textarea | — | Benefits package description |
| `employment_type` | select | — | `full_time` (default) · `part_time` · `contract` · `intern` |
| `probation_period` | select | — | `none` · `one_month` · `two_months` · `three_months` · `six_months` |
| `status` | select | — | Offer status (default: `draft`) |
| `response_date` | date | — | Date candidate responded |
| `rejection_reason` | textarea | — | Reason if declined |
| `offer_letter_url` | url | — | Link to offer letter document |

### Status Transitions

```
draft → pending_approval → extended → accepted
                                 ↓
                           rejected / withdrawn / expired
```

| Value | Label |
|-------|-------|
| `draft` | Draft (default) |
| `pending_approval` | Pending Approval |
| `extended` | Extended |
| `accepted` | Accepted |
| `rejected` | Rejected |
| `withdrawn` | Withdrawn |
| `expired` | Expired |

### Hook Automation

**OfferCreationTrigger** (`beforeInsert`)
- Auto-generates `offer_number` in format `OFF-YYYYMM-NNNN` (sequential within month)
- Auto-sets `expiry_date` to 7 days after `offer_date` if not provided
- Defaults `status` to `draft`

**OfferApprovalTrigger** (`beforeUpdate`)
- On `approval_status` change to `approved`: sets `status` to `approved` (if currently `draft`), records `approved_date` and `approved_by`
- On `approval_status` change to `rejected`: resets `status` to `draft`

**OfferStatusChangeTrigger** (`afterUpdate`)

| New Status | Automated Actions |
|------------|-------------------|
| `sent` | Updates candidate status to "Offer Sent", updates application status, sets `sent_date` |
| `accepted` | Updates candidate to `hired`, application to `hired`, creates employee record, creates onboarding record |
| `rejected` | Updates candidate to "Offer Rejected", application to `rejected`, sets `rejection_date` |
| `expired` | Updates candidate to "Offer Expired" |
| `withdrawn` | Updates candidate to "Offer Withdrawn" |

**Employee Creation on Acceptance**: When an offer is accepted, the `handleOfferAccepted` function:
1. Fetches the candidate record (`first_name`, `last_name`, `email`, `mobile_phone`, `date_of_birth`, `gender`)
2. Generates an employee number (format: `EMP{YYYY}{NNNN}`)
3. Creates an `employee` record with data from the candidate and offer (department, position, manager, salary, employment type)
4. Links the new employee back to the offer record

---

## Stage 6: Onboarding

**Object**: `onboarding` (`src/onboarding.object.ts`)
**Hook**: `src/hooks/onboarding.hook.ts`

### Key Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | text | ✅ | Onboarding title (max 255) |
| `employee_id` | lookup → `employee` | ✅ | New employee |
| `offer_id` | lookup → `offer` | — | Related offer |
| `start_date` | date | ✅ | Hire/start date |
| `buddy_id` | lookup → `employee` | — | Assigned onboarding buddy |
| `manager_id` | lookup → `employee` | ✅ | Direct manager |
| `status` | select | — | `not_started` (default) · `in_progress` · `completed` · `cancelled` |
| `completion_percentage` | percent | — | Auto-calculated (readonly) |
| `paperwork_completed` | boolean | — | Contracts and documents (default: false) |
| `it_setup_completed` | boolean | — | Computer, email, access (default: false) |
| `workspace_setup_completed` | boolean | — | Physical workspace (default: false) |
| `training_completed` | boolean | — | Company training (default: false) |
| `system_access_granted` | boolean | — | System permissions (default: false) |
| `first_day_checklist` | textarea | — | First day tasks |
| `first_week_goals` | textarea | — | First week objectives |
| `first_month_goals` | textarea | — | First month objectives |
| `probation_end_date` | date | — | End of probation period |
| `feedback` | textarea | — | New employee feedback |

### Hook Automation

**OnboardingChecklistTrigger** (`afterUpdate` on `offer` object)

Triggers when an offer's status changes to `accepted`:
1. Creates an `onboarding` record linked to the offer
2. Sets `start_date` from the offer's `start_date`
3. Sets `probation_end_date` to 90 days after start
4. Initializes all checklist booleans to `false`
5. Populates default goals:
   - First day: "IT setup, workspace tour, team introduction"
   - First week: "Benefits enrollment, compliance training, system onboarding"
   - First month: "Complete all onboarding tasks, initial project assignment"

**OnboardingProgressTrigger** (`beforeUpdate` on `onboarding` object)

Recalculates progress on every update:
- Tracks 5 checklist items: `it_setup_completed`, `workspace_setup_completed`, `training_completed`, `system_access_granted`, `paperwork_completed`
- `completion_percentage` = (completed items / 5) × 100
- Auto-sets `status` to `completed` when all 5 items are done
- Logs days elapsed since `start_date` for progress reporting

---

## Stage 7: Employee (Terminal)

**Object**: `employee` (`src/employee.object.ts`)
**Hook**: `src/hooks/employee.hook.ts`

The employee record is the terminal stage of the recruitment pipeline.

### Hook Automation

**EmployeeOnboardingTrigger** (`afterInsert`)

When a new employee is created:
1. Creates an `onboarding` record (90-day onboarding window)
2. Notifies the assigned manager
3. Creates a probation `goal` record (90-day target)

**EmployeeDataValidationTrigger** (`beforeInsert`, `beforeUpdate`)
- Warns if `hire_date` is in the future (allowed for pre-boarding)
- Validates `termination_date` is not before `hire_date`
- Auto-sets `full_name` as `last_name` + `first_name` if not provided

**EmployeeStatusChangeTrigger** (`afterUpdate`)

| New Status | Automated Actions |
|------------|-------------------|
| `active` | Enables system accounts, grants access permissions |
| `terminated` / `inactive` | Creates offboarding record, initiates exit process |
| `on_leave` | Updates team calendars, sets auto-responder |

---

## End-to-End Flow Example

```
1. HR creates a Recruitment Requisition (status: open)
      ↓
2. Candidate applies → Application created (status: submitted)
      ↓ ApplicationScreeningTrigger scores candidate
3. Score ≥ 70 → Application auto-progresses to "screening"
      ↓
4. Application moves to "interview" → Interview record auto-created
      ↓ InterviewSchedulingTrigger validates scheduling
5. Interviewer submits result → InterviewFeedbackTrigger fires
      ↓ result = "pass"
6. Application status → "offer"
      ↓
7. Offer created → OfferCreationTrigger generates offer number
      ↓ OfferApprovalTrigger manages approval
8. Offer extended → sent to candidate
      ↓
9. Offer accepted → OfferStatusChangeTrigger:
      a. Candidate status → "hired"
      b. Employee record created (auto-generated employee number)
      c. Onboarding record created (90-day plan, 5-item checklist)
      ↓
10. Onboarding progresses → OnboardingProgressTrigger tracks completion
      ↓ all 5 items completed
11. Onboarding status → "completed", employee is fully onboarded
```
