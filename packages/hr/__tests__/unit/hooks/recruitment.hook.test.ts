import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  RecruitmentPipelineValidationTrigger,
  RecruitmentMetricsTrigger
} from '../../../src/hooks/recruitment.hook';

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

describe('Recruitment Hook - RecruitmentPipelineValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('beforeInsert - Stage Validation', () => {
    it('should accept valid pipeline stages', async () => {
      // Arrange
      const recruitment = {
        name: 'Senior Engineer Hiring',
        stage: 'screening',
        status: 'open'
      };

      const ctx = createMockContext('beforeInsert', recruitment);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await RecruitmentPipelineValidationTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Recruitment pipeline validation passed')
      );

      consoleLogSpy.mockRestore();
    });

    it('should throw error for invalid pipeline stage', async () => {
      // Arrange
      const recruitment = {
        name: 'Invalid Pipeline',
        stage: 'invalid_stage'
      };

      const ctx = createMockContext('beforeInsert', recruitment);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(RecruitmentPipelineValidationTrigger.handler(ctx)).rejects.toThrow(
        'Invalid recruitment stage "invalid_stage"'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should auto-set status to "open" on insert if not provided', async () => {
      // Arrange
      const recruitment = {
        name: 'New Recruitment',
        stage: 'sourcing'
      };

      const ctx = createMockContext('beforeInsert', recruitment);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await RecruitmentPipelineValidationTrigger.handler(ctx);

      // Assert
      expect(ctx.input.doc.status).toBe('open');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-set recruitment status to "open"')
      );

      consoleLogSpy.mockRestore();
    });

    it('should not override existing status on insert', async () => {
      // Arrange
      const recruitment = {
        name: 'Existing Status',
        stage: 'interviewing',
        status: 'in_progress'
      };

      const ctx = createMockContext('beforeInsert', recruitment);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await RecruitmentPipelineValidationTrigger.handler(ctx);

      // Assert
      expect(ctx.input.doc.status).toBe('in_progress');

      consoleLogSpy.mockRestore();
    });
  });

  describe('beforeUpdate - Stage Validation', () => {
    it('should validate stage on update and not auto-set status', async () => {
      // Arrange
      const recruitment = {
        id: 'rec_123',
        stage: 'offer'
      };

      const previous = {
        id: 'rec_123',
        stage: 'interviewing'
      };

      const ctx = createMockContext('beforeUpdate', recruitment, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await RecruitmentPipelineValidationTrigger.handler(ctx);

      // Assert
      expect(ctx.input.doc.status).toBeUndefined();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Recruitment pipeline validation passed')
      );

      consoleLogSpy.mockRestore();
    });
  });
});

describe('Recruitment Hook - RecruitmentMetricsTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('afterUpdate - Stage Transition Logging', () => {
    it('should log pipeline stage transition when stage changes', async () => {
      // Arrange
      const recruitment = {
        id: 'rec_123',
        name: 'Engineer Hiring',
        stage: 'interviewing'
      };

      const previous = {
        id: 'rec_123',
        stage: 'screening'
      };

      const ctx = createMockContext('afterUpdate', recruitment, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await RecruitmentMetricsTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Recruitment pipeline stage transition: "screening" → "interviewing"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline metric logged')
      );

      consoleLogSpy.mockRestore();
    });

    it('should not log when stage has not changed', async () => {
      // Arrange
      const recruitment = {
        id: 'rec_123',
        stage: 'screening'
      };

      const previous = {
        id: 'rec_123',
        stage: 'screening'
      };

      const ctx = createMockContext('afterUpdate', recruitment, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await RecruitmentMetricsTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Pipeline metric logged')
      );

      consoleLogSpy.mockRestore();
    });
  });
});
