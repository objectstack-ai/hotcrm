import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  GoalProgressTrackingTrigger,
  GoalAlignmentValidationTrigger
} from '../../../src/hooks/goal.hook';

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

describe('Goal Hook - GoalProgressTrackingTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('beforeUpdate - Progress Tracking', () => {
    it('should set status to "not_started" when progress is 0', async () => {
      // Arrange
      const goal = {
        id: 'goal_123',
        progress_percent: 0
      };

      const previous = {
        id: 'goal_123',
        progress_percent: 50
      };

      const ctx = createMockContext('beforeUpdate', goal, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await GoalProgressTrackingTrigger.handler(ctx);

      // Assert
      expect(ctx.input.doc.status).toBe('not_started');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Goal status set to "not_started"')
      );

      consoleLogSpy.mockRestore();
    });

    it('should set status to "in_progress" when progress is between 1 and 99', async () => {
      // Arrange
      const goal = {
        id: 'goal_123',
        progress_percent: 50
      };

      const previous = {
        id: 'goal_123',
        progress_percent: 0
      };

      const ctx = createMockContext('beforeUpdate', goal, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await GoalProgressTrackingTrigger.handler(ctx);

      // Assert
      expect(ctx.input.doc.status).toBe('in_progress');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Goal status set to "in_progress"')
      );

      consoleLogSpy.mockRestore();
    });

    it('should set status to "completed" and completed_date when progress is 100', async () => {
      // Arrange
      const goal = {
        id: 'goal_123',
        progress_percent: 100
      };

      const previous = {
        id: 'goal_123',
        progress_percent: 80
      };

      const ctx = createMockContext('beforeUpdate', goal, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await GoalProgressTrackingTrigger.handler(ctx);

      // Assert
      expect(ctx.input.doc.status).toBe('completed');
      expect(ctx.input.doc.completed_date).toBeDefined();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Goal completed!')
      );

      consoleLogSpy.mockRestore();
    });

    it('should not update status when progress_percent has not changed', async () => {
      // Arrange
      const goal = {
        id: 'goal_123',
        progress_percent: 50
      };

      const previous = {
        id: 'goal_123',
        progress_percent: 50
      };

      const ctx = createMockContext('beforeUpdate', goal, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await GoalProgressTrackingTrigger.handler(ctx);

      // Assert
      expect(ctx.input.doc.status).toBeUndefined();
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Goal progress tracking updated')
      );

      consoleLogSpy.mockRestore();
    });

    it('should skip when progress_percent is undefined', async () => {
      // Arrange
      const goal = {
        id: 'goal_123',
        goal_name: 'Updated Name'
      };

      const previous = {
        id: 'goal_123',
        progress_percent: 50
      };

      const ctx = createMockContext('beforeUpdate', goal, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await GoalProgressTrackingTrigger.handler(ctx);

      // Assert
      expect(ctx.input.doc.status).toBeUndefined();

      consoleLogSpy.mockRestore();
    });
  });
});

describe('Goal Hook - GoalAlignmentValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('beforeInsert - Parent Goal Validation', () => {
    it('should validate parent_goal exists when provided', async () => {
      // Arrange
      const goal = {
        goal_name: 'Team Goal',
        parent_goal: 'parent_goal_123'
      };

      mockQlDocGet.mockResolvedValue({ id: 'parent_goal_123', goal_name: 'Company Goal' });

      const ctx = createMockContext('beforeInsert', goal);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await GoalAlignmentValidationTrigger.handler(ctx);

      // Assert
      expect(mockQlDocGet).toHaveBeenCalledWith('goal', 'parent_goal_123');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Goal aligned to parent: Company Goal')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Goal alignment validation passed')
      );

      consoleLogSpy.mockRestore();
    });

    it('should throw error when parent_goal does not exist', async () => {
      // Arrange
      const goal = {
        goal_name: 'Orphan Goal',
        parent_goal: 'nonexistent_goal'
      };

      mockQlDocGet.mockResolvedValue(null);

      const ctx = createMockContext('beforeInsert', goal);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(GoalAlignmentValidationTrigger.handler(ctx)).rejects.toThrow(
        'Parent goal "nonexistent_goal" does not exist'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should skip validation when parent_goal is not provided', async () => {
      // Arrange
      const goal = {
        goal_name: 'Standalone Goal'
      };

      const ctx = createMockContext('beforeInsert', goal);

      // Act
      await GoalAlignmentValidationTrigger.handler(ctx);

      // Assert
      expect(mockQlDocGet).not.toHaveBeenCalled();
    });
  });
});
