# HotCRM Next Sprint Implementation Guide

> **Sprint Duration**: 12 weeks  
> **Focus**: Automation & Business Process Excellence  
> **Goal**: Increase automation coverage from 45% to 80%+

## Sprint Overview

This guide outlines the next 12 weeks of development focused on adding business automation to maximize the value of our 65 business objects.

## Week 1-4: Support & HR Automation (Highest ROI)

### Week 1: Support - SLA Enforcement Automation

**Package**: `@hotcrm/support`  
**Files to Create/Modify**:
- `packages/support/src/hooks/sla.hook.ts` (NEW)
- `packages/support/src/plugin.ts` (UPDATE - register SLA hooks)

**Hooks to Implement**:

1. **SLA Policy Activation Hook**
   - Event: `beforeInsert`, `beforeUpdate`
   - Logic: Validate SLA templates, check for conflicts
   - Fields: `is_active`, `object_type`, `conditions`

2. **SLA Milestone Tracking Hook**
   - Event: `afterInsert` on Case
   - Logic: Create SLA milestone records based on active policies
   - Fields: `target_date`, `status`, `milestone_type`

3. **SLA Breach Detection Hook**
   - Event: Scheduled (hourly)
   - Logic: Check for upcoming breaches, auto-escalate critical cases
   - Actions: Send notifications, escalate case, log breach

**AI Integration**:
- Use existing `sla_prediction.action.ts` for breach probability
- Auto-adjust case priority based on breach risk

**Test Coverage**:
- 10+ unit tests for SLA hooks
- Integration test for case creation → SLA milestone creation
- Integration test for breach detection → escalation

**Acceptance Criteria**:
- [ ] SLA milestones auto-created on case insert
- [ ] Breach detection runs on schedule
- [ ] Cases auto-escalate 2 hours before breach
- [ ] All tests passing
- [ ] Hooks registered in plugin.ts

---

### Week 2: Support - Case Routing & Queue Management

**Package**: `@hotcrm/support`  
**Files to Create/Modify**:
- `packages/support/src/hooks/routing.hook.ts` (NEW)
- `packages/support/src/hooks/queue.hook.ts` (NEW)
- `packages/support/src/plugin.ts` (UPDATE)

**Hooks to Implement**:

1. **Intelligent Case Routing Hook**
   - Event: `beforeInsert` on Case
   - Logic: Match case to agent based on skills, workload, availability
   - Objects: `routing_rule`, `agent_skill`, `queue`

2. **Queue Load Balancing Hook**
   - Event: `afterInsert` on Case
   - Logic: Distribute cases evenly across queue members
   - Fields: `current_workload`, `max_capacity`

3. **Escalation Rule Trigger Hook**
   - Event: Scheduled + manual trigger
   - Logic: Apply escalation rules based on case age, priority, SLA
   - Actions: Reassign case, notify manager

**AI Integration**:
- Use `case_ai.action.ts` for intelligent assignment
- Predict case complexity to optimize routing

**Test Coverage**:
- 15+ unit tests for routing logic
- Integration test: Case → Auto-assignment
- Integration test: Queue overflow → Escalation

**Acceptance Criteria**:
- [ ] Cases auto-assigned to best available agent
- [ ] Queue workload balanced within 10% variance
- [ ] Escalation rules execute on schedule
- [ ] All tests passing

---

### Week 3: HR - Recruitment Pipeline Automation

**Package**: `@hotcrm/hr`  
**Files to Create/Modify**:
- `packages/hr/src/hooks/application.hook.ts` (NEW)
- `packages/hr/src/hooks/interview.hook.ts` (NEW)
- `packages/hr/src/plugin.ts` (UPDATE)

**Hooks to Implement**:

1. **Application Status Workflow Hook**
   - Event: `afterUpdate` on Application
   - Logic: Auto-progress to next stage when criteria met
   - Status Flow: `new` → `screening` → `interview` → `offer` → `hired`

2. **Interview Scheduling Hook**
   - Event: `beforeInsert` on Interview
   - Logic: Check interviewer availability, send calendar invites
   - Integration: Calendar API (future)

3. **Candidate Screening Hook**
   - Event: `afterInsert` on Application
   - Logic: Auto-screen based on resume match score
   - AI: Use `candidate_ai.action.ts` for resume parsing

**AI Integration**:
- Candidate AI for resume parsing and matching
- Auto-rank candidates by fit score
- Generate interview questions

**Test Coverage**:
- 12+ unit tests for recruitment hooks
- Integration test: Application → Screening → Interview
- Integration test: Resume upload → Auto-score

**Acceptance Criteria**:
- [ ] Applications auto-screened within 1 minute
- [ ] Top 20% candidates auto-progress to interview
- [ ] Interview invites auto-sent
- [ ] All tests passing

---

### Week 4: HR - Onboarding Workflow Automation

**Package**: `@hotcrm/hr`  
**Files to Create/Modify**:
- `packages/hr/src/hooks/onboarding.hook.ts` (NEW)
- `packages/hr/src/hooks/time_off.hook.ts` (NEW)
- `packages/hr/src/plugin.ts` (UPDATE)

**Hooks to Implement**:

1. **Onboarding Checklist Assignment Hook**
   - Event: `afterInsert` on Offer (status = `accepted`)
   - Logic: Create onboarding record with checklist tasks
   - Tasks: IT setup, benefits enrollment, paperwork, training

2. **Time-Off Balance Validation Hook**
   - Event: `beforeInsert`, `beforeUpdate` on Time_Off
   - Logic: Check available balance, enforce policies
   - Validation: Blackout dates, max days, approval required

3. **Attendance Tracking Hook**
   - Event: `afterInsert`, `afterUpdate` on Attendance
   - Logic: Calculate hours, detect anomalies (late, early leave)
   - Actions: Notify manager on violations

**Test Coverage**:
- 10+ unit tests for onboarding/time-off hooks
- Integration test: Offer accepted → Onboarding created
- Integration test: Time-off request → Balance check

**Acceptance Criteria**:
- [ ] Onboarding tasks auto-created on offer acceptance
- [ ] Time-off requests validated against balance
- [ ] Attendance anomalies flagged automatically
- [ ] All tests passing

---

## Week 5-8: Marketing Cloud Expansion

### Week 5: Marketing Automation Core Objects

**Package**: `@hotcrm/marketing`  
**Files to Create**:
- `packages/marketing/src/automation_workflow.object.ts` (NEW)
- `packages/marketing/src/email_send.object.ts` (NEW)
- `packages/marketing/src/lead_nurture_program.object.ts` (NEW)

**Objects to Create**:

1. **automation_workflow**
   - Purpose: Define marketing automation workflows
   - Fields: `name`, `trigger_type`, `entry_criteria`, `steps`, `is_active`
   - Relationships: → campaign, → marketing_list

2. **email_send**
   - Purpose: Track individual email sends
   - Fields: `email_template_id`, `recipient_email`, `status`, `sent_date`, `opened`, `clicked`
   - Relationships: → campaign, → contact, → lead

3. **lead_nurture_program**
   - Purpose: Multi-touch lead nurturing sequences
   - Fields: `name`, `cadence`, `steps`, `enrollment_criteria`, `graduation_criteria`
   - Relationships: → campaign

**Test Coverage**:
- 10+ spec-compliance tests per object
- Field validation tests
- Relationship integrity tests

---

### Week 6: Email Marketing Workflows

**Package**: `@hotcrm/marketing`  
**Files to Create/Modify**:
- `packages/marketing/src/hooks/email_send.hook.ts` (NEW)
- `packages/marketing/src/hooks/automation_workflow.hook.ts` (NEW)
- `packages/marketing/src/plugin.ts` (UPDATE)

**Hooks to Implement**:

1. **Email Send Tracking Hook**
   - Event: `afterUpdate` on email_send
   - Logic: Update campaign metrics (opens, clicks, bounces)
   - Fields: `open_rate`, `click_rate`, `bounce_rate`

2. **Automation Workflow Trigger Hook**
   - Event: Various (lead created, form submitted, etc.)
   - Logic: Enroll contacts/leads into workflows
   - Actions: Send email, wait, add to list, score lead

3. **Engagement Scoring Hook**
   - Event: `afterUpdate` on email_send, campaign_member
   - Logic: Update lead score based on engagement
   - Factors: Opens, clicks, downloads, event attendance

**AI Integration**:
- Use `content_generator.action.ts` for email content
- Use `campaign_ai.action.ts` for send-time optimization

---

### Week 7: Lead Nurturing Automation

**Package**: `@hotcrm/marketing`  
**Files to Create/Modify**:
- `packages/marketing/src/hooks/lead_nurture.hook.ts` (NEW)
- `packages/marketing/src/actions/nurture_orchestrator.action.ts` (NEW)

**Hooks to Implement**:

1. **Nurture Program Enrollment Hook**
   - Event: Lead score threshold reached
   - Logic: Auto-enroll in appropriate nurture program
   - Criteria: Industry, company size, lead source, score

2. **Nurture Graduation Hook**
   - Event: Graduation criteria met
   - Logic: Convert lead to MQL, assign to sales
   - Actions: Create task for SDR, notify sales

3. **Nurture Step Execution Hook**
   - Event: Scheduled
   - Logic: Execute next step in nurture sequence
   - Steps: Send email, wait N days, check engagement, branch

**Test Coverage**:
- 15+ unit tests for nurture logic
- Integration test: Lead created → Enrolled → Graduated

---

### Week 8: Multi-Touch Attribution

**Package**: `@hotcrm/marketing`  
**Files to Create/Modify**:
- `packages/marketing/src/touchpoint.object.ts` (NEW)
- `packages/marketing/src/hooks/attribution.hook.ts` (NEW)

**Objects to Create**:

1. **touchpoint**
   - Purpose: Track all marketing interactions
   - Fields: `contact_id`, `lead_id`, `campaign_id`, `channel`, `touchpoint_date`, `attribution_weight`
   - Relationships: → contact, → lead, → campaign, → opportunity

**Hooks to Implement**:

1. **Touchpoint Recording Hook**
   - Event: Various (email open, form submit, event attend)
   - Logic: Create touchpoint record
   - Attribution: First-touch, last-touch, multi-touch

2. **Revenue Attribution Hook**
   - Event: `afterUpdate` on Opportunity (status = `closed_won`)
   - Logic: Distribute revenue credit across touchpoints
   - Models: Linear, time-decay, U-shaped, W-shaped

---

## Week 9-12: Finance & Products Enhancement

### Week 9: Finance - Invoice/Payment Automation

**Package**: `@hotcrm/finance`  
**Files to Create/Modify**:
- `packages/finance/src/hooks/invoice.hook.ts` (NEW)
- `packages/finance/src/hooks/payment.hook.ts` (NEW)
- `packages/finance/src/plugin.ts` (UPDATE)

**Hooks to Implement**:

1. **Invoice Status Lifecycle Hook**
   - Event: `beforeUpdate` on Invoice
   - Logic: Validate status transitions, enforce business rules
   - Status: `draft` → `sent` → `paid` / `overdue` / `cancelled`

2. **Payment Matching Hook**
   - Event: `afterInsert` on Payment
   - Logic: Match payment to invoice, update invoice status
   - Logic: Handle partial payments, overpayments

3. **Overdue Invoice Detection Hook**
   - Event: Scheduled (daily)
   - Logic: Identify overdue invoices, send reminders
   - Actions: Email customer, notify AR team, escalate

---

### Week 10: Finance - AR/AP Objects

**Package**: `@hotcrm/finance`  
**Files to Create**:
- `packages/finance/src/accounts_receivable.object.ts` (NEW)
- `packages/finance/src/accounts_payable.object.ts` (NEW)
- `packages/finance/src/billing_schedule.object.ts` (NEW)

*Objects and hooks design to be completed*

---

### Week 11: Products - Quote Calculation Automation

**Package**: `@hotcrm/products`  
**Files to Create/Modify**:
- `packages/products/src/hooks/quote_line_item.hook.ts` (NEW)
- `packages/products/src/hooks/price_rule.hook.ts` (NEW)
- `packages/products/src/plugin.ts` (UPDATE)

**Hooks to Implement**:

1. **Quote Line Calculation Hook**
   - Event: `beforeInsert`, `beforeUpdate` on quote_line_item
   - Logic: Calculate line total, apply discounts, add tax
   - Fields: `unit_price`, `quantity`, `discount`, `tax`, `line_total`

2. **Price Rule Application Hook**
   - Event: `beforeInsert`, `beforeUpdate` on quote_line_item
   - Logic: Apply price rules based on conditions
   - Rules: Volume discount, bundle pricing, promotional pricing

---

### Week 12: Products - Approval Workflow Automation

**Package**: `@hotcrm/products`  
**Files to Create/Modify**:
- `packages/products/src/hooks/approval_request.hook.ts` (NEW)
- `packages/products/src/workflows/approval.workflow.ts` (NEW)

**Hooks to Implement**:

1. **Approval Request Creation Hook**
   - Event: Quote discount exceeds threshold
   - Logic: Create approval request, route to appropriate approver
   - Matrix: 5 approval levels based on discount %

2. **Approval Decision Hook**
   - Event: `afterUpdate` on approval_request
   - Logic: Apply decision to quote, notify requester
   - Actions: Approve → unlock quote, Reject → notify sales

---

## Development Checklist (Per Week)

For each week's work, follow this checklist:

### Planning Phase
- [ ] Review object/hook design
- [ ] Identify dependencies and relationships
- [ ] List test scenarios
- [ ] Review AI integration opportunities

### Implementation Phase
- [ ] Create object files with TypeScript types
- [ ] Create hook files with proper error handling
- [ ] Register hooks/objects in plugin.ts
- [ ] Add JSDoc documentation

### Testing Phase
- [ ] Write unit tests (10+ per hook)
- [ ] Write integration tests (2-3 per workflow)
- [ ] Run `pnpm exec tsc --noEmit` (zero errors)
- [ ] Run `pnpm exec vitest run` (all passing)

### Documentation Phase
- [ ] Update package README.md
- [ ] Add inline code comments
- [ ] Document business logic decisions
- [ ] Update ROADMAP.md progress

### Review Phase
- [ ] Code review (self-review first)
- [ ] Security scan (CodeQL)
- [ ] Performance check
- [ ] Commit and push

---

## Success Metrics

Track these metrics weekly:

| Metric | Week 0 | Week 4 | Week 8 | Week 12 | Target |
|--------|--------|--------|--------|---------|--------|
| Automation Coverage | 45% | 60% | 70% | 80% | 80%+ |
| Hook Count | 29 | 45 | 60 | 75 | 75+ |
| Test Count | 933 | 1100 | 1300 | 1500 | 1500+ |
| Objects with Hooks | 29/65 | 40/65 | 52/65 | 60/70 | 80%+ |

---

## Tips for Success

1. **Start with Metadata**: Always create `.object.ts` files first
2. **Use ObjectQL**: Never write raw SQL - use `ctx.ql.find()`, `ctx.ql.update()`
3. **Error Handling**: All hooks must have try-catch blocks
4. **Test First**: Write tests before implementing complex logic
5. **AI Integration**: Consider AI enhancement for every hook
6. **Documentation**: Document business rules in comments
7. **Type Safety**: Use TypeScript strictly - no `any` types
8. **Incremental**: Commit and push after each hook (small PRs)

---

## Getting Help

- **Technical Questions**: Review `@objectstack/spec` documentation
- **Business Logic**: Review existing hooks in similar packages
- **Testing**: See `packages/*/tests/unit/hooks/*.test.ts`
- **CI/CD**: Check `.github/workflows/` for automation

---

**Ready to start?** Begin with Week 1: Support SLA Enforcement Automation.
