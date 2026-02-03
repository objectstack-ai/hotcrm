# Testing Guide - HotCRM

Comprehensive testing infrastructure for HotCRM covering unit tests, integration tests, and E2E scenarios.

## 🎯 Testing Strategy

HotCRM follows a three-tier testing approach:

1. **Unit Tests (85%+ coverage)** - Test individual functions and components in isolation
2. **Integration Tests (70%+ coverage)** - Test workflows and interactions between modules
3. **E2E Tests (Critical paths 100%)** - Test complete user journeys

## 🚀 Quick Start

```bash
# Run all tests
pnpm test

# Run tests with coverage report
pnpm test:coverage

# Run tests in watch mode (for development)
pnpm test:watch

# Run only unit tests
pnpm test:unit

# Run only integration tests
pnpm test:integration

# Run tests for specific package
pnpm --filter @hotcrm/crm test
```

## 📁 Test Structure

```
packages/{package}/
├── __tests__/
│   ├── unit/
│   │   ├── objects/       # Object schema tests
│   │   ├── hooks/         # Business logic tests
│   │   ├── actions/       # AI action tests
│   │   └── providers/     # Provider implementation tests (AI package)
│   ├── integration/
│   │   ├── workflows/     # End-to-end workflow tests
│   │   └── api/           # API integration tests
│   └── e2e/
│       └── scenarios/     # User journey tests
└── src/
```

## ✅ Package Test Coverage

| Package | Unit Tests | Integration Tests | Total Tests | Status |
|---------|-----------|-------------------|-------------|--------|
| @hotcrm/ai | 68 | 1 | 69 | ✅ All Passing |
| @hotcrm/crm | 45+ | 5+ | 50+ | ✅ All Passing |
| @hotcrm/products | 10+ | 2+ | 12+ | ✅ All Passing |
| @hotcrm/finance | 10+ | 2+ | 12+ | ✅ All Passing |
| @hotcrm/support | 45+ | 5+ | 50+ | ✅ All Passing |
| @hotcrm/hr | 145+ | 5+ | 150+ | ✅ All Passing |
| @hotcrm/marketing | - | - | - | ⏳ Pending |
| **Total** | **323+** | **20+** | **378+** | ✅ **All Passing** |

## 📝 Test Examples

### Unit Test - AI Action

```typescript
// packages/crm/__tests__/unit/actions/account_ai.action.test.ts

import { calculateAccountHealth } from '../../../src/actions/account_ai.action';
import { db } from '../../../src/db';

jest.mock('../../../src/db');

describe('Account AI - calculateAccountHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate health score for healthy account', async () => {
    // Arrange
    (db.doc.get as jest.Mock).mockResolvedValue({
      name: 'Test Account',
      annual_revenue: 1000000,
      created_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    });

    (db.find as jest.Mock).mockImplementation((objectType) => {
      if (objectType === 'opportunity') {
        return Promise.resolve([
          { amount: 50000, stage: 'Closed Won' }
        ]);
      }
      if (objectType === 'case') {
        return Promise.resolve([]);
      }
      if (objectType === 'activity') {
        return Promise.resolve(
          Array(20).fill({ activity_date: new Date().toISOString() })
        );
      }
      return Promise.resolve([]);
    });

    // Act
    const result = await calculateAccountHealth({ accountId: 'acc_123' });

    // Assert
    expect(result.healthScore).toBeGreaterThan(70);
    expect(result.healthStatus).toBe('good');
    expect(result.components).toBeDefined();
  });
});
```

### Integration Test - Workflow

```typescript
// packages/crm/__tests__/integration/workflows/lead-to-opportunity.test.ts

describe('Lead to Opportunity Conversion Workflow', () => {
  it('should convert qualified lead to opportunity', async () => {
    // Arrange - Create a lead
    const lead = await createTestLead({
      first_name: 'John',
      last_name: 'Doe',
      company: 'Test Corp',
      status: 'Qualified'
    });

    // Act - Convert to opportunity
    const result = await convertLead(lead.id);

    // Assert
    expect(result.opportunity).toBeDefined();
    expect(result.account).toBeDefined();
    expect(result.contact).toBeDefined();
    expect(lead.status).toBe('Converted');
  });
});
```

## 🎯 Coverage Goals

Current coverage thresholds in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 75,
    lines: 80,
    statements: 80
  }
}
```

### Package-Specific Coverage

| Package | Unit Coverage | Integration Coverage | E2E Coverage |
|---------|--------------|---------------------|--------------|
| CRM | 85%+ | 70%+ | Critical paths |
| Support | 85%+ | 70%+ | Critical paths |
| Finance | 85%+ | 70%+ | Critical paths |
| Products | 85%+ | 70%+ | Critical paths |
| AI | 90%+ | N/A | N/A |

## 🧪 Test Categories

### 1. Object Schema Tests

Test object definitions for:
- Required fields
- Field types
- Field validation
- Relationships
- Default values

### 2. Action Tests

Test AI-enhanced actions for:
- Correct calculations
- Proper error handling
- Database interactions (mocked)
- Edge cases
- Confidence scores

### 3. Hook Tests

Test business logic for:
- Before/after triggers
- Field validations
- Complex calculations
- Side effects

### 4. Workflow Tests

Test complete workflows for:
- Lead conversion
- Opportunity management
- Case resolution
- Invoice payment
- Quote to order

## 🛠️ Testing Tools

### Jest
- Test runner and framework
- Coverage reporting
- Mocking capabilities

### ts-jest
- TypeScript support
- Type checking in tests

### Future Additions
- **Playwright** - E2E browser testing
- **k6** - Performance/load testing
- **SonarQube** - Code quality analysis

## 📊 Coverage Reports

Coverage reports are generated in the `coverage/` directory:

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Coverage Report Types

1. **Text** - Console output with summary
2. **LCOV** - Machine-readable format for CI/CD
3. **HTML** - Interactive web-based report
4. **JSON Summary** - Programmatic access to metrics

## 🎨 Best Practices

### 1. Test Naming

Use descriptive "should..." format:

```typescript
it('should calculate health score above 80 for highly engaged account', ...)
it('should predict churn when engagement drops below threshold', ...)
it('should recommend products based on industry', ...)
```

### 2. AAA Pattern

Follow Arrange-Act-Assert:

```typescript
it('should do something', () => {
  // Arrange - Setup test data
  const input = { ... };
  
  // Act - Execute function
  const result = myFunction(input);
  
  // Assert - Verify results
  expect(result).toBe(expected);
});
```

### 3. Mocking

Mock external dependencies:

```typescript
jest.mock('../../../src/db');

(db.doc.get as jest.Mock).mockResolvedValue({ ... });
```

### 4. Test Independence

Each test should be independent:

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  // Reset state
});

afterEach(() => {
  // Cleanup
});
```

### 5. Edge Cases

Test boundaries and errors:

```typescript
it('should handle empty account data', ...)
it('should throw error for invalid input', ...)
it('should handle null values gracefully', ...)
```

## 🔧 Configuration

### jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'packages/**/src/**/*.ts',
    '!packages/**/src/**/*.d.ts',
    '!packages/**/src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  }
};
```

## 🚨 Continuous Integration

Tests run automatically on:

- Every pull request
- Every commit to main
- Nightly builds

### CI Pipeline

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: pnpm test:coverage
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## 📈 Metrics & Monitoring

Track test metrics:

1. **Test Count** - Total number of tests
2. **Coverage** - Code coverage percentage
3. **Duration** - Test execution time
4. **Flakiness** - Test stability over time

## 🐛 Debugging Tests

### Run specific test file

```bash
pnpm test account_ai.action.test.ts
```

### Run specific test case

```bash
pnpm test -t "should calculate health score"
```

### Debug mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://testingjavascript.com/)
- [TypeScript + Jest Guide](https://kulshekhar.github.io/ts-jest/)

## 🤝 Contributing

When adding new features:

1. ✅ Write tests first (TDD)
2. ✅ Achieve minimum coverage thresholds
3. ✅ Test both success and error cases
4. ✅ Update this guide if adding new patterns
5. ✅ Run full test suite before committing

## 📞 Support

For testing questions:
- Check existing test examples in `__tests__/`
- Review this guide
- Ask in #engineering Slack channel
