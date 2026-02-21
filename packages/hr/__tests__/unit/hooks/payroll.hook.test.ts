import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  PayrollCalculationValidationTrigger,
  PayrollApprovalTrigger
} from '../../../src/hooks/payroll.hook';

vi.mock('@hotcrm/core', () => ({
  createLogger: () => ({
    info: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    debug: (...args: any[]) => console.debug(...args),
    fatal: (...args: any[]) => console.error(...args),
  }),
  logger: {
    info: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    debug: (...args: any[]) => console.debug(...args),
    fatal: (...args: any[]) => console.error(...args),
  },
}));

// Mock modules
const mockQlFind = vi.fn();
const mockQlDocGet = vi.fn();
const mockQlDocCreate = vi.fn();
const mockQlDocUpdate = vi.fn();

const createMockContext = (
  event: 'beforeInsert' | 'beforeUpdate' | 'afterUpdate',
  input: any,
  previous?: any,
  result?: any
): HookContext => {
  const baseContext = {
    event,
    ql: {
      find: mockQlFind,
      doc: {
        get: mockQlDocGet,
        create: mockQlDocCreate,
        update: mockQlDocUpdate
      }
    } as any,
    session: {
      userId: 'user_123',
      tenantId: 'tenant_123'
    } as any
  };

  if (event === 'beforeInsert' || event === 'beforeUpdate') {
    return {
      ...baseContext,
      input: { doc: input },
      previous
    };
  } else if (event === 'afterUpdate') {
    return {
      ...baseContext,
      input: { doc: input },
      result: result || input,
      previous
    };
  }
  return baseContext;
};

describe('Payroll Hook - PayrollCalculationValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('beforeInsert - Salary Validation', () => {
    it('should throw error when base_salary is negative', async () => {
      // Arrange
      const payroll = {
        employee: 'emp_123',
        base_salary: -1000,
        pay_period: 'monthly'
      };

      const ctx = createMockContext('beforeInsert', payroll);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(PayrollCalculationValidationTrigger.handler(ctx)).rejects.toThrow(
        'base_salary must be greater than or equal to 0'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should throw error for invalid pay_period', async () => {
      // Arrange
      const payroll = {
        employee: 'emp_123',
        base_salary: 5000,
        pay_period: 'daily'
      };

      const ctx = createMockContext('beforeInsert', payroll);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(PayrollCalculationValidationTrigger.handler(ctx)).rejects.toThrow(
        'Invalid pay_period "daily"'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should auto-calculate gross_pay from base_salary when not provided', async () => {
      // Arrange
      const payroll = {
        employee: 'emp_123',
        base_salary: 5000,
        pay_period: 'monthly'
      };

      const ctx = createMockContext('beforeInsert', payroll);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await PayrollCalculationValidationTrigger.handler(ctx);

      // Assert
      expect(ctx.input.doc.gross_pay).toBe(5000);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-calculated gross_pay: 5000')
      );

      consoleLogSpy.mockRestore();
    });

    it('should pass validation with valid data', async () => {
      // Arrange
      const payroll = {
        employee: 'emp_123',
        base_salary: 8000,
        pay_period: 'bi_weekly',
        gross_pay: 8500
      };

      const ctx = createMockContext('beforeInsert', payroll);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await PayrollCalculationValidationTrigger.handler(ctx);

      // Assert
      expect(ctx.input.doc.gross_pay).toBe(8500);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Payroll calculation validation passed')
      );

      consoleLogSpy.mockRestore();
    });
  });
});

describe('Payroll Hook - PayrollApprovalTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('beforeUpdate - Approval Validation', () => {
    it('should throw error when approving payroll with missing required fields', async () => {
      // Arrange
      const payroll = {
        id: 'pay_123',
        status: 'approved',
        base_salary: 5000
      };

      const previous = {
        id: 'pay_123',
        status: 'draft'
      };

      const ctx = createMockContext('beforeUpdate', payroll, previous);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(PayrollApprovalTrigger.handler(ctx)).rejects.toThrow(
        'Cannot approve payroll. Missing required fields'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should allow approval when all required fields are present', async () => {
      // Arrange
      const payroll = {
        id: 'pay_123',
        status: 'approved',
        employee: 'emp_123',
        pay_period: 'monthly',
        base_salary: 5000
      };

      const previous = {
        id: 'pay_123',
        status: 'draft'
      };

      const ctx = createMockContext('beforeUpdate', payroll, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await PayrollApprovalTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Payroll approved')
      );

      consoleLogSpy.mockRestore();
    });

    it('should set processed_date when status changes to processed', async () => {
      // Arrange
      const payroll = {
        id: 'pay_123',
        status: 'processed',
        employee: 'emp_123',
        pay_period: 'monthly',
        base_salary: 5000
      };

      const previous = {
        id: 'pay_123',
        status: 'approved'
      };

      const ctx = createMockContext('beforeUpdate', payroll, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await PayrollApprovalTrigger.handler(ctx);

      // Assert
      expect(ctx.input.doc.processed_date).toBeDefined();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Payroll processed_date set to')
      );

      consoleLogSpy.mockRestore();
    });

    it('should not trigger when status has not changed', async () => {
      // Arrange
      const payroll = {
        id: 'pay_123',
        status: 'draft',
        base_salary: 6000
      };

      const previous = {
        id: 'pay_123',
        status: 'draft'
      };

      const ctx = createMockContext('beforeUpdate', payroll, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await PayrollApprovalTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Payroll status changed')
      );

      consoleLogSpy.mockRestore();
    });
  });
});
