# HotCRM Testing Infrastructure

This document describes the comprehensive testing infrastructure for HotCRM packages.

## Overview

The testing infrastructure covers four main packages:
- **CRM**: Customer relationship management features
- **Support**: Customer support and case management
- **Finance**: Financial operations (contracts, invoices)
- **Products**: Product catalog, pricing, and quotes

## Test Organization

```
packages/
├── crm/
│   └── __tests__/
│       ├── unit/
│       │   ├── objects/          # Object schema tests
│       │   └── actions/          # AI action unit tests
│       └── integration/
│           └── workflows/        # End-to-end workflow tests
├── support/
│   └── __tests__/
│       ├── unit/actions/
│       └── integration/workflows/
├── finance/
│   └── __tests__/
│       ├── unit/actions/
│       └── integration/workflows/
└── products/
    └── __tests__/
        ├── unit/actions/
        └── integration/workflows/
```

## Test Coverage

### CRM Package (34+ tests)
- **account.object.test.ts**: Schema validation tests
  - Field type validation
  - Required field checks
  - Relationship verification
  - Validation rule testing
  
- **account_ai.action.test.ts**: Account AI functionality
  - `calculateAccountHealth()` - Health scoring
  - `predictChurn()` - Churn prediction
  - `generateRecommendations()` - Product recommendations
  
- **contact_ai.action.test.ts**: Contact AI functionality
  - `enrichContact()` - Data enrichment
  - `detectBuyingIntent()` - Intent scoring
  - `analyzeSentiment()` - Email sentiment analysis
  
- **lead-to-opportunity.test.ts**: Workflow integration
  - Lead conversion process
  - Account/Contact creation
  - Duplicate prevention
  - Data preservation

### Support Package (21+ tests)
- **knowledge_ai.action.test.ts**: Knowledge base AI
  - `recommendArticles()` - Article recommendations
  - `autoTagArticle()` - Automatic tagging
  - `scoreArticleQuality()` - Quality assessment
  
- **sla_prediction.action.test.ts**: SLA management
  - `predictSLABreach()` - Breach prediction
  - `estimateResolutionTime()` - Time estimation
  - `analyzeEscalationNeeds()` - Escalation analysis
  
- **case-resolution.test.ts**: Case lifecycle
  - Case creation to resolution
  - SLA milestone tracking
  - Knowledge article linking
  - Collaboration features

### Finance Package (20+ tests)
- **contract_ai.action.test.ts**: Contract AI
  - `analyzeContractRisk()` - Risk analysis
  - `predictRenewal()` - Renewal prediction
  
- **invoice_prediction.action.test.ts**: Invoice AI
  - `predictPaymentDefault()` - Default prediction
  - `predictPaymentDate()` - Payment date estimation
  - `detectAnomalies()` - Anomaly detection
  
- **invoice-to-payment.test.ts**: Financial workflow
  - Invoice lifecycle
  - Payment application
  - Partial payments

### Products Package (13+ tests)
- **product_recommendation.action.test.ts**: Product AI
  - `recommendProducts()` - Smart recommendations
  
- **pricing_optimizer.action.test.ts**: Pricing AI
  - `optimizePricing()` - Price optimization
  
- **quote-to-order.test.ts**: CPQ workflow
  - Quote creation
  - Approval workflow
  - Order conversion

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests for Specific Package
```bash
npm test -- packages/crm/__tests__
npm test -- packages/support/__tests__
npm test -- packages/finance/__tests__
npm test -- packages/products/__tests__
```

### Run Specific Test File
```bash
npm test -- packages/crm/__tests__/unit/objects/account.object.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Watch Mode
```bash
npm test -- --watch
```

## Test Standards

All tests follow these standards:

### 1. AAA Pattern (Arrange, Act, Assert)
```typescript
it('should calculate health score', async () => {
  // Arrange
  const mockAccount = { name: 'Test Corp' };
  (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);
  
  // Act
  const result = await calculateAccountHealth({ accountId: 'acc_123' });
  
  // Assert
  expect(result.healthScore).toBeGreaterThan(0);
});
```

### 2. Proper Mocking
```typescript
jest.mock('../../../src/db', () => ({
  db: {
    doc: { get: jest.fn() },
    find: jest.fn()
  }
}));
```

### 3. Independent Tests
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 4. Descriptive Naming
```typescript
it('should identify high intent contacts', async () => {
  // Test implementation
});
```

### 5. Type Safety
```typescript
const result: AccountHealthResponse = await calculateAccountHealth(request);
expect(result.healthScore).toBeGreaterThanOrEqual(0);
```

## Test Data Patterns

### Mock Objects
- Use realistic test data
- Include edge cases
- Test boundary conditions
- Verify error handling

### Mock Responses
```typescript
const mockAccount = {
  name: 'Tech Corp',
  annual_revenue: 5000000,
  number_of_employees: 500,
  industry: 'Technology'
};
```

### Error Scenarios
```typescript
it('should throw error when neither caseId nor query provided', async () => {
  await expect(recommendArticles({})).rejects.toThrow();
});
```

## Coverage Goals

Current coverage targets (jest.config.js):
- Branches: 70%
- Functions: 75%
- Lines: 80%
- Statements: 80%

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Always mock db, APIs, etc.
3. **Test Behavior, Not Implementation**: Focus on outcomes
4. **Clear Assertions**: Use specific expectation matchers
5. **Edge Cases**: Test boundaries and error conditions
6. **Documentation**: Use clear test descriptions

## Common Patterns

### Testing Async Functions
```typescript
it('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Error Handling
```typescript
it('should handle errors gracefully', async () => {
  (db.find as jest.Mock).mockRejectedValue(new Error('DB Error'));
  await expect(someFunction()).rejects.toThrow('DB Error');
});
```

### Testing Array Results
```typescript
it('should return sorted results', async () => {
  const results = await getResults();
  expect(Array.isArray(results)).toBe(true);
  for (let i = 1; i < results.length; i++) {
    expect(results[i-1].score).toBeGreaterThanOrEqual(results[i].score);
  }
});
```

## CI/CD Integration

Tests are automatically run in CI/CD pipeline:
- On pull request creation
- On push to main branches
- Before deployment

## Troubleshooting

### TypeScript Errors
- Ensure proper type imports
- Use type assertions where needed: `as jest.Mock`
- Add `!` for non-null assertions when verified

### Mock Issues
- Clear mocks between tests: `jest.clearAllMocks()`
- Reset modules if needed: `jest.resetModules()`
- Check mock implementation order

### Async Test Timeouts
- Increase timeout: `jest.setTimeout(10000)`
- Ensure promises are properly awaited
- Check for hanging async operations

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure > 80% code coverage
3. Include both unit and integration tests
4. Follow existing patterns
5. Update this documentation if needed

## Resources

- [Jest Documentation](https://jestjs.io/)
- [ts-jest Configuration](https://kulshekhar.github.io/ts-jest/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

Last Updated: 2024
