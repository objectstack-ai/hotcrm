# 🔧 Troubleshooting Guide

Common issues and solutions for ObjectStack development.

---

## TypeScript Type Errors

### Error: Type 'string' is not assignable to type 'FieldType'

**Problem:**
```typescript
// ❌ Error: Type '"dropdown"' is not assignable to type 'FieldType'
fields: {
  Status: {
    type: 'dropdown'  // Wrong type name
  }
}
```

**Solution:**
```typescript
// ✅ Use correct field type from spec
import type { ObjectDefinition } from '@objectstack/spec/data';

fields: {
  Status: {
    type: 'select'  // Correct type name
  }
}
```

**Reference:** Check [Field Type Reference](./workflow.prompt.md#field-types) for valid types.

---

### Error: Property 'relationshipName' is missing

**Problem:**
```typescript
// ❌ Missing relationshipName on lookup field
fields: {
  AccountId: {
    type: 'lookup',
    reference: 'account'
    // Missing relationshipName!
  }
}
```

**Solution:**
```typescript
// ✅ Add relationshipName for reverse lookup
fields: {
  AccountId: {
    type: 'lookup',
    label: 'Account',
    reference: 'account',
    relationshipName: 'contacts'  // Required
  }
}
```

**Why:** The `relationshipName` enables reverse lookup (e.g., `Account.contacts`).

---

### Error: Object literal may only specify known properties

**Problem:**
```typescript
// ❌ Unknown property
fields: {
  Name: {
    type: 'text',
    searcheable: true  // Typo: should be 'searchable'
  }
}
```

**Solution:**
```typescript
// ✅ Fix typo or check schema documentation
fields: {
  Name: {
    type: 'text',
    searchable: true  // Correct spelling
  }
}
```

**Debug:** Use TypeScript IntelliSense (Ctrl+Space) to see available properties.

---

## Build Errors

### Error: Cannot find module '@objectstack/spec'

**Problem:**
```bash
error TS2307: Cannot find module '@objectstack/spec/data' or its corresponding type declarations.
```

**Solution:**
```bash
# Install dependencies
pnpm install

# If still fails, clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Verify version:**
```json
// package.json
{
  "dependencies": {
    "@objectstack/spec": "^0.6.1"
  }
}
```

---

### Error: Circular dependency detected

**Problem:**
```typescript
// ❌ Circular import
// contact.object.ts
import { Account } from './account.object';

// account.object.ts
import { Contact } from './contact.object';
```

**Solution:**
```typescript
// ✅ Remove circular imports
// Use string references instead
fields: {
  AccountId: {
    type: 'lookup',
    reference: 'account',  // String reference, not import
    relationshipName: 'contacts'
  }
}
```

---

### Error: Build fails with 'out of memory'

**Problem:**
```bash
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

**Solution:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or in package.json scripts
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' pnpm build"
  }
}
```

---

## Validation Issues

### Validation Rules Not Triggering

**Problem:**
```typescript
// ❌ Validation doesn't trigger
validations: [
  {
    type: 'script',
    formula: 'Amount > 0'  // Missing required fields
  }
]
```

**Solution:**
```typescript
// ✅ Complete validation configuration
validations: [
  {
    type: 'script',
    name: 'amount_positive',           // Required: unique name
    errorMessage: 'Amount must be greater than 0',  // Required
    formula: 'Amount > 0',
    errorField: 'Amount'               // Specify which field shows error
  }
]
```

**Debug:**
```bash
# Check validation in development mode
# Look for console errors when saving records
```

---

### Uniqueness Validation Not Working

**Problem:**
```typescript
// ❌ Duplicates allowed despite validation
validations: [
  {
    type: 'uniqueness',
    fields: ['Email']
    // Missing error message
  }
]
```

**Solution:**
```typescript
// ✅ Add error message and ensure index exists
validations: [
  {
    type: 'uniqueness',
    name: 'unique_email',
    fields: ['Email'],
    errorMessage: 'Email address must be unique',
    errorField: 'Email'
  }
],
indexes: [
  { fields: ['Email'], unique: true }  // Add unique index
]
```

---

## Workflow Issues

### Workflows Not Executing

**Problem:**
```typescript
// ❌ Workflow doesn't trigger
workflows: [
  {
    type: 'fieldUpdate',
    actions: [
      { type: 'updateField', field: 'Status', value: 'Active' }
    ]
    // Missing trigger!
  }
]
```

**Solution:**
```typescript
// ✅ Add trigger condition
workflows: [
  {
    type: 'fieldUpdate',
    name: 'activate_on_approval',      // Add name
    trigger: {                         // Add trigger
      on: 'update',
      when: 'ApprovalStatus == "approved"'
    },
    actions: [
      { type: 'updateField', field: 'Status', value: 'Active' }
    ]
  }
]
```

---

### Workflow Infinite Loop

**Problem:**
```typescript
// ❌ Infinite loop: workflow updates trigger itself
workflows: [
  {
    trigger: { on: 'update' },  // Triggers on ANY update
    actions: [
      { type: 'updateField', field: 'UpdatedDate', value: 'NOW()' }
      // This causes another update, triggering workflow again!
    ]
  }
]
```

**Solution:**
```typescript
// ✅ Add condition to prevent loop
workflows: [
  {
    trigger: {
      on: 'update',
      when: 'PRIORVALUE(Status) != Status'  // Only when Status changes
    },
    actions: [
      { type: 'updateField', field: 'UpdatedDate', value: 'NOW()' }
    ]
  }
]
```

**Best Practice:** Always use specific trigger conditions to avoid loops.

---

## View/UI Issues

### List View Columns Not Displaying

**Problem:**
```typescript
// ❌ Columns don't show
views: [
  {
    type: 'list',
    name: 'all_accounts',
    viewType: 'grid',
    columns: ['CompanyName', 'Industry']  // Fields don't exist!
  }
]
```

**Solution:**
```typescript
// ✅ Use exact field names
views: [
  {
    type: 'list',
    name: 'all_accounts',
    viewType: 'grid',
    label: 'All Accounts',
    columns: ['Name', 'Industry']  // Match field names exactly
  }
]
```

**Debug:**
```typescript
// Check field names in object definition
console.log(Object.keys(Account.fields));
```

---

### Kanban View Not Grouping

**Problem:**
```typescript
// ❌ Kanban doesn't group by Status
views: [
  {
    type: 'list',
    viewType: 'kanban',
    groupBy: 'CurrentStatus'  // Field doesn't exist
  }
]
```

**Solution:**
```typescript
// ✅ Use correct field name and ensure it's a select field
fields: {
  Status: {
    type: 'select',  // Must be select type
    options: [
      { value: 'open', label: 'Open' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'closed', label: 'Closed' }
    ]
  }
},
views: [
  {
    type: 'list',
    viewType: 'kanban',
    groupBy: 'Status',  // Correct field name
    cardFields: ['Name', 'Priority']
  }
]
```

---

### Form Layout Not Rendering

**Problem:**
```typescript
// ❌ Form layout doesn't display
pageLayout: {
  sections: [  // Wrong: should be in tabs
    { fields: ['Name', 'Email'] }
  ]
}
```

**Solution:**
```typescript
// ✅ Use correct structure
pageLayout: {
  type: 'tabbed',  // or 'sections'
  tabs: [
    {
      label: 'Details',
      sections: [
        {
          label: 'Basic Info',
          columns: 2,
          fields: ['Name', 'Email']
        }
      ]
    }
  ]
}
```

---

## Relationship Issues

### Related Records Not Showing

**Problem:**
```typescript
// ❌ Account.contacts is undefined
const account = await db.find('account', accountId);
console.log(account.contacts);  // undefined
```

**Causes:**
1. Missing `relationshipName` on lookup field
2. Wrong relationship name
3. No related records exist

**Solution:**
```typescript
// ✅ Verify relationshipName in Contact object
export const Contact: ObjectDefinition = {
  name: 'contact',
  fields: {
    AccountId: {
      type: 'lookup',
      reference: 'account',
      relationshipName: 'contacts'  // Must match
    }
  }
};

// Query with includes
const account = await db.find('account', accountId, {
  include: ['contacts']  // Explicitly include
});
console.log(account.contacts);  // Array of contacts
```

---

### Cascade Delete Not Working

**Problem:**
```typescript
// ❌ Child records not deleted with parent
fields: {
  OrderId: {
    type: 'lookup',  // Should be masterDetail
    reference: 'order'
  }
}
```

**Solution:**
```typescript
// ✅ Use masterDetail with cascadeDelete
fields: {
  OrderId: {
    type: 'masterDetail',  // Not lookup
    reference: 'order',
    relationshipName: 'items',
    cascadeDelete: true     // Enable cascade
  }
}
```

---

## Performance Issues

### Slow List View Loading

**Problem:** List views take 5+ seconds to load.

**Diagnosis:**
```typescript
// Check if indexes exist
indexes: [
  // Missing indexes on frequently queried fields
]
```

**Solution:**
```typescript
// ✅ Add indexes to filtered/sorted fields
indexes: [
  { fields: ['Status'] },           // Frequently filtered
  { fields: ['CreatedDate'], direction: 'desc' },  // Frequently sorted
  { fields: ['AccountId'] },        // Foreign key
  { fields: ['Status', 'CreatedDate'] }  // Composite for common queries
]
```

---

### N+1 Query Problem

**Problem:**
```typescript
// ❌ Causes N+1 queries
const contacts = await db.findAll('contact');
for (const contact of contacts) {
  const account = await db.find('account', contact.AccountId);  // N queries!
}
```

**Solution:**
```typescript
// ✅ Use include to fetch related records
const contacts = await db.findAll('contact', {
  include: ['AccountId']  // Single query with join
});
for (const contact of contacts) {
  const account = contact.Account;  // Already loaded
}
```

---

## Development Environment Issues

### Port Already in Use

**Problem:**
```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 pnpm dev
```

---

### Hot Reload Not Working

**Problem:** Changes not reflecting in browser.

**Solutions:**

1. **Check watch mode:**
```bash
# Ensure dev mode is running
pnpm dev
```

2. **Clear browser cache:**
```
Ctrl+Shift+R (Chrome/Firefox)
Cmd+Shift+R (Mac)
```

3. **Restart dev server:**
```bash
# Stop (Ctrl+C) and restart
pnpm dev
```

4. **Check file is in watch path:**
```javascript
// Ensure file is in src/ directory
src/objects/account.object.ts  // ✅
objects/account.object.ts       // ❌ Not watched
```

---

### TypeScript Errors Not Showing

**Problem:** No type checking feedback during development.

**Solution:**
```bash
# Run TypeScript compiler in watch mode
pnpm tsc --noEmit --watch

# Or configure VS Code to show errors
# .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## Database/Data Issues

### Data Not Persisting

**Problem:** Changes saved but disappear on refresh.

**Causes:**
1. Development database in memory
2. Transaction not committed
3. Validation errors

**Solutions:**

```bash
# Check database configuration
# Ensure persistent storage

# Check for validation errors in console
# Fix validation rules

# Check transaction handling
try {
  await db.transaction(async (tx) => {
    await tx.create('account', data);
    // Ensure commit happens
  });
} catch (error) {
  console.error('Transaction failed:', error);
}
```

---

### Migration Failures

**Problem:**
```bash
Error: Migration failed: Cannot add required field without default value
```

**Solution:**
```typescript
// ✅ Add default value for new required fields
fields: {
  NewRequiredField: {
    type: 'text',
    required: true,
    defaultValue: 'Default Value'  // Add default
  }
}

// Or make it optional initially
fields: {
  NewField: {
    type: 'text',
    required: false  // Optional first, require later
  }
}
```

---

## Common Error Messages

### "Field name must use PascalCase"

**Error:**
```
Validation Error: Field 'account_name' must use PascalCase
```

**Fix:**
```typescript
// ❌ Wrong
fields: {
  account_name: { type: 'text' }
}

// ✅ Correct
fields: {
  AccountName: { type: 'text' }
}
```

---

### "Object name must use snake_case"

**Error:**
```
Validation Error: Object name 'AccountObject' must use snake_case
```

**Fix:**
```typescript
// ❌ Wrong
export const Account: ObjectDefinition = {
  name: 'AccountObject'
}

// ✅ Correct
export const Account: ObjectDefinition = {
  name: 'account'
}
```

---

### "relationshipName is required for lookup fields"

**Error:**
```
Validation Error: Field 'AccountId' missing relationshipName
```

**Fix:**
```typescript
// ❌ Wrong
AccountId: {
  type: 'lookup',
  reference: 'account'
}

// ✅ Correct
AccountId: {
  type: 'lookup',
  reference: 'account',
  relationshipName: 'contacts'
}
```

---

## Debugging Tips

### 1. Enable Debug Logging

```typescript
// Enable verbose logging
process.env.DEBUG = 'objectstack:*';

// Or specific modules
process.env.DEBUG = 'objectstack:query,objectstack:validation';
```

### 2. Use TypeScript Compiler

```bash
# Check types without building
pnpm tsc --noEmit

# Watch mode for continuous checking
pnpm tsc --noEmit --watch
```

### 3. Validate Schema

```bash
# Run protocol validation script
node scripts/validate-protocol.js

# Or create test
import { ObjectSchema } from '@objectstack/spec/data';

try {
  ObjectSchema.parse(myObjectDefinition);
  console.log('✅ Valid schema');
} catch (error) {
  console.error('❌ Schema validation failed:', error);
}
```

### 4. Inspect Generated Schema

```bash
# Build generates JSON schemas
pnpm build

# Inspect output
cat dist/schemas/account.schema.json
```

### 5. Use Browser DevTools

```javascript
// In browser console
// Inspect object definition
window.__OBJECTSTACK__.objects.account

// Inspect current record
window.__OBJECTSTACK__.currentRecord

// Check validation state
window.__OBJECTSTACK__.validation
```

---

## Getting Help

### 1. Check Documentation

- [ObjectStack Documentation](https://objectstack.dev/docs)
- [API Reference](https://objectstack.dev/api)
- [Examples](https://github.com/objectstack/examples)

### 2. Search Issues

```bash
# Search GitHub issues
https://github.com/objectstack/spec/issues?q=<your+error>
```

### 3. Ask Community

- [GitHub Discussions](https://github.com/objectstack/spec/discussions)
- [Discord Channel](https://discord.gg/objectstack)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/objectstack)

### 4. Report Bug

When reporting issues, include:

```markdown
**Environment:**
- ObjectStack Spec version: 0.6.1
- Node version: 20.11.0
- TypeScript version: 5.3.3
- OS: macOS 14.0

**Object Definition:**
```typescript
// Paste your object definition
```

**Error Message:**
```
Paste full error message and stack trace
```

**Steps to Reproduce:**
1. Create object with...
2. Try to...
3. Error occurs...

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens
```

---

## Related Guides

- [Development Workflow](./workflow.prompt.md)
- [Best Practices](./best-practices.prompt.md)
- [Iterative Development](./iteration.prompt.md)
- [Version Management](./versioning.prompt.md)
