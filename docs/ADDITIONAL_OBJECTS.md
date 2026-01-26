# Additional Objects for Future Implementation

This document lists junction and helper objects referenced in the main CRM objects that should be implemented in future phases for complete functionality.

## Junction Objects (Many-to-Many Relationships)

### 1. CampaignMember
**Purpose**: Link campaigns to leads and contacts

**Referenced by**: Campaign, Lead

**Key Fields**:
- CampaignId (lookup to Campaign)
- LeadId (lookup to Lead, optional)
- ContactId (lookup to Contact, optional)
- Status (Sent, Responded, Converted, etc.)
- FirstRespondedDate
- HasResponded (checkbox)

**Why needed**: Track which leads/contacts participate in which campaigns and measure campaign effectiveness.

---

### 2. PricebookEntry
**Purpose**: Junction between Pricebook and Product with actual pricing

**Referenced by**: Pricebook, Product

**Key Fields**:
- PricebookId (lookup to Pricebook)
- ProductId (lookup to Product)
- UnitPrice (currency)
- IsActive (checkbox)
- UseStandardPrice (checkbox)

**Why needed**: Store actual product prices per pricebook, enabling multi-currency and multi-region pricing.

---

## Line Item Objects (Quote/Opportunity Details)

### 3. QuoteLineItem
**Purpose**: Individual line items on a quote

**Referenced by**: Quote, Product

**Key Fields**:
- QuoteId (lookup to Quote)
- ProductId (lookup to Product)
- Quantity (number)
- UnitPrice (currency)
- Discount (percent)
- Subtotal (currency, calculated)
- Description (text)
- LineItemNumber (auto-number)

**Why needed**: Enable multi-product quotes with quantity, pricing, and discounts per line.

---

### 4. OpportunityLineItem
**Purpose**: Products associated with an opportunity

**Referenced by**: Product

**Key Fields**:
- OpportunityId (lookup to Opportunity)
- ProductId (lookup to Product)
- Quantity (number)
- UnitPrice (currency)
- Discount (percent)
- TotalPrice (currency, calculated)

**Why needed**: Track which products are included in an opportunity and their expected quantities.

---

## Support Objects

### 5. Queue
**Purpose**: Support team queues for case assignment

**Referenced by**: Case

**Key Fields**:
- Name (text)
- QueueType (Case, Lead, etc.)
- MaxMembers (number)
- ActiveMembers (number)

**Why needed**: Distribute cases to support teams and balance workload.

---

### 6. CaseComment
**Purpose**: Comments and updates on cases

**Referenced by**: Case

**Key Fields**:
- CaseId (lookup to Case)
- CommentBody (textarea)
- IsPublished (checkbox)
- CreatedById (lookup to User)
- CreatedDate (datetime)

**Why needed**: Track case resolution conversations and provide case history.

---

### 7. KnowledgeFeedback
**Purpose**: User ratings and feedback on knowledge articles

**Referenced by**: Knowledge

**Key Fields**:
- KnowledgeId (lookup to Knowledge)
- Rating (number, 1-5)
- IsHelpful (checkbox)
- Feedback (textarea)
- CreatedById (lookup to User)

**Why needed**: Measure article quality and improve content based on user feedback.

---

## System/Standard Objects

These objects are typically provided by the platform but may need to be defined:

### 8. User
**Purpose**: System users (sales reps, support agents, etc.)

**Referenced throughout**: Almost all objects have OwnerId, CreatedById, etc.

**Key Fields**:
- Username
- Email
- FirstName
- LastName
- IsActive
- RoleId
- ProfileId

---

### 9. Attachment
**Purpose**: File attachments

**Referenced by**: Most objects via enableAttachments feature

**Key Fields**:
- ParentId (polymorphic lookup)
- Name
- ContentType
- BodyLength
- Body (blob)

---

## Implementation Priority

### High Priority (Essential for MVP)
1. **PricebookEntry** - Required for any pricing functionality
2. **QuoteLineItem** - Required for multi-product quotes
3. **User** - Required for ownership and security

### Medium Priority (Standard Edition)
4. **OpportunityLineItem** - Better product tracking on deals
5. **CampaignMember** - Campaign effectiveness tracking

### Low Priority (Nice to Have)
6. **CaseComment** - Case communication history
7. **KnowledgeFeedback** - Article quality measurement
8. **Queue** - Advanced case routing

---

## Notes

The main 13 CRM objects are complete and functional without these junction objects. However, implementing these additional objects will unlock:

- Multi-product quotes and opportunities
- Accurate pricing across pricebooks
- Campaign ROI tracking
- Advanced case management
- Knowledge base quality metrics

These can be added incrementally as needed based on business requirements.
