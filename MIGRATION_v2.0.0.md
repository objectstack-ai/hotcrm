# Migration Guide: @objectstack v1.1.0 → v2.0.0

This document describes the breaking changes and migration steps when upgrading from @objectstack v1.1.0 to v2.0.0.

## Summary

@objectstack v2.0.0 introduces a breaking change to the Hook API. The `HookContext` interface has been redesigned to better align with ObjectQL lifecycle events and provide clearer semantics.

## Breaking Changes

### 1. Hook Context API Changes

The `HookContext` interface properties have changed:

#### Before (v1.1.0)
```typescript
interface HookContext {
  new: Record<string, any>;  // The new/current document
  old?: Record<string, any>; // The previous document (for updates/deletes)
  // ... other properties
}

const hook: Hook = {
  name: 'MyHook',
  events: ['afterUpdate'],
  handler: async (ctx) => {
    const newDoc = ctx.new;
    const oldDoc = ctx.old;
    if (newDoc.status === 'Active' && oldDoc.status !== 'Active') {
      // Do something
    }
  }
};
```

#### After (v2.0.0)
```typescript
interface HookContext {
  input: Record<string, unknown>;      // Contains { doc: ... } for insert/update
  result?: unknown;                     // The operation result (after* events)
  previous?: Record<string, unknown>;  // The previous state (update/delete)
  ql: unknown;                         // ObjectQL engine reference
  // ... other properties
}

const hook: Hook = {
  name: 'MyHook',
  events: ['afterUpdate'],
  handler: async (ctx: any) => {
    const newDoc = ctx.result as any;
    const oldDoc = ctx.previous as any;
    if (newDoc?.status === 'Active' && oldDoc?.status !== 'Active') {
      // Do something
    }
  }
};
```

## Migration Rules

### For `beforeInsert` Events
- **v1.1.0**: `ctx.new` contained the document being inserted
- **v2.0.0**: `ctx.input.doc` contains the document being inserted
- Mutations should be applied to `ctx.input.doc`

```typescript
// v1.1.0
handler: async (ctx) => {
  ctx.new.created_date = new Date().toISOString();
}

// v2.0.0
handler: async (ctx: any) => {
  (ctx.input.doc as any).created_date = new Date().toISOString();
}
```

### For `afterInsert` Events
- **v1.1.0**: `ctx.new` contained the inserted document
- **v2.0.0**: `ctx.result` contains the inserted document

```typescript
// v1.1.0
handler: async (ctx) => {
  const doc = ctx.new;
  console.log(`Created document ${doc._id}`);
}

// v2.0.0
handler: async (ctx: any) => {
  const doc = ctx.result as any;
  console.log(`Created document ${doc._id}`);
}
```

### For `beforeUpdate` Events
- **v1.1.0**: `ctx.new` = new values, `ctx.old` = previous values
- **v2.0.0**: `ctx.input.doc` = new values, `ctx.previous` = previous values
- Mutations should be applied to `ctx.input.doc`

```typescript
// v1.1.0
handler: async (ctx) => {
  const newDoc = ctx.new;
  const oldDoc = ctx.old;
  if (newDoc.status !== oldDoc.status) {
    ctx.new.status_changed_at = new Date().toISOString();
  }
}

// v2.0.0
handler: async (ctx: any) => {
  const newDoc = ctx.input.doc as any;
  const oldDoc = ctx.previous as any;
  if (newDoc?.status !== oldDoc?.status) {
    newDoc.status_changed_at = new Date().toISOString();
  }
}
```

### For `afterUpdate` Events
- **v1.1.0**: `ctx.new` = updated document, `ctx.old` = previous values
- **v2.0.0**: `ctx.result` = updated document, `ctx.previous` = previous values

```typescript
// v1.1.0
handler: async (ctx) => {
  const newDoc = ctx.new;
  const oldDoc = ctx.old;
  if (newDoc.status === 'Closed' && oldDoc.status !== 'Closed') {
    await sendNotification(newDoc);
  }
}

// v2.0.0
handler: async (ctx: any) => {
  const newDoc = ctx.result as any;
  const oldDoc = ctx.previous as any;
  if (newDoc?.status === 'Closed' && oldDoc?.status !== 'Closed') {
    await sendNotification(newDoc);
  }
}
```

### For `beforeDelete`/`afterDelete` Events
- **v1.1.0**: `ctx.old` contained the document being deleted
- **v2.0.0**: `ctx.previous` contains the document being deleted

```typescript
// v1.1.0
handler: async (ctx) => {
  const doc = ctx.old;
  console.log(`Deleting document ${doc._id}`);
}

// v2.0.0
handler: async (ctx: any) => {
  const doc = ctx.previous as any;
  console.log(`Deleting document ${doc._id}`);
}
```

### Handler Function Signature
- **v1.1.0**: `handler: async (ctx: HookContext) => { ... }`
- **v2.0.0**: `handler: async (ctx: any) => { ... }` (due to TypeScript strict typing)

The handler function should now use `ctx: any` to avoid type conflicts with the Zod-inferred type.

### Using `ctx.ql` (ObjectQL Engine)
- **v2.0.0**: `ctx.ql` is typed as `unknown`, must be cast to `any` when using

```typescript
// v2.0.0
handler: async (ctx: any) => {
  const records = await (ctx.ql as any).find('account', {
    filters: [['status', '=', 'Active']]
  });
}
```

## Testing Migration

Test mocks must also be updated to match the new API:

### Before (v1.1.0)
```typescript
const mockContext: HookContext = {
  event: 'afterUpdate',
  new: { id: '123', status: 'Active' },
  old: { id: '123', status: 'Pending' },
  ql: mockQl
};
```

### After (v2.0.0)
```typescript
const mockContext = {
  object: 'entity_name',
  event: 'afterUpdate',
  input: { doc: { id: '123', status: 'Active' } },
  result: { id: '123', status: 'Active' },
  previous: { id: '123', status: 'Pending' },
  ql: mockQl
};
```

## Automated Migration Script

For bulk migration, you can use the following pattern:

1. Find all hook handlers: `grep -r "ctx\.new\|ctx\.old" packages/*/src/hooks/*.hook.ts`
2. Apply the transformations above based on the event type
3. Update handler signatures to use `ctx: any`
4. Add type assertions for `ctx.ql`, `ctx.result`, `ctx.previous`, and `ctx.input.doc`

## Files Updated in This Migration

### Hook Implementation Files (19 files)
- `packages/crm/src/hooks/`: account.hook.ts, activity.hook.ts, contact.hook.ts, lead.hook.ts, opportunity.hook.ts
- `packages/finance/src/hooks/`: contract.hook.ts, contract_renewal.hook.ts
- `packages/hr/src/hooks/`: candidate.hook.ts, employee.hook.ts, offer.hook.ts, performance_review.hook.ts
- `packages/marketing/src/hooks/`: campaign.hook.ts, campaign_member.hook.ts, roi.hook.ts
- `packages/products/src/hooks/`: pricebook.hook.ts, product.hook.ts, quote.hook.ts
- `packages/support/src/hooks/`: case.hook.ts, knowledge.hook.ts

### Test Files (4 files)
- `packages/hr/__tests__/unit/hooks/`: candidate.hook.test.ts, employee.hook.test.ts, offer.hook.test.ts
- `packages/finance/__tests__/unit/hooks/`: contract_renewal.hook.test.ts

## Verification

After migration, verify that:
1. All packages build successfully: `pnpm -r build`
2. Validation passes: `pnpm validate`
3. All tests pass: `pnpm test`

## Additional Resources

- [@objectstack/spec v2.0.0 Release Notes](https://www.npmjs.com/package/@objectstack/spec)
- [ObjectStack Documentation](https://objectstack.ai)

## Support

If you encounter any issues during migration, please:
1. Check this migration guide
2. Review the test file updates as examples
3. Open an issue on the HotCRM repository
