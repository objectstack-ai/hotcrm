# HR Package Unit Tests

This directory contains comprehensive unit tests for the HR package hooks.

## Test Structure

```
__tests__/
└── unit/
    └── hooks/
        ├── candidate.hook.test.ts    # Candidate scoring and status triggers
        ├── employee.hook.test.ts     # Employee lifecycle triggers
        └── offer.hook.test.ts        # Offer approval workflow
```

## Test Coverage

### Candidate Hook Tests (`candidate.hook.test.ts`)

**CandidateScoringTrigger**
- ✅ Candidate score calculation based on qualifications
- ✅ Education scoring (PhD, Master, Bachelor, etc.)
- ✅ Experience scoring (0-15+ years)
- ✅ Source quality scoring (Employee Referral, Headhunter, etc.)
- ✅ Profile completeness scoring
- ✅ Duplicate candidate detection (same email)
- ✅ Auto-screening logic (email, phone, resume validation)
- ✅ Status auto-update on passing screening
- ✅ Score recalculation on update
- ✅ Error handling (non-throwing on QL failures)

**CandidateStatusChangeTrigger**
- ✅ Status change detection
- ✅ Interviewing status handling
- ✅ Hired status handling
- ✅ Rejected status handling
- ✅ Withdrawn status handling
- ✅ Activity logging
- ✅ Error handling

**Total Test Cases**: 25+

### Employee Hook Tests (`employee.hook.test.ts`)

**EmployeeDataValidationTrigger**
- ✅ Full name auto-generation (Chinese naming: LastFirst)
- ✅ Hire date validation (future dates for pre-boarding)
- ✅ Termination date validation (must be after hire date)
- ✅ Email domain validation
- ✅ Data validation on insert and update
- ✅ Error throwing to prevent invalid saves

**EmployeeOnboardingTrigger**
- ✅ Onboarding record creation
- ✅ 90-day onboarding target date calculation
- ✅ Probation goals creation
- ✅ Manager notification (when assigned)
- ✅ Skip manager notification (when not assigned)
- ✅ Error handling (non-throwing on failures)

**EmployeeStatusChangeTrigger**
- ✅ Employment status change detection
- ✅ Activation handling
- ✅ Termination handling (offboarding record)
- ✅ Inactive status handling (same as termination)
- ✅ On Leave status handling
- ✅ Activity logging
- ✅ Error handling

**Total Test Cases**: 20+

### Offer Hook Tests (`offer.hook.test.ts`)

**OfferCreationTrigger**
- ✅ Offer number generation (OFF-YYYYMM-NNNN format)
- ✅ Sequential offer number generation
- ✅ Expiry date calculation (7 days default)
- ✅ Default status setting (Draft)
- ✅ Error throwing on creation failures

**OfferApprovalTrigger**
- ✅ Approval status change detection
- ✅ Approval handling (status update, approved_date, approved_by)
- ✅ Status transition to Approved (from Draft)
- ✅ No status change if already sent
- ✅ Rejection handling (back to Draft)
- ✅ Error handling

**OfferStatusChangeTrigger**
- ✅ Status change detection
- ✅ Sent status handling (candidate + application update, sent_date)
- ✅ Accepted status handling (employee record creation)
- ✅ Employee number generation (EMPYYYYNNNN format)
- ✅ Link employee to offer
- ✅ Set acceptance_date
- ✅ Rejected status handling (rejection_date)
- ✅ Expired status handling
- ✅ Withdrawn status handling
- ✅ Error handling (non-throwing on failures)

**Total Test Cases**: 30+

## Running Tests

```bash
# Run all HR tests
pnpm test packages/hr/__tests__

# Run specific hook tests
pnpm test packages/hr/__tests__/unit/hooks/candidate.hook.test.ts
pnpm test packages/hr/__tests__/unit/hooks/employee.hook.test.ts
pnpm test packages/hr/__tests__/unit/hooks/offer.hook.test.ts

# Run with coverage
pnpm test:coverage -- packages/hr/__tests__
```

## Test Patterns

All tests follow the **AAA Pattern** (Arrange-Act-Assert):

```typescript
import { vi } from 'vitest';

it('should calculate score for complete candidate profile', async () => {
  // Arrange - Setup test data and mocks
  const candidate = { ... };
  mockQlFind.mockResolvedValue([]);
  const ctx = createMockContext('beforeInsert', candidate);

  // Act - Execute the function under test
  await CandidateScoringTrigger.handler(ctx);

  // Assert - Verify the results
  expect(candidate.score).toBeGreaterThan(70);
});
```

## Mock Strategy

- **HookContext**: Fully mocked with ql operations
- **ql.find**: Mocked for query operations
- **ql.doc.get/create/update**: Mocked for document operations
- **Console methods**: Spied on to verify logging
- **Error scenarios**: Tested by mocking rejections

## Key Testing Principles

1. ✅ **Isolation**: Each test is independent with fresh mocks
2. ✅ **Coverage**: Success paths, edge cases, and error scenarios
3. ✅ **Clarity**: Descriptive test names using "should..." pattern
4. ✅ **Assertions**: Clear expectations with meaningful error messages
5. ✅ **Error Handling**: Non-throwing errors are verified
6. ✅ **Business Logic**: All scoring, validation, and workflow rules tested

## Test Utilities

### createMockContext
Creates a mock HookContext with all necessary mocks:

```typescript
const ctx = createMockContext(
  'beforeInsert',  // event type
  candidate,       // input data
  previous         // optional previous data for updates
);
```

## Notes

- Tests use `vi.mock()` for module mocking
- Dynamic imports used to reload modules between tests
- Console methods are spied on to verify logging without cluttering output
- Error tests verify that hooks don't throw to prevent blocking saves
