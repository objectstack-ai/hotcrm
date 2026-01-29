# Object Migration Notes - Phase 1

This document describes the migration of Activity, Quote, and Case objects from YAML to TypeScript format as part of Phase 1: Basic Enhancement.

## Migration Date
January 29, 2026

## Migrated Objects

### 1. Activity Object
**Location:** `packages/crm/src/activity.object.ts`  
**Previous Format:** `packages/crm/src/Activity.object.yml` (retained for backward compatibility)

#### Key Features Added
- **Comprehensive Activity Types**: Call, Email, Meeting, Task, Note, SMS, Demo, Proposal, Lunch, Other
- **Status Workflow**: Planned → In Progress → Completed/Cancelled/Deferred
- **Priority Management**: High, Medium, Low
- **Who/What Relationship Pattern**: 
  - Who: Contact or Lead
  - What: Account, Opportunity, Contract, or Case
- **Recurring Tasks**: Full support with pattern (Daily/Weekly/Monthly/Yearly), interval, and end date
- **Multi-Channel Support**:
  - Call tracking with duration, type, and result
  - Email with full message details
  - SMS with content and phone number
  - Meeting with location (physical or online) and link
- **Check-in Feature**: GPS coordinates for field visits
- **AI Enhancements**:
  - Voice-to-text transcription
  - Action item extraction
  - Sentiment analysis
  - Key points summary
  - Next step suggestions

#### List Views
- All Activities
- My Activities
- Today
- This Week
- Upcoming (next 7 days)
- Overdue
- Completed
- Meetings
- Team Calendar

#### Validation Rules
- End time must be after start time
- In-person meetings must have a location
- Online meetings should have a meeting link
- Call activities must specify call type
- Email activities must have a recipient
- SMS activities must have a phone number
- Recurring tasks must have a recurrence pattern
- Recurrence end date must be after activity date
- Due date must be after activity date

### 2. Quote Object
**Location:** `packages/products/src/quote.object.ts`  
**Previous Format:** `packages/products/src/Quote.object.yml` (retained for backward compatibility)

#### Key Features Added
- **CPQ Foundation**: Full Configure-Price-Quote workflow
- **Quote Line Items**: Related items with product references
- **Pricing Structure**:
  - Subtotal (auto-calculated from line items)
  - Discount (percentage and amount)
  - Tax (percentage and amount)
  - Shipping & Handling
  - Total Price
- **Multi-Currency Support**: USD, EUR, GBP, JPY, CNY, AUD, CAD with exchange rates
- **Quote Versioning**: Track versions with Previous/Latest version links
- **Quote Templates**: Support for PDF generation templates
- **Approval Workflow**:
  - Approval status tracking (Not Submitted, Pending, Approved, Rejected, Recalled)
  - Approval levels based on discount thresholds
  - Approval/Rejection history with timestamps and reasons
- **Customer Acceptance**: Track accepted date, signer, and signature
- **AI Enhancements**:
  - Recommended product bundles
  - Optimal discount suggestions
  - Win probability prediction
  - Pricing analysis
  - Upsell recommendations

#### List Views
- All Quotes
- My Quotes
- Draft
- Pending Approval
- Approved
- Sent to Customer
- Accepted
- Rejected/Declined
- Expiring Soon
- High Value (>$100k)

#### Validation Rules
- Expiration date must be after quote date
- Discount over 20% requires approval
- Approved quotes cannot modify pricing
- Accepted quotes cannot be modified
- Discount percentage must be between 0% and 100%
- Tax percentage must be between 0% and 100%
- Only one primary quote allowed per opportunity
- Exchange rate must be positive

### 3. Case Object
**Location:** `packages/support/src/case.object.ts`  
**Previous Format:** `packages/support/src/Case.object.yml` (retained for backward compatibility)

#### Key Features Added
- **Multi-Channel Case Creation**: Email, Web, Phone, WeChat, Chat Bot, Mobile App, Walk-in, Other
- **SLA Management**:
  - SLA levels (Platinum, Gold, Silver, Bronze, Standard)
  - Auto-calculated response and resolution due dates
  - Actual response and resolution time tracking
  - SLA violation detection and type classification
- **Priority & Severity**:
  - Priority: Critical, High, Medium, Low
  - Severity: S1 (Critical Impact) through S4 (Low Impact)
- **Status Workflow**: New → Open → In Progress → Waiting on Customer → Escalated → Resolved → Closed
- **Escalation Management**:
  - Escalation tracking with date and target user
  - Escalation reason and level counter
  - Auto-escalation support
- **Resolution Tracking**:
  - Resolution details and root cause
  - Resolution categories
  - Workaround tracking
- **CSAT (Customer Satisfaction)**:
  - Satisfaction level (Very Satisfied to Very Dissatisfied)
  - Numerical score (1-5)
  - Customer feedback
  - Survey date tracking
- **Case History**: Closed date, reopened date, and reopen counter
- **AI-Powered Features**:
  - Auto-categorization
  - Suggested assignee based on skills and availability
  - Related knowledge base articles
  - Suggested solutions
  - Sentiment analysis
  - Urgency score (0-100)
  - Keyword extraction

#### List Views
- All Cases
- My Cases
- Team Queue
- Open
- High Priority
- Escalated
- SLA Violations
- Today Closed
- Recently Closed (last 30 days)
- Waiting on Customer
- Unassigned

#### Validation Rules
- Resolution is required when status is Resolved
- Closed cases cannot be modified
- Escalation reason is required when escalating
- Escalated To user is required when escalated
- Contact must belong to the selected Account
- Resolution category is required when resolved
- Root cause is required for high priority cases when resolved

## Breaking Changes
None. YAML files are retained for backward compatibility.

## Migration Path
All new code should use the TypeScript definitions from:
- `@hotcrm/crm` for Activity
- `@hotcrm/products` for Quote
- `@hotcrm/support` for Case

The YAML files remain available but are considered deprecated and will be removed in a future major version.

## Benefits of TypeScript Migration

1. **Type Safety**: Full TypeScript type checking and IntelliSense support
2. **Better IDE Support**: Auto-completion and inline documentation
3. **Compile-Time Validation**: Catch errors before runtime
4. **Consistency**: Following @objectstack/spec v0.6.1 standards
5. **Maintainability**: Easier to refactor and extend
6. **Documentation**: Self-documenting code with TypeScript interfaces

## Next Steps

Future object migrations planned:
- Campaign (CRM package)
- Product (Products package)
- Pricebook (Products package)
- Knowledge (Support package)

## Questions or Issues?

Please refer to:
- Main README: `/README.md`
- Package READMEs: 
  - `/packages/crm/README.md`
  - `/packages/products/README.md`
  - `/packages/support/README.md`
- Upgrade Notes: `/UPGRADE_NOTES.md`
