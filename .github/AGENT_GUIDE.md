# Agent-Assisted Development for HotCRM

## 🚀 Quick Start

HotCRM now includes a comprehensive system of AI agents to accelerate development. Each agent is an expert in a specific domain of CRM development.

### Using Agents

Navigate to `.github/agents/` and select the appropriate agent for your task:

```bash
# View all available agents
ls -la .github/agents/

# Read agent documentation
cat .github/agents/metadata-developer.md
```

### Example: Creating a New Object

When you need to create a new business object:

1. **Open** `.github/agents/metadata-developer.md`
2. **Follow** the templates and examples
3. **Implement** your object following the patterns
4. **Validate** using the testing agent

### Example: Adding Business Logic

When implementing automation:

1. **Open** `.github/agents/business-logic-agent.md`
2. **Choose** the appropriate hook pattern
3. **Implement** your trigger logic
4. **Test** with the testing agent patterns

## 📚 Agent Directory

| Agent | Purpose | Use When |
|-------|---------|----------|
| [Metadata Developer](/.github/agents/metadata-developer.md) | Object definitions, fields, relationships | Creating/modifying *.object.ts files |
| [Business Logic](/.github/agents/business-logic-agent.md) | Hooks, triggers, workflows | Adding automation and validation |
| [UI Developer](/.github/agents/ui-developer.md) | Views, pages, dashboards | Building user interfaces |
| [Integration](/.github/agents/integration-agent.md) | APIs, webhooks, external systems | Connecting to external services |
| [AI Features](/.github/agents/ai-features-agent.md) | ML models, predictions, NLP | Adding intelligent features |
| [Testing](/.github/agents/testing-agent.md) | Unit tests, integration tests | Writing test suites |
| [Documentation](/.github/agents/documentation-agent.md) | Guides, API docs, tutorials | Documenting features |
| [Orchestrator](/.github/agents/ORCHESTRATOR.md) | Multi-agent coordination | Complex, multi-phase projects |

## 💡 Common Workflows

### New Feature Development

```
1. Metadata Developer → Define data model
2. Business Logic → Add automation
3. UI Developer → Create interface
4. Testing → Write tests
5. Documentation → Document feature
```

### Bug Fix

```
1. Testing → Reproduce with test
2. [Relevant Agent] → Fix issue
3. Testing → Verify fix
4. Documentation → Update if needed
```

### Integration

```
1. Integration → Build connector
2. Metadata Developer → Add tracking fields
3. Business Logic → Add sync hooks
4. Testing → Test integration
5. Documentation → Setup guide
```

## 🎯 Best Practices

1. **Start Simple**: Use one agent for straightforward tasks
2. **Follow Patterns**: Agents provide proven patterns and examples
3. **Test Early**: Use testing agent after each change
4. **Document**: Use documentation agent to capture decisions
5. **Orchestrate**: Use orchestrator for complex, multi-phase work

## 📖 Learning Path

### Beginner
1. Read the [Agent README](/.github/agents/README.md)
2. Try the Metadata Developer agent
3. Create a simple object following examples

### Intermediate
1. Combine Metadata + Business Logic agents
2. Add validation and automation
3. Write tests using Testing agent

### Advanced
1. Use AI Features agent for intelligence
2. Build integrations with Integration agent
3. Orchestrate multi-agent projects

## 🔗 Resources

- [Full Agent Documentation](/.github/agents/)
- [ObjectStack Spec Protocol](/.github/prompts/metadata.prompt.md)
- [Project Structure Guide](/.github/prompts/project-structure.prompt.md)
- [GitHub Copilot Instructions](/.github/copilot-instructions.md)

---

**For detailed information**, see the [complete agent system documentation](/.github/agents/README.md).
