# HotCRM API Reference — Object Field Guide

> Quick reference for all business object fields across HotCRM packages.
> For each object, we list the most important fields. Computed, AI-generated, and address fields are omitted for brevity.

---

## CRM (Sales Cloud)

### Account (`account`)

Enterprise customer and organization management.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Account name (unique, max 255) |
| `account_number` | text | | Unique account identifier |
| `type` | select | | Prospect, Customer, Partner, Competitor, Other |
| `industry` | select | | Technology, Finance, Manufacturing, Retail, Healthcare, etc. |
| `annual_revenue` | currency | | Annual revenue amount |
| `number_of_employees` | number | | Total employee count |
| `rating` | select | | Hot 🔥, Warm ⭐, Cold ❄️ |
| `customer_status` | select | | Prospect, Active Customer, Churned, On Hold |
| `sla_tier` | select | | Platinum, Gold, Silver, Standard |
| `health_score` | number | | Customer health score (0–100, readonly) |
| `owner_id` | lookup → users | ✅ | Record owner (defaults to current user) |
| `parent_id` | lookup → account | | Parent account for hierarchy |

*Plus 14 additional fields (phone, email, website, billing/shipping address, etc.)*

### Contact (`contact`)

Individual contact management.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | text | | First name (max 40) |
| `last_name` | text | ✅ | Last name (max 80) |
| `account_id` | lookup → account | | Parent account (cascade delete) |
| `title` | text | | Job title |
| `email` | email | | Email address (unique) |
| `phone` | phone | | Phone number |
| `level` | select | | C-Level, VP, Director, Manager, Individual Contributor |
| `is_decision_maker` | boolean | | Whether this contact is a primary decision maker |
| `influence_level` | select | | High, Medium, Low |
| `relationship_strength` | select | | Strong, Medium, Weak, Unknown |

*Plus 5 additional fields (department, mobile, fax, preferred contact method, notes)*

### Opportunity (`opportunity`)

Sales opportunity and pipeline management.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Opportunity name (max 120) |
| `account_id` | lookup → account | ✅ | Related account |
| `contact_id` | lookup → contact | | Primary contact |
| `amount` | currency | | Deal amount |
| `close_date` | date | ✅ | Expected close date |
| `stage` | select | ✅ | Prospecting → Qualification → Needs Analysis → Proposal → Negotiation → Closed Won/Lost |
| `probability` | percent | | Win probability percentage |
| `lead_source` | select | | Web, Phone, Partner Referral, Trade Show, etc. |
| `forecast_category` | select | | Pipeline, Best Case, Commit, Omitted, Closed |
| `type` | select | | New Business, Upgrade, Renewal, Replacement |
| `owner_id` | lookup → users | ✅ | Record owner |

*Plus 3 additional fields (expected_revenue, days_open, next_step)*

### Lead (`lead`)

AI-Native lead management.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | text | | First name |
| `last_name` | text | ✅ | Last name |
| `company` | text | ✅ | Company name (searchable) |
| `email` | email | | Email (unique, searchable) |
| `phone` | phone | | Phone number |
| `status` | select | | New, Contacted, Qualified, Unqualified, Converted |
| `rating` | select | | Hot, Warm, Cold |
| `lead_score` | number | | Lead score (0–100, auto-calculated) |
| `lead_source` | select | | Web, Phone Inquiry, Partner Referral, etc. |
| `industry` | select | | Technology, Finance, Manufacturing, etc. |
| `owner_id` | lookup → users | ✅ | Record owner |

*Plus 10 additional fields (title, website, address fields, annual_revenue, data_completeness, etc.)*

### Task (`task`)

Task management with Kanban boards, dependencies, and time tracking.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | text | ✅ | Task subject (max 255) |
| `priority` | select | ✅ | High 🔴, Normal 🟡, Low 🟢 |
| `status` | select | ✅ | Not Started, In Progress, Completed, Waiting, Deferred |
| `due_date` | date | ✅ | Due date |
| `what_id` | lookup → account | | Related business object |
| `who_id` | lookup → contact | | Related person |
| `owner_id` | lookup → users | ✅ | Assigned user |
| `estimated_hours` | number | | Estimated time to complete |
| `percent_complete` | percent | | Completion percentage |
| `kanban_column` | select | | To Do, In Progress, Review, Done |

*Plus 14 additional fields (recurrence, dependencies, checklist, tags, AI fields, etc.)*

---

## Finance (Revenue Cloud)

### Contract (`contract`)

Contract management.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contract_number` | autonumber | | Auto-generated: `CT-{YYYY}{MM}{DD}-{0000}` |
| `account` | lookup → account | ✅ | Customer account |
| `opportunity` | lookup → opportunity | | Source opportunity |
| `status` | select | ✅ | Draft, In Approval, Activated, On Hold, Completed, Terminated |
| `start_date` | date | ✅ | Contract start date |
| `end_date` | date | | Contract end date |
| `contract_term` | number | | Term in months |
| `contract_value` | currency | ✅ | Total contract value |

### Invoice (`invoice`)

Billing statement for products or services.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `invoice_number` | autonumber | | Auto-generated: `INV-{YYYY}-{000000}` |
| `account` | lookup → account | ✅ | Customer account |
| `contract` | lookup → contract | | Related contract |
| `status` | select | | Draft, Posted, Paid, Void |
| `total_amount` | currency | | Invoice total |
| `due_date` | date | | Payment due date |
| `payment_terms` | select | | Due on Receipt, Net 15, Net 30, Net 60 |

### Invoice Line (`invoice_line`)

Line items for an invoice.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `invoice` | lookup → invoice | | Parent invoice (cascade delete) |
| `product` | lookup → product | | Product reference |
| `description` | text | | Line item description |
| `quantity` | number | ✅ | Quantity (2 decimal places) |
| `unit_price` | currency | | Price per unit |
| `amount` | currency | | Line total |

### Payment (`payment`)

Payment tracking and collections.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payment_number` | autonumber | | Auto-generated payment number |
| `name` | text | ✅ | Payment name |
| `type` | select | ✅ | Down Payment, Milestone, Delivery, Final, Recurring, etc. |
| `status` | select | | Planned, Invoiced, Received, Overdue, Written Off, Cancelled |
| `account` | lookup → account | ✅ | Customer account |
| `contract` | lookup → contract | ✅ | Related contract |
| `planned_amount` | currency | ✅ | Planned payment amount |
| `planned_date` | date | ✅ | Planned payment date |
| `payment_method` | select | | Bank Transfer, Check, Cash, Credit Card, Alipay, WeChat Pay |

---

## HR (Human Resources)

### Employee (`employee`)

Employee master data and information management.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employee_number` | text | ✅ | Employee ID (unique) |
| `first_name` | text | ✅ | First name |
| `last_name` | text | ✅ | Last name |
| `email` | email | ✅ | Work email (unique) |
| `mobile_phone` | phone | ✅ | Mobile number |
| `department_id` | lookup → department | ✅ | Department |
| `position_id` | lookup → position | ✅ | Position |
| `manager_id` | lookup → employee | | Direct manager |
| `hire_date` | date | ✅ | Hire date |
| `employment_status` | select | | Active, Probation, On Leave, Terminated |
| `employment_type` | select | | Full-time, Part-time, Contract, Intern |
| `base_salary` | currency | | Base salary |

*Plus 14 additional fields (personal email, DOB, gender, national ID, address, emergency contact, etc.)*

### Department (`department`)

Organization department and team structure.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Department name (unique) |
| `code` | text | | Department code (unique) |
| `type` | select | | Headquarters, Branch, Division, Department, Team |
| `parent_id` | lookup → department | | Parent department |
| `manager_id` | lookup → employee | | Department manager |
| `cost_center` | text | | Financial cost center code |
| `budget_amount` | currency | | Annual budget |
| `status` | select | | Active, Closed, Merging |

*Plus 4 additional fields (location, phone, email, employee_count)*

### Candidate (`candidate`)

Job candidate information management.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | text | ✅ | First name |
| `last_name` | text | ✅ | Last name |
| `email` | email | ✅ | Email (unique) |
| `mobile_phone` | phone | ✅ | Mobile number |
| `current_company` | text | | Current employer |
| `current_title` | text | | Current job title |
| `years_of_experience` | number | | Total years of experience |
| `highest_education` | select | | PhD, Master, Bachelor, Associate, High School |
| `source` | select | | Job Board, Referral, Headhunter, Social Media, Campus, etc. |
| `status` | select | | New, Under Review, Interviewing, Hired, Rejected, Withdrawn |

*Plus 7 additional fields (linkedin_url, salary expectations, notice_period, university, resume_url, etc.)*

### Performance Review (`performance_review`)

Employee performance evaluation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `review_name` | text | ✅ | Review name |
| `employee_id` | lookup → employee | ✅ | Reviewed employee |
| `reviewer_id` | lookup → employee | ✅ | Reviewer (typically manager) |
| `review_period` | select | | Quarterly, Semi-Annual, Annual, Probation, Ad-hoc |
| `review_type` | select | | Self Review, Manager Review, 360 Review, Probation Review |
| `start_date` | date | ✅ | Review period start |
| `end_date` | date | ✅ | Review period end |
| `status` | select | | Not Started, In Progress, Pending Review, Completed, Cancelled |
| `overall_rating` | select | | Outstanding, Exceeds Expectations, Meets, Needs Improvement |
| `overall_score` | number | | Score 0–100 |

*Plus 8 additional fields (achievements, strengths, development_plan, promotion_recommendation, etc.)*

### Time Off (`time_off`)

Employee leave and time-off management.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employee_id` | lookup → employee | ✅ | Employee requesting leave |
| `leave_type` | select | ✅ | Annual, Sick, Personal, Maternity, Paternity, etc. |
| `start_date` | date | ✅ | Leave start date |
| `end_date` | date | ✅ | Leave end date |
| `total_days` | number | | Auto-calculated leave days (readonly) |
| `status` | select | | Pending, Approved, Rejected, Cancelled |
| `approver_id` | lookup → employee | | Manager responsible for approval |
| `reason` | textarea | ✅ | Leave reason |
| `backup_person_id` | lookup → employee | | Colleague covering responsibilities |

*Plus 6 additional fields (request_number, start/end period, is_paid, attachment_url, notes)*

---

## Marketing

### Campaign (`campaign`)

Plan, execute, and track marketing campaigns.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Campaign name (searchable) |
| `type` | select | | Conference, Webinar, Trade Show, Email, Social Media, etc. |
| `status` | select | | Planned, In Progress, Completed, Aborted |
| `start_date` | date | | Campaign start date |
| `end_date` | date | | Campaign end date |
| `budgeted_cost` | currency | | Planned budget |
| `actual_cost` | currency | | Actual spend |
| `expected_revenue` | currency | | Expected revenue |
| `actual_revenue` | currency | | Revenue from Won Opportunities (readonly) |
| `is_active` | boolean | | Whether campaign is active |
| `parent_campaign` | lookup → campaign | | Parent campaign for hierarchy |

### Campaign Member (`campaign_member`)

Tracks relationship between Campaigns and Leads/Contacts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `campaign` | lookup → campaign | ✅ | Parent campaign |
| `lead` | lookup → lead | | Related lead (mutually exclusive with contact) |
| `contact` | lookup → contact | | Related contact (mutually exclusive with lead) |
| `status` | select | ✅ | Sent, Opened, Clicked, Responded, Unsubscribed |
| `has_responded` | boolean | | Auto-set when status is Responded (readonly) |
| `member_source` | select | | Manual, Import, API, Automation |
| `first_responded_date` | datetime | | Timestamp of first response (readonly) |
| `number_of_opens` | number | | Email open count (readonly) |
| `number_of_clicks` | number | | Link click count (readonly) |

### Email Template (`email_template`)

Marketing email template library with personalization.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Template name |
| `template_code` | text | | Unique template identifier for API calls |
| `template_type` | select | ✅ | Marketing, Transactional, Notification, Welcome, etc. |
| `subject` | text | ✅ | Email subject (supports `{{tokens}}`) |
| `html_body` | textarea | ✅ | HTML email content |
| `status` | select | ✅ | Draft, Published, Archived |
| `is_active` | boolean | | Only active templates can be used for sending |
| `owner_id` | lookup → users | ✅ | Template owner |
| `average_open_rate` | percent | | Auto-calculated open rate (readonly) |
| `average_click_rate` | percent | | Auto-calculated click rate (readonly) |

*Plus 14 additional fields (preheader, plain_text_body, category, A/B testing, spam_score, AI fields, etc.)*

### Marketing List (`marketing_list`)

Marketing list and segmentation management.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | List name |
| `list_type` | select | ✅ | Static, Dynamic, or Hybrid |
| `member_type` | select | ✅ | Lead, Contact, Account, or Mixed |
| `status` | select | ✅ | Active, Paused, Archived |
| `filter_criteria_json` | textarea | | ObjectQL query criteria for dynamic lists |
| `segment_category` | select | | Industry, Geographic, Company Size, Engagement, etc. |
| `total_members` | number | | Member count (readonly) |
| `owner_id` | lookup → users | ✅ | List owner |
| `consent_required` | boolean | | GDPR compliance flag |

*Plus 23 additional fields (refresh frequency, suppression settings, statistics, AI suggestions, etc.)*

### Form (`form`)

Marketing form builder with automatic lead creation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Form name |
| `form_type` | select | ✅ | Lead Capture, Event Registration, Contact Us, etc. |
| `campaign_id` | lookup → campaign | | Associated campaign |
| `fields_json` | textarea | ✅ | Form field definitions (JSON) |
| `status` | select | ✅ | Draft, Published, Archived |
| `create_lead_on_submit` | boolean | | Auto-create lead on form submission |
| `owner_id` | lookup → users | ✅ | Form owner |
| `total_submissions` | number | | Submission count (readonly) |
| `conversion_rate` | percent | | submissions / views (readonly) |

*Plus 24 additional fields (layout, validation rules, auto-assignment, notifications, captcha, progressive profiling, AI, etc.)*

---

## Products (CPQ)

### Product (`product`)

Product catalog.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Product name (searchable) |
| `product_code` | text | | Product code (unique, searchable) |
| `description` | textarea | | Product description |
| `family` | select | | Software, Hardware, Professional Services, Consulting, etc. |
| `is_active` | boolean | | Whether product is active |
| `list_price` | currency | | Standard list price |
| `cost_price` | currency | | Cost price |
| `quantity_unit` | select | | Unit, Set, Hour, Day, Month, Year, License |

### Quote (`quote`)

CPQ with complex pricing, discount approval, and PDF generation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quote_number` | autonumber | | Auto-generated: `Q-{YYYY}-{MM}-{0000}` |
| `name` | text | ✅ | Quote name |
| `status` | select | ✅ | Draft, In Review, Approved, Rejected, Sent, Accepted, Declined, Expired |
| `opportunity_id` | lookup → opportunity | ✅ | Related opportunity |
| `account_id` | lookup → account | ✅ | Customer account |
| `pricebook_id` | lookup → pricebook | ✅ | Price book to use |
| `quote_date` | date | ✅ | Quote date (defaults to today) |
| `expiration_date` | date | ✅ | Expiration date |
| `subtotal` | currency | | Sum of line items (readonly) |
| `total_price` | currency | | Final total after discount + tax + shipping (readonly) |
| `approval_status` | select | | Not Submitted, Pending, Approved, Rejected (readonly) |

*Plus 30+ additional fields (discount, tax, shipping, payment terms, versioning, approval workflow, AI fields, etc.)*

### Pricebook (`pricebook`)

Pricing strategies by region or channel.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Pricebook name |
| `is_active` | boolean | | Whether pricebook is active |
| `is_standard` | boolean | | Is the standard pricebook |
| `currency` | select | ✅ | CNY, USD, EUR, GBP, JPY, HKD |
| `start_date` | date | | Effective start date |
| `end_date` | date | | Effective end date |
| `description` | textarea | | Description |

### Quote Line Item (`quote_line_item`)

Individual line items on quotes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quote_id` | lookup → quote | ✅ | Parent quote |
| `product_id` | lookup → product | ✅ | Product |
| `line_number` | number | ✅ | Display order |
| `quantity` | number | ✅ | Number of units (default: 1) |
| `list_price` | currency | ✅ | Standard list price per unit |
| `unit_price` | currency | ✅ | Selling price per unit (after discounts) |
| `discount_type` | select | | None, Percentage, Amount per Unit, Total Amount |
| `discount_percent` | percent | | Discount percentage |
| `total_price` | currency | | Unit Price × Quantity (readonly) |
| `billing_frequency` | select | | One-Time, Monthly, Quarterly, Semi-Annual, Annual |

*Plus 18 additional fields (bundle, configuration, margin, tax, shipping, service dates, AI fields, etc.)*

### Discount Schedule (`discount_schedule`)

Discount schedules with date ranges, approval workflows, and margin protection.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Schedule name |
| `schedule_code` | text | | Unique identifier |
| `status` | select | ✅ | Active, Draft, Inactive, Scheduled, Expired |
| `schedule_type` | select | ✅ | Seasonal, Promotional, Clearance, Volume-Based, etc. |
| `start_date` | datetime | ✅ | When discount becomes effective |
| `end_date` | datetime | ✅ | When discount expires |
| `discount_type` | select | ✅ | Percentage, Fixed Amount, Tiered |
| `maximum_discount_percent` | percent | | Maximum allowed discount |
| `applies_to` | select | ✅ | All Products, Category, Family, Specific Products, Bundles |
| `requires_approval` | boolean | | Whether discounts require approval |

*Plus 30+ additional fields (margin protection, usage limits, customer scope, performance metrics, AI fields, etc.)*

---

## Support (Service Cloud)

### Case (`case`)

Customer service case and support request management.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `case_number` | autonumber | | Auto-generated: `CASE-{YYYY}-{0000}` |
| `subject` | text | ✅ | Case subject |
| `description` | textarea | ✅ | Case description |
| `status` | select | ✅ | New, Open, In Progress, Waiting on Customer, Escalated, Resolved, Closed |
| `priority` | select | ✅ | Critical 🔴, High 🟠, Medium 🟡, Low 🟢 |
| `type` | select | | Problem, Question, Incident, Feature Request, etc. |
| `origin` | select | ✅ | Email, Web, Phone, WeChat, Chat Bot, etc. |
| `account_id` | lookup → account | ✅ | Customer account |
| `contact_id` | lookup → contact | | Customer contact |
| `owner_id` | lookup → users | ✅ | Case owner/agent |
| `sla_level` | select | | Platinum, Gold, Silver, Bronze, Standard |

*Plus 30+ additional fields (SLA tracking, escalation, resolution, CSAT, AI fields, etc.)*

### Knowledge Article (`knowledge_article`)

Knowledge base articles for self-service and agent assistance.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `article_number` | autonumber | | Auto-generated: `KB-{YYYY}-{0000}` |
| `title` | text | ✅ | Article title |
| `summary` | textarea | ✅ | Brief summary for search results (max 500) |
| `content` | textarea | ✅ | Full article content |
| `category` | select | ✅ | Technical, Product, Billing, How-To, FAQ, Troubleshooting, etc. |
| `status` | select | ✅ | Draft, In Review, Published, Needs Update, Archived |
| `language` | select | ✅ | en, zh_cn, zh_tw, es, fr, de, ja, ko |
| `is_public` | boolean | | Visible in customer portal |
| `owner_id` | lookup → users | ✅ | Article owner |
| `author_id` | lookup → users | ✅ | Article author |

*Plus 30+ additional fields (view counts, ratings, SEO, versioning, AI categorization, etc.)*

### SLA Policy (`sla_policy`)

Comprehensive SLA policy management with multi-tier support.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `policy_name` | text | ✅ | Policy name |
| `is_active` | boolean | | Whether policy is active |
| `tier` | select | ✅ | Platinum 24/7, Gold, Silver, Bronze, Standard |
| `coverage_type` | select | ✅ | 24/7, Business Hours, Extended, Custom |
| `first_response_minutes` | number | | Target first response time |
| `resolution_minutes` | number | | Target resolution time |
| `effective_date` | date | ✅ | When policy takes effect |
| `priority` | number | ✅ | Policy priority (lower = higher) |
| `enable_auto_escalation` | boolean | | Auto-escalate on breach |
| `target_compliance_rate` | number | | Target SLA compliance % |

*Plus 30+ additional fields (escalation levels, notification settings, pause rules, metrics, etc.)*

### Queue (`queue`)

Support team queues for case routing and assignment.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Queue name |
| `is_active` | boolean | | Whether queue is active |
| `queue_type` | select | ✅ | General, Technical, Billing, Product, VIP, Escalation, etc. |
| `routing_method` | select | ✅ | Round Robin, Load Balanced, Skill Based, Manual, AI Powered |
| `max_cases_per_agent` | number | | Max active cases per agent (default: 50) |
| `default_priority` | select | | Default case priority |
| `enable_auto_assignment` | boolean | | Whether to auto-assign cases |
| `email_address` | email | | Queue email for case submission |
| `pending_cases` | number | | Unassigned cases (readonly) |

*Plus 12 additional fields (SLA template, overflow settings, business hours, out-of-hours behavior, etc.)*

### Escalation Rule (`escalation_rule`)

Rules for automatic case escalation based on SLA violations or conditions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | text | ✅ | Rule name |
| `is_active` | boolean | | Whether rule is active |
| `trigger_type` | select | ✅ | SLA Violation, Response Time, Resolution Time, No Activity, Sentiment |
| `threshold_minutes` | number | | Time threshold for triggering |
| `escalation_level` | number | ✅ | Escalation level 1–5 |
| `escalate_to_type` | select | ✅ | User, Queue, Role, Manager |
| `escalate_to_user_id` | lookup → users | | Specific user to escalate to |
| `escalate_to_queue_id` | lookup → queue | | Queue to escalate to |
| `notify_customer` | boolean | | Whether to notify customer |
| `update_priority` | boolean | | Update case priority on escalation |

*Plus 6 additional fields (email template, new priority/status, applicable types, metrics)*
