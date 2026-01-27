# HotCRM Development Agent System

## 🎯 Overview

This directory contains specialized AI agents designed to assist with HotCRM development. Each agent is an expert in a specific domain of the CRM system, following the @objectstack/spec protocol and HotCRM's architectural principles.

## 🤖 Available Agents

### 1. **Metadata Developer Agent** (`metadata-developer.md`)
**Expertise**: Creating and modifying object definitions (*.object.ts)
**Use Cases**:
- Creating new business objects (Lead, Opportunity, Account, etc.)
- Adding/modifying fields and relationships
- Implementing validation rules
- Setting up list views and filters

**When to Use**: 
- "Create a new Customer object with fields X, Y, Z"
- "Add a relationship between Account and Contract"
- "Implement validation rule for discount limits"

### 2. **Business Logic Agent** (`business-logic-agent.md`)
**Expertise**: Server-side automation (*.hook.ts, *.workflow.ts)
**Use Cases**:
- Creating triggers and hooks
- Implementing workflow automation
- Writing data validation logic
- Cross-object updates and calculations

**When to Use**:
- "Create a trigger to update Account when Opportunity is won"
- "Implement automatic contract creation on deal closure"
- "Add validation to prevent negative discounts"

### 3. **UI Development Agent** (`ui-developer.md`)
**Expertise**: User interface (*.view.ts, *.page.ts, *.dashboard.ts)
**Use Cases**:
- Creating custom views and layouts
- Building dashboards and reports
- Designing forms and wizards
- Implementing custom actions

**When to Use**:
- "Create a sales dashboard with pipeline metrics"
- "Build a custom quote configuration wizard"
- "Design a customer 360 view page"

### 4. **Integration Agent** (`integration-agent.md`)
**Expertise**: APIs, webhooks, external integrations
**Use Cases**:
- Creating REST API endpoints
- Implementing webhook handlers
- External system integration
- Data import/export

**When to Use**:
- "Create an API endpoint for lead conversion"
- "Implement webhook for payment notifications"
- "Integrate with external email service"

### 5. **Testing Agent** (`testing-agent.md`)
**Expertise**: Test generation and validation
**Use Cases**:
- Writing unit tests for hooks
- Schema validation tests
- Integration test scenarios
- Test data generation

**When to Use**:
- "Generate tests for OpportunityTrigger"
- "Create test data for sales pipeline"
- "Validate Account object schema"

### 6. **AI Features Agent** (`ai-features-agent.md`)
**Expertise**: AI/ML integration and smart features
**Use Cases**:
- Implementing AI-powered insights
- Natural language processing
- Predictive analytics
- Recommendation systems

**When to Use**:
- "Add AI lead scoring"
- "Implement smart email summarization"
- "Create next-step recommendations"

### 7. **Documentation Agent** (`documentation-agent.md`)
**Expertise**: Technical documentation and guides
**Use Cases**:
- API documentation
- User guides
- Architecture documentation
- Code comments

**When to Use**:
- "Document the Quote CPQ workflow"
- "Create API reference for custom endpoints"
- "Update README with new features"

## 📋 Agent Selection Guide

Use this decision tree to select the right agent:

```
Are you working with...?

├─ Data Models (*.object.ts) 
│  └─ → Use Metadata Developer Agent
│
├─ Business Rules & Automation (*.hook.ts, *.workflow.ts)
│  └─ → Use Business Logic Agent
│
├─ User Interface (*.view.ts, *.page.ts, *.dashboard.ts)
│  └─ → Use UI Development Agent
│
├─ External Systems (*.api.ts, webhooks)
│  └─ → Use Integration Agent
│
├─ AI/ML Features (scoring, predictions, NLP)
│  └─ → Use AI Features Agent
│
├─ Testing & Quality Assurance
│  └─ → Use Testing Agent
│
└─ Documentation & Guides
   └─ → Use Documentation Agent
```

## 🔄 Agent Collaboration

Some tasks require multiple agents working together:

### Example: Creating a Complete Feature

**Task**: "Implement a complete Lead Scoring feature"

**Agent Workflow**:
1. **Metadata Developer** → Create LeadScore fields on Lead object
2. **AI Features Agent** → Implement scoring algorithm and model
3. **Business Logic Agent** → Create hook to calculate score on Lead updates
4. **UI Development Agent** → Add score visualization to Lead views
5. **Testing Agent** → Generate comprehensive tests
6. **Documentation Agent** → Document the feature

## 💡 Best Practices

### 1. **Be Specific with Context**
❌ Bad: "Update the Account object"
✅ Good: "Add a 'CustomerTier' field to Account object with values: Bronze, Silver, Gold, Platinum"

### 2. **Follow the Protocol**
- Always use TypeScript for metadata (not YAML/JSON)
- Use ObjectQL for data operations (not SQL)
- Follow file suffix conventions (*.object.ts, *.hook.ts, etc.)

### 3. **Provide Domain Context**
Include business context when requesting features:
- What problem does this solve?
- What's the expected user workflow?
- Any industry-specific requirements?

### 4. **Incremental Development**
Break large features into smaller agent tasks:
- Phase 1: Data model (Metadata Agent)
- Phase 2: Business logic (Logic Agent)
- Phase 3: UI (UI Agent)
- Phase 4: Tests (Testing Agent)

## 🛠️ Usage Examples

### Example 1: Creating a New Object

```markdown
@metadata-developer

Create a new "SalesTerritory" object with the following requirements:

Fields:
- Name (text, required, unique)
- Code (text, required, 10 chars)
- Region (select: North, South, East, West)
- Manager (lookup to User)
- IsActive (checkbox, default: true)
- Description (textarea)

Relationships:
- HasMany Accounts
- HasMany Opportunities

List Views:
- All Territories
- Active Territories (filter IsActive = true)
- My Territories (filter Manager = current user)
```

### Example 2: Implementing Business Logic

```markdown
@business-logic-agent

Create a trigger that:
1. Fires when Opportunity.Stage changes to "Closed Won"
2. Automatically creates a Contract record with:
   - AccountId from Opportunity
   - StartDate = today
   - Status = "Draft"
   - ContractValue = Opportunity.Amount
3. Updates Account.CustomerStatus to "Active Customer"
4. Logs the conversion in Activity timeline

Handle error cases and add appropriate logging.
```

### Example 3: Building a Dashboard

```markdown
@ui-developer

Create a "Sales Executive Dashboard" with:

Layout: 3x3 grid

Widgets:
1. Revenue This Quarter (Metric, top-left)
2. Pipeline Value (Metric, top-center)
3. Win Rate (Metric, top-right)
4. Sales Funnel (Chart, middle row, full width)
5. Top Deals (List, bottom-left, 2 cols)
6. Team Performance (Chart, bottom-right)

Style: Modern, clean, Apple/Linear-inspired
Colors: Use brand primary colors
```

## 🔍 Agent Capabilities Matrix

| Agent | Create | Modify | Test | Document | Integrate |
|-------|--------|--------|------|----------|-----------|
| Metadata Developer | ✅ | ✅ | ❌ | ⚠️ | ❌ |
| Business Logic | ✅ | ✅ | ❌ | ⚠️ | ⚠️ |
| UI Developer | ✅ | ✅ | ❌ | ⚠️ | ❌ |
| Integration | ✅ | ✅ | ❌ | ⚠️ | ✅ |
| Testing | ❌ | ❌ | ✅ | ⚠️ | ❌ |
| AI Features | ✅ | ✅ | ❌ | ⚠️ | ✅ |
| Documentation | ❌ | ❌ | ❌ | ✅ | ❌ |

Legend: ✅ Primary Capability | ⚠️ Secondary Capability | ❌ Not Applicable

## 📚 Additional Resources

- [ObjectStack Spec Documentation](../prompts/metadata.prompt.md)
- [Project Structure Guide](../prompts/project-structure.prompt.md)
- [Testing Protocol](../prompts/testing.prompt.md)
- [GitHub Copilot Instructions](../copilot-instructions.md)

## 🚀 Quick Start

1. **Identify your task type** (data, logic, UI, etc.)
2. **Select the appropriate agent** from the list above
3. **Provide clear context** with business requirements
4. **Review agent output** for compliance with HotCRM standards
5. **Iterate if needed** with refinements

## 🤝 Contributing

When creating new agents:
- Follow the template structure in existing agents
- Include clear expertise areas and use cases
- Provide usage examples
- Update this README with the new agent

---

**Last Updated**: 2026-01-27  
**Version**: 1.0.0  
**Maintainer**: HotCRM Development Team
