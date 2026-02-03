# @hotcrm/hr - Human Capital Management Module

Complete talent management system from recruitment to retirement with AI-powered insights.

## Overview

The HR/HCM module provides comprehensive human capital management functionality for HotCRM, enabling complete employee lifecycle management with intelligent automation and predictive analytics.

**Package Stats:** 16 Objects | 3 AI Actions | 4 Automation Hooks

## What's Included

### Business Objects (16 Total)

#### Talent Acquisition & Recruitment
| Object | Label | Description |
|--------|-------|-------------|
| **candidate** | 候选人 | Job candidate profiles with education, experience, salary expectations, recruitment source |
| **application** | 求职申请 | Job applications with status tracking and stage progression through pipeline |
| **recruitment** | 招聘需求 | Open job requisitions with headcount, salary ranges, hiring priorities |
| **interview** | 面试 | Interview schedules, interviewer feedback, assessment results, hiring decisions |
| **offer** | Offer | Job offers with salary, benefits, expiry dates, acceptance tracking, onboarding linkage |
| **onboarding** | 入职流程 | New hire onboarding with paperwork, IT setup, training, 90-day probation activities |

#### Organization & Workforce Management
| Object | Label | Description |
|--------|-------|-------------|
| **employee** | 员工 | Employee master data with personal info, employment status, compensation, emergency contacts |
| **position** | 职位 | Job positions, levels, salary ranges, reporting relationships, employment types |
| **department** | 部门 | Organizational departments, hierarchies, managers, budget allocation, office locations |

#### Performance & Development
| Object | Label | Description |
|--------|-------|-------------|
| **performance_review** | 绩效评估 | Performance reviews with ratings, feedback, development plans, promotion recommendations |
| **goal** | 目标 | OKR, individual goals, KPIs with progress tracking and performance weighting |
| **training** | 培训 | Training programs, attendance, completion status, exam scores, learning outcomes |
| **certification** | 认证 | Professional certifications, expiry dates, verification, renewal requirements |

#### Time & Compensation
| Object | Label | Description |
|--------|-------|-------------|
| **attendance** | 考勤 | Employee attendance, check-in/out times, work hours, status (late, absent, overtime) |
| **time_off** | 请假 | Leave requests (annual, sick, personal, maternity) with approval workflows |
| **payroll** | 工资 | Salary calculations with allowances, deductions, taxes, pay period tracking |

### AI Actions (3 Total)

| Action | Purpose |
|--------|---------|
| **candidate_ai** | Resume parsing, skill extraction, candidate-to-position matching, interview question generation, candidate ranking with recommendations, sentiment analysis of communications |
| **employee_ai** | Retention risk prediction, career path recommendations, skill gap analysis, performance forecasting, team composition optimization, compensation benchmarking |
| **performance_ai** | Performance insights generation, SMART goal recommendations, personalized development plans, feedback analysis/categorization, calibration support, 360-review synthesis |

### Automation Hooks (4 Total)

| Hook | Object | Events Triggered |
|------|--------|-------------------|
| **CandidateScoringTrigger** | candidate | beforeInsert, beforeUpdate → Calculates qualification score (0-100), auto-screening, duplicate email detection |
| **EmployeeOnboardingTrigger** | employee | afterInsert → Auto-creates onboarding record, notifies manager, initializes 90-day probation goals |
| **PerformanceReviewRatingTrigger** | performance_review | beforeInsert, beforeUpdate → Calculates overall rating using weighted component scores |
| **OfferStatusChangeTrigger** | offer | afterUpdate → Handles offer lifecycle (Sent → Accepted → Employee creation; Rejected/Expired updates) |

## Business Capabilities

### 🎯 Talent Acquisition
- **Recruitment Pipeline**: Positions → Requirements → Applications → Interviews → Offers → Onboarding
- **AI-Powered Screening**: Automatic resume parsing, skill extraction, qualification scoring (0-100)
- **Intelligent Matching**: Candidate-to-position matching with ML-based recommendations
- **Interview Optimization**: AI-generated interview questions tailored to role requirements
- **Offer Management**: Auto-generated offer numbers (OFF-YYYYMM-####), expiry tracking, acceptance workflow

### 📊 Employee Lifecycle
- **Onboarding Automation**: Auto-creates onboarding workflows, 90-day probation goals, manager notifications
- **Status Management**: Active, Terminated, On Leave with automated offboarding workflows
- **Data Validation**: Hire/termination date validation, auto-generated full names, duplicate detection
- **Career Progression**: Role transitions, promotions, department transfers

### 📈 Performance Management
- **Review Cycles**: Structured performance reviews with weighted component scoring
- **Goal Setting**: OKR tracking, KPI measurement, progress monitoring
- **Development Planning**: AI-generated personalized development plans based on skill gaps
- **360 Feedback**: Multi-rater feedback collection and synthesis
- **Calibration**: Performance calibration support across teams

### 🎓 Learning & Development
- **Training Programs**: Course management, attendance tracking, completion status
- **Certifications**: Professional certification tracking with expiry and renewal management
- **Skill Gap Analysis**: AI-powered identification of training needs
- **Career Pathing**: ML-based career path recommendations

### ⏱️ Time & Attendance
- **Daily Attendance**: Check-in/out tracking, work hours calculation
- **Leave Management**: Annual, sick, personal, maternity leave with approval workflows
- **Status Tracking**: Late, absent, overtime detection and reporting

### 💰 Compensation
- **Payroll Processing**: Salary calculations with allowances, deductions, taxes
- **Market Benchmarking**: AI-powered compensation analysis against market data
- **Pay Period Management**: Track payment cycles and history

### 🤖 AI Intelligence
- **Retention Prediction**: Identify employees at risk of leaving with proactive recommendations
- **Performance Forecasting**: Predict future performance trends based on historical data
- **Team Optimization**: Analyze team composition and suggest improvements
- **Sentiment Analysis**: Analyze candidate and employee communication patterns

## Usage

### Importing Schemas
```typescript
import { 
  Employee,
  Candidate,
  Position,
  Department,
  PerformanceReview,
  Goal,
  Training
} from '@hotcrm/hr';

console.log(Employee.label); // "员工"
console.log(Candidate.label); // "候选人"
```

### Using AI Actions
```typescript
import { 
  parseResume,
  matchCandidateToPosition,
  predictRetentionRisk,
  generateDevelopmentPlan,
  analyzeSkillGaps
} from '@hotcrm/hr';

// Parse resume and extract structured data
const resumeData = await parseResume({
  candidateId: 'cand_123',
  resumeText: '...',
  extractSkills: true
});
console.log(resumeData.skills); // Extracted skills with proficiency
console.log(resumeData.education); // Education history
console.log(resumeData.experience); // Work experience

// Match candidate to open positions
const matches = await matchCandidateToPosition({
  candidateId: 'cand_123',
  topN: 5
});
console.log(matches.positions); // Ranked position matches
console.log(matches.scores); // Match scores (0-100)

// Predict employee retention risk
const retentionRisk = await predictRetentionRisk({
  employeeId: 'emp_456',
  includeRecommendations: true
});
console.log(retentionRisk.riskScore); // 0-100 (higher = more risk)
console.log(retentionRisk.factors); // Contributing factors
console.log(retentionRisk.recommendations); // Retention strategies

// Generate personalized development plan
const devPlan = await generateDevelopmentPlan({
  employeeId: 'emp_789',
  reviewId: 'rev_101'
});
console.log(devPlan.goals); // SMART goals
console.log(devPlan.trainingPrograms); // Recommended training
console.log(devPlan.timeline); // Development timeline

// Analyze skill gaps
const skillGaps = await analyzeSkillGaps({
  employeeId: 'emp_789',
  targetPositionId: 'pos_senior_dev'
});
console.log(skillGaps.gaps); // Missing skills
console.log(skillGaps.trainingRecommendations); // How to close gaps
```

### Hooks Auto-Trigger (No Code Required)
```typescript
// When candidate is created/updated, auto-calculate qualification score
await db.create('candidate', {
  name: 'John Doe',
  email: 'john@example.com',
  education: 'Bachelor',
  years_of_experience: 5
});
// → CandidateScoringTrigger calculates score, checks duplicates

// When employee is hired, auto-create onboarding
await db.create('employee', {
  name: 'Jane Smith',
  hire_date: new Date(),
  department: 'dept_eng',
  position: 'pos_dev'
});
// → EmployeeOnboardingTrigger creates onboarding record, sets goals, notifies manager

// When offer is accepted, auto-create employee
await db.update('offer', offerId, {
  status: 'Accepted'
});
// → OfferStatusChangeTrigger creates employee record, triggers onboarding

// When performance review is submitted, auto-calculate overall rating
await db.update('performance_review', reviewId, {
  status: 'Submitted',
  component_scores: {...}
});
// → PerformanceReviewRatingTrigger calculates weighted overall rating
```
