# HotCRM Development Quick Start Guide

> **快速上手指南** - For developers who want to contribute to HotCRM

## 📖 Essential Reading

1. **Main Development Plan**: [CRM_DEVELOPMENT_PLAN.md](./CRM_DEVELOPMENT_PLAN.md) (English)
2. **中文开发计划**: [CRM开发计划.md](./CRM开发计划.md) (Chinese)
3. **Protocol Specification**: @objectstack/spec v0.6.1
4. **Architecture**: [README.md](./README.md)

## 🎯 Top Priorities (Start Here)

### P0 - Critical Tasks (Must Do First)

| Task | Type | Package | Estimated | Status |
|------|------|---------|-----------|--------|
| **Activity Object Migration** | Migration | @hotcrm/crm | 12h | ⏳ TODO |
| **Quote Object Migration** | Migration | @hotcrm/products | 16h | ⏳ TODO |
| **Case Object Migration** | Migration | @hotcrm/support | 12h | ⏳ TODO |
| **Account Hooks** | Business Logic | @hotcrm/crm | 8h | ⏳ TODO |
| **Opportunity AI Enhancements** | AI | @hotcrm/crm | 10h | ⏳ TODO |

### Quick Commands

```bash
# Setup
pnpm install
pnpm build

# Development
pnpm dev

# Run tests
pnpm test

# Lint & Format
pnpm lint
pnpm format

# Build specific package
pnpm --filter @hotcrm/crm build
```

## 🔨 Common Tasks

### 1. Migrate YAML Object to TypeScript

**Template**: See [CRM_DEVELOPMENT_PLAN.md](./CRM_DEVELOPMENT_PLAN.md#typescript-object-migration-checklist)

```typescript
// 1. Create file: src/my_object.object.ts
import type { ServiceObject } from '@objectstack/spec/data';

const MyObject = {
  name: 'MyObject',
  label: '对象名称',
  labelPlural: '对象名称（复数）',
  icon: 'icon-name',
  description: '对象描述',
  
  capabilities: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
  
  fields: {
    Name: {
      type: 'text',
      label: '名称',
      required: true,
      searchable: true,
      maxLength: 255
    },
    // ... more fields
  },
  
  relationships: [
    // ... relationships
  ],
  
  listViews: [
    // ... views
  ],
  
  validationRules: [
    // ... rules
  ],
  
  pageLayout: {
    sections: [
      // ... layout
    ]
  }
};

export default MyObject;

// 2. Add to package index.ts
// 3. Delete old .yml file
// 4. Test compilation: pnpm build
// 5. Commit with message: "feat: migrate MyObject to TypeScript"
```

### 2. Create a Hook

**Template**: See [CRM_DEVELOPMENT_PLAN.md](./CRM_DEVELOPMENT_PLAN.md#hook-implementation-checklist)

```typescript
// 1. Create file: src/hooks/my_object.hook.ts
import type { Hook } from '@objectstack/spec/data';
import { db } from '@hotcrm/core';

interface TriggerContext {
  old?: Record<string, any>;
  new: Record<string, any>;
  db: typeof db;
  user: { id: string; name: string; email: string };
}

const MyObjectHook: Hook = {
  name: 'MyObjectHook',
  object: 'MyObject',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      // Your logic here
      console.log('✅ Hook executed');
    } catch (error) {
      console.error('❌ Error in hook:', error);
      throw error;
    }
  }
};

export default MyObjectHook;

// 2. Register in package index
// 3. Test with sample data
// 4. Commit: "feat: add MyObject automation hook"
```

### 3. Create an AI Action

**Template**: See [CRM_DEVELOPMENT_PLAN.md](./CRM_DEVELOPMENT_PLAN.md#action-implementation-checklist)

```typescript
// 1. Create file: src/actions/my_ai_action.action.ts
import { db } from '@hotcrm/core';

export interface MyActionRequest {
  recordId: string;
  options?: Record<string, any>;
}

export interface MyActionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function executeMyAction(
  request: MyActionRequest
): Promise<MyActionResponse> {
  try {
    // 1. Validate
    if (!request.recordId) {
      throw new Error('recordId required');
    }
    
    // 2. Fetch data
    const record = await db.doc.get('MyObject', request.recordId);
    
    // 3. AI logic here
    
    // 4. Return
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export default executeMyAction;

// 2. Add to package exports
// 3. Write tests
// 4. Commit: "feat: add AI action for MyObject"
```

## 📊 Current Status Summary

### Objects Status

```
TypeScript Objects (5):
✅ Account
✅ Contact  
✅ Lead
✅ Opportunity
✅ Contract

YAML Objects (8):
⏳ Activity (P0 - High Priority)
⏳ Quote (P0 - High Priority)
⏳ Case (P0 - High Priority)
⏳ Campaign (P1)
⏳ Product (P1)
⏳ Pricebook (P1)
⏳ Knowledge (P1)
⏳ Payment (P1)
```

### Hooks Status

```
Implemented (2):
✅ lead.hook.ts (Scoring + Status)
✅ opportunity.hook.ts (Stage Change)

Needed (5):
⏳ account.hook.ts (P0)
⏳ contact.hook.ts (P1)
⏳ activity.hook.ts (P0)
⏳ quote.hook.ts (P0)
⏳ case.hook.ts (P0)
```

### Actions Status

```
Implemented (1):
✅ ai_smart_briefing.action.ts

Needed (10+):
⏳ lead_ai.action.ts (P0)
⏳ opportunity_ai.action.ts (P0)
⏳ case_ai.action.ts (P0)
⏳ campaign_ai.action.ts (P1)
⏳ account_health.action.ts (P1)
... more in development plan
```

## 🎓 Learning Resources

### Protocol Documentation
- [@objectstack/spec v0.6.1](https://github.com/objectstack/objectstack)
- [Field Types Reference](https://github.com/objectstack/objectstack/blob/main/docs/field-types.md)
- [Relationships Guide](https://github.com/objectstack/objectstack/blob/main/docs/relationships.md)

### HotCRM Specific
- [Architecture Overview](./README.md#architecture)
- [Package Structure](./README.md#package-overview)
- [Contributing Guide](./CONTRIBUTING.md)
- [Upgrade Notes](./UPGRADE_NOTES.md)

### Examples
- Study existing objects: `packages/crm/src/*.object.ts`
- Study existing hooks: `packages/crm/src/hooks/*.hook.ts`
- Study existing actions: `packages/crm/src/actions/*.action.ts`

## 🚦 Development Workflow

1. **Pick a Task**
   - Check GitHub Issues/Projects
   - Start with P0 tasks
   - Assign yourself

2. **Create Branch**
   ```bash
   git checkout -b feature/task-name
   ```

3. **Implement**
   - Follow templates above
   - Write tests
   - Update documentation

4. **Test**
   ```bash
   pnpm build
   pnpm test
   pnpm lint
   ```

5. **Commit**
   ```bash
   git add .
   git commit -m "feat: description"
   ```

6. **Submit PR**
   - Push branch
   - Create PR on GitHub
   - Request review

7. **Get Merged**
   - Address feedback
   - Squash merge when approved

## 💡 Best Practices

### Code Style
- ✅ Use TypeScript for everything
- ✅ PascalCase for field names
- ✅ camelCase for functions
- ✅ Add JSDoc comments
- ✅ Handle errors gracefully
- ❌ Don't use `any` type
- ❌ Don't skip validation
- ❌ Don't ignore lint errors

### Testing
- ✅ Write unit tests
- ✅ Test edge cases
- ✅ Mock external dependencies
- ✅ Aim for 90%+ coverage
- ❌ Don't skip tests
- ❌ Don't test implementation details

### Performance
- ✅ Use indexes for queries
- ✅ Batch database operations
- ✅ Cache expensive calculations
- ✅ Optimize N+1 queries
- ❌ Don't load all records
- ❌ Don't sync when async works

### Security
- ✅ Validate all inputs
- ✅ Sanitize user data
- ✅ Check permissions
- ✅ Log security events
- ❌ Don't trust client input
- ❌ Don't expose sensitive data

## 🆘 Getting Help

### Questions?
1. Check documentation first
2. Search existing issues
3. Ask in GitHub Discussions
4. Contact maintainers

### Found a Bug?
1. Check if already reported
2. Create detailed issue
3. Include reproduction steps
4. Add screenshots/logs

### Have an Idea?
1. Check roadmap first
2. Discuss in GitHub Discussions
3. Create feature request
4. Offer to implement

## 📞 Contact

- **GitHub Issues**: https://github.com/objectstack-ai/hotcrm/issues
- **Discussions**: https://github.com/objectstack-ai/hotcrm/discussions
- **Email**: hotcrm@example.com (if available)

---

**Happy Coding! 🚀**

Remember: Start small, test often, and don't hesitate to ask for help!
