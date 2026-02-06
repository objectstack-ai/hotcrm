import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  CandidateScoringTrigger,
  CandidateStatusChangeTrigger
} from '../../../src/hooks/candidate.hook';

// Mock modules
const mockQlFind = vi.fn();
const mockQlDocGet = vi.fn();
const mockQlDocCreate = vi.fn();
const mockQlDocUpdate = vi.fn();

const createMockContext = (
  event: 'beforeInsert' | 'beforeUpdate' | 'afterUpdate',
  input: any,
  previous?: any
): HookContext => ({
  event,
  input,
  previous,
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
});

describe('Candidate Hook - CandidateScoringTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('beforeInsert - Candidate Scoring', () => {
    it('should calculate score for complete candidate profile', async () => {
      // Arrange
      const candidate = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@example.com',
        mobile_phone: '+8613812345678',
        current_company: 'Tech Corp',
        current_title: 'Senior Engineer',
        years_of_experience: 8,
        highest_education: 'Master',
        expected_salary: 300000,
        resume_url: 'https://example.com/resume.pdf',
        source: 'Employee Referral',
        notice_period: 'Immediate',
        status: 'new'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', candidate);

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(candidate.score).toBeDefined();
      expect(candidate.score).toBeGreaterThan(0);
      expect(candidate.score).toBeLessThanOrEqual(100);
      expect(candidate.score).toBeGreaterThan(70); // Should be high score for complete profile
    });

    it('should assign lower score for incomplete profile', async () => {
      // Arrange
      const candidate = {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john@example.com',
        status: 'new',
        years_of_experience: 1,
        highest_education: 'High School'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', candidate);

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(candidate.score).toBeDefined();
      expect(candidate.score).toBeLessThan(50); // Should be lower for incomplete profile
    });

    it('should give maximum education points for PhD', async () => {
      // Arrange
      const candidate = {
        first_name: 'Dr.',
        last_name: 'Expert',
        email: 'expert@example.com',
        highest_education: 'PhD',
        years_of_experience: 15,
        resume_url: 'https://example.com/resume.pdf',
        status: 'new'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', candidate);

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(candidate.score).toBeGreaterThan(60); // PhD + 15 years should score high
    });

    it('should award maximum experience points for 10+ years', async () => {
      // Arrange
      const candidate = {
        first_name: 'Senior',
        last_name: 'Developer',
        email: 'senior@example.com',
        years_of_experience: 15,
        highest_education: 'Bachelor',
        resume_url: 'https://example.com/resume.pdf',
        status: 'new'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', candidate);

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(candidate.score).toBeGreaterThan(50);
    });
  });

  describe('beforeInsert - Duplicate Detection', () => {
    it('should warn about duplicate candidates with same email', async () => {
      // Arrange
      const candidate = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'duplicate@example.com',
        status: 'new'
      };

      const duplicateCandidate = {
        id: 'existing_123',
        email: 'duplicate@example.com',
        first_name: 'Jane',
        last_name: 'Doe'
      };

      mockQlFind.mockResolvedValue([duplicateCandidate]);

      const ctx = createMockContext('beforeInsert', candidate);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(mockQlFind).toHaveBeenCalledWith('candidate', expect.objectContaining({
        filters: expect.arrayContaining([
          ['email', '=', 'duplicate@example.com']
        ]),
        limit: 1
      }));
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate candidate detected')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should not check duplicates for beforeUpdate if email unchanged', async () => {
      // Arrange
      const candidate = {
        id: 'cand_123',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        status: 'under_review'
      };

      const previous = {
        id: 'cand_123',
        email: 'jane@example.com',
        status: 'new'
      };

      const ctx = createMockContext('beforeUpdate', candidate, previous);

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(mockQlFind).not.toHaveBeenCalled();
    });

    it('should check duplicates if email changed during update', async () => {
      // Arrange
      const candidate = {
        id: 'cand_123',
        email: 'newemail@example.com',
        status: 'new'
      };

      const previous = {
        id: 'cand_123',
        email: 'oldemail@example.com',
        status: 'new'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeUpdate', candidate, previous);

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(mockQlFind).toHaveBeenCalledWith('candidate', expect.objectContaining({
        filters: expect.arrayContaining([
          ['email', '=', 'newemail@example.com']
        ])
      }));
    });
  });

  describe('beforeInsert - Auto-screening', () => {
    it('should pass auto-screening for qualified candidate', async () => {
      // Arrange
      const candidate = {
        first_name: 'qualified',
        last_name: 'Candidate',
        email: 'qualified@example.com',
        mobile_phone: '+8613812345678',
        resume_url: 'https://example.com/resume.pdf',
        years_of_experience: 5,
        status: 'new'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', candidate);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(candidate.status).toBe('under_review');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('passed auto-screening')
      );

      consoleLogSpy.mockRestore();
    });

    it('should fail auto-screening for candidate without email', async () => {
      // Arrange
      const candidate = {
        first_name: 'Incomplete',
        last_name: 'Candidate',
        mobile_phone: '+8613812345678',
        resume_url: 'https://example.com/resume.pdf',
        status: 'new'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', candidate);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(candidate.status).toBe('new');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('did not pass auto-screening')
      );

      consoleLogSpy.mockRestore();
    });

    it('should fail auto-screening for candidate without mobile phone', async () => {
      // Arrange
      const candidate = {
        first_name: 'No',
        last_name: 'phone',
        email: 'nophone@example.com',
        resume_url: 'https://example.com/resume.pdf',
        status: 'new'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', candidate);

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(candidate.status).toBe('new');
    });

    it('should fail auto-screening for candidate without resume', async () => {
      // Arrange
      const candidate = {
        first_name: 'No',
        last_name: 'Resume',
        email: 'noresume@example.com',
        mobile_phone: '+8613812345678',
        status: 'new'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', candidate);

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(candidate.status).toBe('new');
    });

    it('should not auto-screen if status is not New', async () => {
      // Arrange
      const candidate = {
        first_name: 'Already',
        last_name: 'Reviewed',
        email: 'reviewed@example.com',
        mobile_phone: '+8613812345678',
        resume_url: 'https://example.com/resume.pdf',
        status: 'Interviewing'
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeInsert', candidate);

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(candidate.status).toBe('Interviewing'); // Should remain unchanged
    });
  });

  describe('beforeUpdate - Score Recalculation', () => {
    it('should recalculate score on update', async () => {
      // Arrange
      const candidate = {
        id: 'cand_123',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        years_of_experience: 10,
        highest_education: 'PhD',
        status: 'under_review',
        score: 50 // Old score
      };

      const previous = {
        id: 'cand_123',
        email: 'jane@example.com',
        years_of_experience: 5,
        highest_education: 'Bachelor',
        status: 'under_review',
        score: 50
      };

      mockQlFind.mockResolvedValue([]);

      const ctx = createMockContext('beforeUpdate', candidate, previous);

      // Act
      await CandidateScoringTrigger.handler(ctx);

      // Assert
      expect(candidate.score).toBeGreaterThan(previous.score);
    });
  });

  describe('Error Handling', () => {
    it('should not throw error if ql operations fail', async () => {
      // Arrange
      const candidate = {
        first_name: 'Test',
        last_name: 'Candidate',
        email: 'test@example.com',
        status: 'new'
      };

      mockQlFind.mockRejectedValue(new Error('Database error'));

      const ctx = createMockContext('beforeInsert', candidate);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(CandidateScoringTrigger.handler(ctx)).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in CandidateScoringTrigger'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Candidate Hook - CandidateStatusChangeTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('afterUpdate - Status Change Detection', () => {
    it('should not trigger if status has not changed', async () => {
      // Arrange
      const candidate = {
        id: 'cand_123',
        status: 'under_review'
      };

      const previous = {
        id: 'cand_123',
        status: 'under_review'
      };

      const ctx = createMockContext('afterUpdate', candidate, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await CandidateStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('status changed')
      );

      consoleLogSpy.mockRestore();
    });

    it('should log status change when status changes', async () => {
      // Arrange
      const candidate = {
        id: 'cand_123',
        first_name: 'Jane',
        last_name: 'Doe',
        status: 'Interviewing'
      };

      const previous = {
        id: 'cand_123',
        status: 'under_review'
      };

      const ctx = createMockContext('afterUpdate', candidate, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await CandidateStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Candidate status changed from "under_review" to "Interviewing"')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('afterUpdate - Interviewing Status', () => {
    it('should handle transition to Interviewing status', async () => {
      // Arrange
      const candidate = {
        id: 'cand_123',
        first_name: 'Jane',
        last_name: 'Doe',
        status: 'Interviewing'
      };

      const previous = {
        id: 'cand_123',
        status: 'under_review'
      };

      const ctx = createMockContext('afterUpdate', candidate, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await CandidateStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('moved to interviewing stage')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('afterUpdate - Hired Status', () => {
    it('should handle transition to Hired status', async () => {
      // Arrange
      const candidate = {
        id: 'cand_123',
        first_name: 'Jane',
        last_name: 'Doe',
        status: 'Hired'
      };

      const previous = {
        id: 'cand_123',
        status: 'Interviewing'
      };

      const ctx = createMockContext('afterUpdate', candidate, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await CandidateStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('has been hired')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('afterUpdate - Rejected Status', () => {
    it('should handle transition to Rejected status', async () => {
      // Arrange
      const candidate = {
        id: 'cand_123',
        first_name: 'John',
        last_name: 'Smith',
        status: 'Rejected'
      };

      const previous = {
        id: 'cand_123',
        status: 'Interviewing'
      };

      const ctx = createMockContext('afterUpdate', candidate, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await CandidateStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('has been rejected')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('afterUpdate - Withdrawn Status', () => {
    it('should handle transition to Withdrawn status', async () => {
      // Arrange
      const candidate = {
        id: 'cand_123',
        first_name: 'Jane',
        last_name: 'Doe',
        status: 'Withdrawn'
      };

      const previous = {
        id: 'cand_123',
        status: 'Interviewing'
      };

      const ctx = createMockContext('afterUpdate', candidate, previous);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();

      // Act
      await CandidateStatusChangeTrigger.handler(ctx);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('has withdrawn')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should not throw error if status change handling fails', async () => {
      // Arrange
      const candidate = {
        id: 'cand_123',
        first_name: undefined, // This will cause error in logging
        last_name: undefined,
        status: 'Hired'
      };

      const previous = {
        id: 'cand_123',
        status: 'Interviewing'
      };

      const ctx = createMockContext('afterUpdate', candidate, previous);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(CandidateStatusChangeTrigger.handler(ctx)).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });
});
