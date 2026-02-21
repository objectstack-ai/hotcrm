import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  AttendanceValidationTrigger,
  AttendanceDuplicateCheckTrigger
} from '../../../src/hooks/attendance.hook';

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
  event: 'beforeInsert' | 'beforeUpdate' | 'afterInsert',
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
  } else if (event === 'afterInsert') {
    return {
      ...baseContext,
      input: { doc: input },
      result: result || input,
      previous
    };
  }
  return baseContext;
};

describe('Attendance Hook - AttendanceValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('beforeInsert - Validation', () => {
    it('should throw error when check_in is not provided', async () => {
      // Arrange
      const attendance = {
        employee: 'emp_123'
      };

      const ctx = createMockContext('beforeInsert', attendance);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(AttendanceValidationTrigger.handler(ctx)).rejects.toThrow(
        'check_in is required for attendance records'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when check_out is before check_in', async () => {
      // Arrange
      const attendance = {
        employee: 'emp_123',
        check_in: '2024-06-01T09:00:00Z',
        check_out: '2024-06-01T08:00:00Z'
      };

      const ctx = createMockContext('beforeInsert', attendance);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(AttendanceValidationTrigger.handler(ctx)).rejects.toThrow(
        'check_out must be after check_in'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should auto-calculate hours_worked from check_in and check_out', async () => {
      // Arrange
      const attendance = {
        employee: 'emp_123',
        check_in: '2024-06-01T09:00:00Z',
        check_out: '2024-06-01T17:00:00Z'
      };

      const ctx = createMockContext('beforeInsert', attendance);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await AttendanceValidationTrigger.handler(ctx);

      // Assert
      expect(ctx.input.doc.hours_worked).toBe(8);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-calculated hours_worked: 8h')
      );

      consoleLogSpy.mockRestore();
    });

    it('should pass validation with only check_in provided', async () => {
      // Arrange
      const attendance = {
        employee: 'emp_123',
        check_in: '2024-06-01T09:00:00Z'
      };

      const ctx = createMockContext('beforeInsert', attendance);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await AttendanceValidationTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attendance validation passed')
      );

      consoleLogSpy.mockRestore();
    });
  });
});

describe('Attendance Hook - AttendanceDuplicateCheckTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('beforeInsert - Duplicate Detection', () => {
    it('should throw error when duplicate attendance record exists', async () => {
      // Arrange
      const attendance = {
        employee: 'emp_123',
        check_in: '2024-06-01T09:00:00Z'
      };

      mockQlFind.mockResolvedValue([{ id: 'att_existing', employee: 'emp_123' }]);

      const ctx = createMockContext('beforeInsert', attendance);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(AttendanceDuplicateCheckTrigger.handler(ctx)).rejects.toThrow(
        'Attendance record already exists'
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate attendance record detected')
      );

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should pass when no duplicate attendance record exists', async () => {
      // Arrange
      const attendance = {
        employee: 'emp_123',
        check_in: '2024-06-01T09:00:00Z'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', attendance);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await AttendanceDuplicateCheckTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No duplicate attendance record found')
      );

      consoleLogSpy.mockRestore();
    });

    it('should skip duplicate check when employee or check_in is missing', async () => {
      // Arrange
      const attendance = {
        check_in: '2024-06-01T09:00:00Z'
      };

      const ctx = createMockContext('beforeInsert', attendance);

      // Act
      await AttendanceDuplicateCheckTrigger.handler(ctx);

      // Assert
      expect(mockQlFind).not.toHaveBeenCalled();
    });
  });
});
